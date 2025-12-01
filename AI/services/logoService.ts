import { logger } from '../../Backend/src/config/logger';

/**
 * Service for fetching company logos from logo.dev API
 */
export class LogoService {
  private apiKey: string;
  private baseUrl: string = 'https://img.logo.dev';

  constructor() {
    this.apiKey = process.env.LOGODEV_API_KEY || 'pk_dpdQWVWOSH-axCl5dxFPMw';
  }

  /**
   * Get logo URL for a company domain
   * @param domain - Company domain (e.g., "github.com", "stripe.com")
   * @param size - Logo size in pixels (default: 100)
   * @returns Logo URL or null if not available
   */
  getLogoUrl(domain: string | null, size: number = 100): string | null {
    if (!domain) {
      return null;
    }

    // Clean the domain (remove any protocol, paths, etc.)
    const cleanDomain = this.cleanDomain(domain);

    if (!cleanDomain) {
      return null;
    }

    // logo.dev API format: https://img.logo.dev/{domain}?token={api_key}&size={size}
    return `${this.baseUrl}/${cleanDomain}?token=${this.apiKey}&size=${size}`;
  }

  /**
   * Clean domain string to extract just the domain name
   */
  private cleanDomain(domain: string): string | null {
    try {
      // Remove protocol if present
      let cleaned = domain.replace(/^https?:\/\//, '');

      // Remove www. prefix
      cleaned = cleaned.replace(/^www\./, '');

      // Remove any paths or query strings
      cleaned = cleaned.split('/')[0].split('?')[0];

      // Remove port numbers
      cleaned = cleaned.split(':')[0];

      // Validate it looks like a domain
      if (cleaned && cleaned.includes('.')) {
        return cleaned;
      }

      return null;
    } catch (error) {
      logger.error('Error cleaning domain:', error);
      return null;
    }
  }

  /**
   * Extract domain from email address
   */
  extractDomainFromEmail(email: string): string | null {
    try {
      const match = email.match(/@(.+)$/);
      return match ? match[1] : null;
    } catch (error) {
      logger.error('Error extracting domain from email:', error);
      return null;
    }
  }

  /**
   * Check if a domain is a generic email provider (not company-specific)
   */
  isGenericProvider(domain: string): boolean {
    const genericProviders = [
      'gmail.com',
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
      'mac.com'
    ];

    return genericProviders.includes(domain.toLowerCase());
  }

  /**
   * Get logo URL from email address
   * Returns null for generic providers unless forceShow is true
   */
  getLogoFromEmail(email: string, forceShow: boolean = false, size: number = 100): string | null {
    const domain = this.extractDomainFromEmail(email);

    if (!domain) {
      return null;
    }

    // Skip generic email providers unless forced
    if (!forceShow && this.isGenericProvider(domain)) {
      return null;
    }

    return this.getLogoUrl(domain, size);
  }
}

export const logoService = new LogoService();
