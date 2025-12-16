import { pool } from '../config/database';
import { logger } from '../config/logger';

/**
 * Logo Service - Fetches and caches company logos from domains
 * Uses Logo.dev API (Clearbit replacement) with local caching
 * Note: Clearbit Logo API was deprecated on December 8, 2025
 */

// Logo.dev API token (public key - safe for client-side)
const LOGO_DEV_TOKEN = 'pk_dpdQWVWOSH-axCl5dxFPMw';

// Generic email providers that shouldn't show company logos
const GENERIC_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
  'gmx.com',
  'gmx.net',
  'web.de',
  'mail.ru',
  'inbox.com',
  'fastmail.com'
]);

// Known service domains with their proper company names
const KNOWN_DOMAINS: Record<string, string> = {
  // Social Media
  'facebookmail.com': 'Facebook',
  'facebook.com': 'Facebook',
  'redditmail.com': 'Reddit',
  'reddit.com': 'Reddit',
  'meta.com': 'Meta',
  'instagram.com': 'Instagram',
  'twitter.com': 'Twitter',
  'x.com': 'X',
  'linkedin.com': 'LinkedIn',
  'linkedinmail.com': 'LinkedIn',
  'pinterest.com': 'Pinterest',
  'tiktok.com': 'TikTok',
  'snapchat.com': 'Snapchat',

  // Tech & Development
  'github.com': 'GitHub',
  'gitlab.com': 'GitLab',
  'bitbucket.org': 'Bitbucket',
  'slack.com': 'Slack',
  'slackbot.com': 'Slack',
  'notion.so': 'Notion',
  'trello.com': 'Trello',
  'asana.com': 'Asana',
  'atlassian.com': 'Atlassian',
  'atlassian.net': 'Atlassian',
  'jira.com': 'Jira',
  'confluence.com': 'Confluence',
  'stackoverflow.com': 'Stack Overflow',
  'vercel.com': 'Vercel',
  'netlify.com': 'Netlify',
  'heroku.com': 'Heroku',
  'digitalocean.com': 'DigitalOcean',
  'cloudflare.com': 'Cloudflare',

  // E-commerce
  'amazon.com': 'Amazon',
  'amazon.de': 'Amazon',
  'amazon.co.uk': 'Amazon',
  'amazonses.com': 'Amazon',
  'ebay.com': 'eBay',
  'etsy.com': 'Etsy',
  'shopify.com': 'Shopify',
  'aliexpress.com': 'AliExpress',
  'alibaba.com': 'Alibaba',
  'trendyol.com': 'Trendyol',
  'hepsiburada.com': 'Hepsiburada',
  'n11.com': 'N11',

  // Travel
  'booking.com': 'Booking.com',
  'airbnb.com': 'Airbnb',
  'expedia.com': 'Expedia',
  'trivago.com': 'Trivago',
  'tripadvisor.com': 'TripAdvisor',
  'kayak.com': 'Kayak',
  'skyscanner.com': 'Skyscanner',
  'turkishairlines.com': 'Turkish Airlines',
  'thy.com': 'Turkish Airlines',

  // Finance
  'paypal.com': 'PayPal',
  'stripe.com': 'Stripe',
  'revolut.com': 'Revolut',
  'wise.com': 'Wise',
  'transferwise.com': 'Wise',
  'chase.com': 'Chase',
  'bankofamerica.com': 'Bank of America',
  'wellsfargo.com': 'Wells Fargo',
  'citibank.com': 'Citibank',

  // Newsletters & Marketing
  'substack.com': 'Substack',
  'mailchimp.com': 'Mailchimp',
  'sendgrid.net': 'SendGrid',
  'sendgrid.com': 'SendGrid',
  'constantcontact.com': 'Constant Contact',
  'hubspot.com': 'HubSpot',
  'medium.com': 'Medium',

  // Food & Delivery
  'uber.com': 'Uber',
  'ubereats.com': 'Uber Eats',
  'doordash.com': 'DoorDash',
  'grubhub.com': 'Grubhub',
  'deliveroo.com': 'Deliveroo',
  'getir.com': 'Getir',
  'yemeksepeti.com': 'Yemeksepeti',

  // Streaming & Entertainment
  'netflix.com': 'Netflix',
  'spotify.com': 'Spotify',
  'apple.com': 'Apple',
  'disneyplus.com': 'Disney+',
  'hbomax.com': 'HBO Max',
  'primevideo.com': 'Prime Video',
  'youtube.com': 'YouTube',
  'twitch.tv': 'Twitch',

  // Cloud Services
  'google.com': 'Google',
  'microsoft.com': 'Microsoft',
  'office365.com': 'Microsoft 365',
  'dropbox.com': 'Dropbox',
  'box.com': 'Box',
  'zoom.us': 'Zoom',
  'zoom.com': 'Zoom',

  // Job Sites
  'indeed.com': 'Indeed',
  'glassdoor.com': 'Glassdoor',
  'monster.com': 'Monster',
  'jobleads.com': 'JobLeads',
  'kariyer.net': 'Kariyer.net',

  // Misc
  'change.org': 'Change.org',
  'hopi.com.tr': 'Hopi',
  'migros.com.tr': 'Migros',
  'samsung.com': 'Samsung',
  'huawei.com': 'Huawei'
};

// Cache TTL in milliseconds (7 days)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export class LogoService {
  /**
   * Extract the main domain from an email address
   * e.g., "news@facebookmail.com" -> "facebookmail.com"
   */
  static extractDomain(email: string): string | null {
    try {
      const match = email.toLowerCase().match(/@([^@]+)$/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract the root domain (for logo API)
   * e.g., "mail.google.com" -> "google.com"
   * e.g., "facebookmail.com" -> "facebook.com" (special case)
   */
  static extractRootDomain(domain: string): string {
    // Handle special cases first
    if (domain === 'facebookmail.com') return 'facebook.com';
    if (domain === 'linkedinmail.com') return 'linkedin.com';
    if (domain === 'googlemail.com') return 'google.com';
    if (domain === 'redditmail.com') return 'reddit.com';
    if (domain.endsWith('.amazonses.com')) return 'amazon.com';

    const parts = domain.split('.');
    if (parts.length > 2) {
      // Handle country TLDs like co.uk, com.tr
      const lastTwo = parts.slice(-2).join('.');
      if (['co.uk', 'com.tr', 'com.br', 'co.jp', 'com.au'].includes(lastTwo)) {
        return parts.slice(-3).join('.');
      }
      return parts.slice(-2).join('.');
    }
    return domain;
  }

  /**
   * Check if this is a generic email provider (no company logo)
   */
  static isGenericProvider(domain: string): boolean {
    return GENERIC_PROVIDERS.has(domain.toLowerCase());
  }

  /**
   * Get company name from domain (from known list or extracted)
   */
  static getCompanyName(domain: string): string | null {
    const lowerDomain = domain.toLowerCase();

    // Check known domains first
    if (KNOWN_DOMAINS[lowerDomain]) {
      return KNOWN_DOMAINS[lowerDomain];
    }

    // Check root domain
    const rootDomain = this.extractRootDomain(lowerDomain);
    if (KNOWN_DOMAINS[rootDomain]) {
      return KNOWN_DOMAINS[rootDomain];
    }

    // Extract company name from domain (capitalize first letter)
    const parts = rootDomain.split('.');
    if (parts.length >= 2) {
      const companyPart = parts[0];
      return companyPart.charAt(0).toUpperCase() + companyPart.slice(1);
    }

    return null;
  }

  /**
   * Get logo URL for a domain using Logo.dev API
   * Returns high-quality company logo
   */
  static getLogoUrl(domain: string): string {
    const rootDomain = this.extractRootDomain(domain);
    return `https://img.logo.dev/${rootDomain}?token=${LOGO_DEV_TOKEN}`;
  }

  /**
   * Get logo info from cache or generate new
   */
  static async getLogoForDomain(domain: string): Promise<{
    companyName: string | null;
    logoUrl: string | null;
  }> {
    if (!domain || this.isGenericProvider(domain)) {
      return { companyName: null, logoUrl: null };
    }

    const lowerDomain = domain.toLowerCase();

    try {
      // Check cache first
      const cached = await pool.query(
        `SELECT company_name, logo_url, logo_valid, last_checked_at
         FROM domain_logo_cache
         WHERE domain = $1`,
        [lowerDomain]
      );

      if (cached.rows.length > 0) {
        const row = cached.rows[0];
        const cacheAge = Date.now() - new Date(row.last_checked_at).getTime();

        // Return cached if valid and not expired
        if (row.logo_valid && cacheAge < CACHE_TTL) {
          return {
            companyName: row.company_name,
            logoUrl: row.logo_url
          };
        }

        // Return null if we know logo is invalid
        if (!row.logo_valid && cacheAge < CACHE_TTL) {
          return {
            companyName: row.company_name,
            logoUrl: null
          };
        }
      }

      // Generate logo URL
      const companyName = this.getCompanyName(lowerDomain);
      const logoUrl = this.getLogoUrl(lowerDomain);

      // Save to cache (we'll validate on first load)
      await pool.query(
        `INSERT INTO domain_logo_cache (domain, company_name, logo_url, logo_valid, last_checked_at)
         VALUES ($1, $2, $3, true, NOW())
         ON CONFLICT (domain) DO UPDATE SET
           company_name = COALESCE($2, domain_logo_cache.company_name),
           logo_url = $3,
           last_checked_at = NOW()`,
        [lowerDomain, companyName, logoUrl]
      );

      return { companyName, logoUrl };
    } catch (error) {
      logger.error('Error getting logo for domain:', { domain, error });

      // Fallback: return generated values without caching
      return {
        companyName: this.getCompanyName(lowerDomain),
        logoUrl: this.getLogoUrl(lowerDomain)
      };
    }
  }

  /**
   * Mark a logo as invalid (called when image fails to load on frontend)
   */
  static async markLogoInvalid(domain: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE domain_logo_cache
         SET logo_valid = false, last_checked_at = NOW()
         WHERE domain = $1`,
        [domain.toLowerCase()]
      );
    } catch (error) {
      logger.error('Error marking logo invalid:', { domain, error });
    }
  }

  /**
   * Get logo info from email address
   */
  static async getLogoForEmail(email: string): Promise<{
    companyName: string | null;
    companyDomain: string | null;
    logoUrl: string | null;
  }> {
    const domain = this.extractDomain(email);
    if (!domain) {
      return { companyName: null, companyDomain: null, logoUrl: null };
    }

    const { companyName, logoUrl } = await this.getLogoForDomain(domain);
    return {
      companyName,
      companyDomain: domain,
      logoUrl
    };
  }

  /**
   * Bulk get logos for multiple emails (efficient batch query)
   */
  static async getLogosForEmails(emails: string[]): Promise<Map<string, {
    companyName: string | null;
    logoUrl: string | null;
  }>> {
    const results = new Map();

    const domains = [...new Set(emails
      .map(e => this.extractDomain(e))
      .filter(d => d && !this.isGenericProvider(d!))
    )] as string[];

    if (domains.length === 0) {
      return results;
    }

    try {
      // Bulk query cache
      const cached = await pool.query(
        `SELECT domain, company_name, logo_url, logo_valid
         FROM domain_logo_cache
         WHERE domain = ANY($1)`,
        [domains]
      );

      const cachedDomains = new Set(cached.rows.map(r => r.domain));

      // For cached domains
      for (const row of cached.rows) {
        results.set(row.domain, {
          companyName: row.company_name,
          logoUrl: row.logo_valid ? row.logo_url : null
        });
      }

      // Generate for uncached domains
      const uncached = domains.filter(d => !cachedDomains.has(d));
      for (const domain of uncached) {
        const companyName = this.getCompanyName(domain);
        const logoUrl = this.getLogoUrl(domain);
        results.set(domain, { companyName, logoUrl });

        // Cache in background (don't await)
        pool.query(
          `INSERT INTO domain_logo_cache (domain, company_name, logo_url)
           VALUES ($1, $2, $3)
           ON CONFLICT (domain) DO NOTHING`,
          [domain, companyName, logoUrl]
        ).catch(e => logger.error('Error caching logo:', e));
      }

    } catch (error) {
      logger.error('Error bulk getting logos:', error);

      // Fallback: generate without caching
      for (const domain of domains) {
        results.set(domain, {
          companyName: this.getCompanyName(domain),
          logoUrl: this.getLogoUrl(domain)
        });
      }
    }

    return results;
  }
}

export default LogoService;
