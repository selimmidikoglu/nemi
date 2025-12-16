import { google } from 'googleapis';
import { query } from '../config/database';
import { logger } from '../config/logger';

export interface Contact {
  email: string;
  name?: string;
  photoUrl?: string;
  frequency: number; // How many times this contact appears
  lastUsed: Date;
  source?: 'google' | 'email';
}

export class ContactsService {
  /**
   * Fetch contacts from Google People API
   */
  async fetchGoogleContacts(accessToken: string, refreshToken: string): Promise<Contact[]> {
    const contacts: Contact[] = [];

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const people = google.people({ version: 'v1', auth: oauth2Client });

      let nextPageToken: string | undefined;
      do {
        const response = await people.people.connections.list({
          resourceName: 'people/me',
          pageSize: 1000,
          personFields: 'names,emailAddresses,photos',
          pageToken: nextPageToken
        });

        const connections = response.data.connections || [];

        for (const person of connections) {
          const emails = person.emailAddresses || [];
          const names = person.names || [];
          const photos = person.photos || [];

          for (const emailObj of emails) {
            if (emailObj.value) {
              contacts.push({
                email: emailObj.value.toLowerCase(),
                name: names[0]?.displayName || undefined,
                photoUrl: photos[0]?.url || undefined,
                frequency: 0,
                lastUsed: new Date(),
                source: 'google'
              });
            }
          }
        }

        nextPageToken = response.data.nextPageToken || undefined;
      } while (nextPageToken);

      logger.info(`Fetched ${contacts.length} contacts from Google People API`);
      return contacts;

    } catch (error: any) {
      logger.error('Error fetching Google contacts:', error);
      if (error.code === 403) {
        logger.warn('Contacts API access not granted, skipping Google contacts');
        return [];
      }
      return [];
    }
  }

  /**
   * Get combined contacts from Google + email history
   */
  async getCombinedContacts(
    userId: string,
    _emailAccountId: string,
    accessToken: string,
    refreshToken: string,
    searchQuery?: string,
    limit: number = 10
  ): Promise<Contact[]> {
    try {
      // Fetch from both sources in parallel
      const [googleContacts, emailContacts] = await Promise.all([
        this.fetchGoogleContacts(accessToken, refreshToken),
        this.getContactsForAutocomplete(userId, searchQuery, 100)
      ]);

      // Merge - Google contacts take priority for name/photo
      const contactMap = new Map<string, Contact>();

      // Add email history contacts first
      for (const contact of emailContacts) {
        contactMap.set(contact.email.toLowerCase(), { ...contact, source: 'email' });
      }

      // Override/merge with Google contacts
      for (const contact of googleContacts) {
        const existing = contactMap.get(contact.email);
        if (existing) {
          contactMap.set(contact.email, {
            ...existing,
            name: contact.name || existing.name,
            photoUrl: contact.photoUrl || existing.photoUrl,
            source: 'google'
          });
        } else {
          contactMap.set(contact.email, contact);
        }
      }

      let results = Array.from(contactMap.values());

      // Filter by search query if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        results = results.filter(c =>
          c.email.toLowerCase().includes(query) ||
          (c.name && c.name.toLowerCase().includes(query))
        );
      }

      // Sort by frequency then name
      results.sort((a, b) => {
        if (b.frequency !== a.frequency) return b.frequency - a.frequency;
        if (a.name && b.name) return a.name.localeCompare(b.name);
        if (a.name) return -1;
        if (b.name) return 1;
        return a.email.localeCompare(b.email);
      });

      return results.slice(0, limit);

    } catch (error) {
      logger.error('Error getting combined contacts:', error);
      // Fallback to email history only
      return this.getContactsForAutocomplete(userId, searchQuery, limit);
    }
  }

  /**
   * Get contacts for autocomplete from emails the user has sent/received
   * Extracts from: from_email, to_emails, cc_emails fields
   */
  async getContactsForAutocomplete(
    userId: string,
    searchQuery?: string,
    limit: number = 10
  ): Promise<Contact[]> {
    try {
      // Build a query that extracts unique emails from various fields
      // and ranks them by frequency of use
      // Note: to_emails and cc_emails can contain either plain strings or JSON objects like {"name": "...", "email": "..."}
      let sql = `
        WITH all_contacts AS (
          -- From emails received (senders)
          SELECT
            from_email as email,
            from_name as name,
            date as last_used
          FROM emails
          WHERE user_id = $1 AND from_email IS NOT NULL

          UNION ALL

          -- From to_emails array (handle both plain strings and JSON objects)
          SELECT
            CASE
              WHEN jsonb_typeof(elem) = 'object' THEN elem->>'email'
              ELSE elem #>> '{}'
            END as email,
            CASE
              WHEN jsonb_typeof(elem) = 'object' THEN NULLIF(elem->>'name', '')
              ELSE NULL
            END as name,
            date as last_used
          FROM emails, jsonb_array_elements(to_emails) as elem
          WHERE user_id = $1 AND to_emails IS NOT NULL AND jsonb_array_length(to_emails) > 0

          UNION ALL

          -- From cc_emails array (handle both plain strings and JSON objects)
          SELECT
            CASE
              WHEN jsonb_typeof(elem) = 'object' THEN elem->>'email'
              ELSE elem #>> '{}'
            END as email,
            CASE
              WHEN jsonb_typeof(elem) = 'object' THEN NULLIF(elem->>'name', '')
              ELSE NULL
            END as name,
            date as last_used
          FROM emails, jsonb_array_elements(cc_emails) as elem
          WHERE user_id = $1 AND cc_emails IS NOT NULL AND jsonb_array_length(cc_emails) > 0
        ),
        contact_stats AS (
          SELECT
            LOWER(TRIM(email)) as email,
            MAX(name) as name,
            COUNT(*) as frequency,
            MAX(last_used) as last_used
          FROM all_contacts
          WHERE email IS NOT NULL
            AND email != ''
            AND email LIKE '%@%'
          GROUP BY LOWER(TRIM(email))
        )
        SELECT email, name, frequency, last_used
        FROM contact_stats
      `;

      const params: any[] = [userId];

      // Add search filter if provided
      if (searchQuery && searchQuery.length > 0) {
        sql += ` WHERE email ILIKE $2 OR name ILIKE $2`;
        params.push(`%${searchQuery}%`);
      }

      // Order by frequency (most used first), then recency
      sql += ` ORDER BY frequency DESC, last_used DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await query(sql, params);

      return result.rows.map((row: any) => ({
        email: row.email,
        name: row.name || undefined,
        frequency: parseInt(row.frequency, 10),
        lastUsed: new Date(row.last_used)
      }));
    } catch (error) {
      logger.error('Failed to get contacts for autocomplete:', error);
      return [];
    }
  }

  /**
   * Get recently used contacts (for showing initial suggestions)
   */
  async getRecentContacts(userId: string, limit: number = 5): Promise<Contact[]> {
    try {
      // Simplified query using the same logic as getContactsForAutocomplete
      const sql = `
        WITH all_contacts AS (
          -- From emails received (senders)
          SELECT
            from_email as email,
            from_name as name,
            date as last_used
          FROM emails
          WHERE user_id = $1 AND from_email IS NOT NULL

          UNION ALL

          -- From to_emails array (handle both plain strings and JSON objects)
          SELECT
            CASE
              WHEN jsonb_typeof(elem) = 'object' THEN elem->>'email'
              ELSE elem #>> '{}'
            END as email,
            CASE
              WHEN jsonb_typeof(elem) = 'object' THEN NULLIF(elem->>'name', '')
              ELSE NULL
            END as name,
            date as last_used
          FROM emails, jsonb_array_elements(to_emails) as elem
          WHERE user_id = $1 AND to_emails IS NOT NULL AND jsonb_array_length(to_emails) > 0
        ),
        recent_contacts AS (
          SELECT DISTINCT ON (LOWER(TRIM(email)))
            LOWER(TRIM(email)) as email,
            name,
            last_used
          FROM all_contacts
          WHERE email IS NOT NULL
            AND email != ''
            AND email LIKE '%@%'
          ORDER BY LOWER(TRIM(email)), last_used DESC
        )
        SELECT email, name, 1 as frequency, last_used
        FROM recent_contacts
        ORDER BY last_used DESC
        LIMIT $2
      `;

      const result = await query(sql, [userId, limit]);

      return result.rows.map((row: any) => ({
        email: row.email,
        name: row.name || undefined,
        frequency: 1,
        lastUsed: new Date(row.last_used)
      }));
    } catch (error) {
      logger.error('Failed to get recent contacts:', error);
      return [];
    }
  }

  /**
   * Get frequently contacted emails (for "suggested" section)
   */
  async getFrequentContacts(userId: string, limit: number = 10): Promise<Contact[]> {
    return this.getContactsForAutocomplete(userId, undefined, limit);
  }
}

export const contactsService = new ContactsService();
