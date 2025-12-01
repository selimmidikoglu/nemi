import { google } from 'googleapis';
import { logger } from '../config/logger';
import { pool } from '../config/database';

export interface PeopleConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

interface ProfilePhotoCache {
  [email: string]: string | null;
}

export class PeopleService {
  private people: any;
  private photoCache: ProfilePhotoCache = {};

  constructor(private config: PeopleConfig) {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken
    });

    this.people = google.people({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Get company logo URL from email domain using Clearbit Logo API
   * https://clearbit.com/logo
   */
  static getCompanyLogoUrl(email: string): string | null {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    // Skip common email providers - they're not company logos
    const genericProviders = [
      'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com',
      'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com',
      'aol.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com'
    ];

    if (genericProviders.includes(domain)) {
      return null;
    }

    // Clearbit Logo API - free, no API key needed
    return `https://logo.clearbit.com/${domain}`;
  }

  /**
   * Check if company logo exists
   */
  static async checkCompanyLogoExists(email: string): Promise<string | null> {
    const logoUrl = PeopleService.getCompanyLogoUrl(email);
    if (!logoUrl) return null;

    try {
      const response = await fetch(logoUrl, { method: 'HEAD' });
      if (response.ok) {
        return logoUrl;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get profile photo URL for an email address
   * Tries: 1) Google People API, 2) Company Logo (Clearbit)
   */
  async getProfilePhotoUrl(email: string): Promise<string | null> {
    // Check memory cache first
    if (email in this.photoCache) {
      return this.photoCache[email];
    }

    try {
      // First try Google People API
      const response = await this.people.otherContacts.search({
        query: email,
        readMask: 'photos,emailAddresses',
        pageSize: 1
      });

      const results = response.data.results || [];

      if (results.length > 0 && results[0].person?.photos?.length > 0) {
        const photo = results[0].person.photos[0];
        // Skip default/placeholder photos
        if (photo.url && !photo.default) {
          this.photoCache[email] = photo.url;
          logger.debug(`Found Google profile photo for ${email}`);
          return photo.url;
        }
      }
    } catch (error: any) {
      // Don't log 404s as errors - just means no contact found
      if (error.code !== 404) {
        logger.debug(`Could not fetch Google profile photo for ${email}: ${error.message}`);
      }
    }

    // Fallback to company logo (Clearbit)
    try {
      const logoUrl = await PeopleService.checkCompanyLogoExists(email);
      if (logoUrl) {
        this.photoCache[email] = logoUrl;
        logger.debug(`Found company logo for ${email}`);
        return logoUrl;
      }
    } catch (error: any) {
      logger.debug(`Could not check company logo for ${email}: ${error.message}`);
    }

    // No photo found from any source
    this.photoCache[email] = null;
    return null;
  }

  /**
   * Batch fetch profile photos for multiple emails
   * More efficient than fetching one at a time
   */
  async getProfilePhotosForEmails(emails: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    // Check cache first and filter out already cached
    const uncachedEmails: string[] = [];
    for (const email of emails) {
      if (email in this.photoCache) {
        results.set(email, this.photoCache[email]);
      } else {
        uncachedEmails.push(email);
      }
    }

    // Fetch uncached emails (in parallel, but limit concurrency)
    const batchSize = 5;
    for (let i = 0; i < uncachedEmails.length; i += batchSize) {
      const batch = uncachedEmails.slice(i, i + batchSize);
      const promises = batch.map(email => this.getProfilePhotoUrl(email));
      const photos = await Promise.all(promises);

      batch.forEach((email, index) => {
        results.set(email, photos[index]);
      });
    }

    return results;
  }

  /**
   * Save profile photo URL to database for caching
   */
  static async saveProfilePhotoToDb(email: string, photoUrl: string | null): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO sender_profiles (email_address, profile_photo_url, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (email_address) DO UPDATE SET
           profile_photo_url = EXCLUDED.profile_photo_url,
           updated_at = NOW()`,
        [email.toLowerCase(), photoUrl]
      );
    } catch (error: any) {
      logger.debug(`Failed to save profile photo for ${email}: ${error.message}`);
    }
  }

  /**
   * Get profile photo from database cache
   */
  static async getProfilePhotoFromDb(email: string): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT profile_photo_url FROM sender_profiles
         WHERE email_address = $1
         AND updated_at > NOW() - INTERVAL '7 days'`,
        [email.toLowerCase()]
      );

      if (result.rows.length > 0) {
        return result.rows[0].profile_photo_url;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get profile photos for emails, checking DB cache first
   */
  async getProfilePhotosWithCache(emails: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    const needsFetch: string[] = [];

    // Check DB cache first
    for (const email of emails) {
      const cached = await PeopleService.getProfilePhotoFromDb(email);
      if (cached !== null) {
        results.set(email, cached);
      } else {
        needsFetch.push(email);
      }
    }

    // Fetch from API for uncached
    if (needsFetch.length > 0) {
      const fetched = await this.getProfilePhotosForEmails(needsFetch);

      // Save to DB and add to results
      for (const [email, photoUrl] of fetched) {
        results.set(email, photoUrl);
        await PeopleService.saveProfilePhotoToDb(email, photoUrl);
      }
    }

    return results;
  }
}
