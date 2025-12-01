import { logger } from '../config/logger';

/**
 * Parsed email sender information
 */
export interface ParsedSenderInfo {
  email: string;
  domain: string;
  isNoReply: boolean;
  isAutomated: boolean;
  knownService: string | null;
  companyName: string | null;
  senderType: 'service' | 'noreply' | 'personal' | 'business' | 'unknown';
}

/**
 * Known email services and their configurations
 */
const KNOWN_SERVICES: { [key: string]: { name: string; type: string; icon?: string; color?: string } } = {
  // Social Media
  'github.com': { name: 'GitHub', type: 'service', icon: 'code-branch', color: '#24292e' },
  'gitlab.com': { name: 'GitLab', type: 'service', icon: 'code-branch', color: '#FC6D26' },
  'linkedin.com': { name: 'LinkedIn', type: 'social', icon: 'briefcase', color: '#0A66C2' },
  'twitter.com': { name: 'Twitter', type: 'social', icon: 'bird', color: '#1DA1F2' },
  'x.com': { name: 'X (Twitter)', type: 'social', icon: 'bird', color: '#000000' },
  'facebook.com': { name: 'Facebook', type: 'social', icon: 'users', color: '#1877F2' },
  'instagram.com': { name: 'Instagram', type: 'social', icon: 'camera', color: '#E4405F' },
  'reddit.com': { name: 'Reddit', type: 'social', icon: 'comments', color: '#FF4500' },

  // Development & Tech
  'stackoverflow.com': { name: 'Stack Overflow', type: 'service', icon: 'question-circle', color: '#F48024' },
  'stackexchange.com': { name: 'Stack Exchange', type: 'service', icon: 'question-circle', color: '#1E5397' },
  'atlassian.com': { name: 'Atlassian', type: 'service', icon: 'tasks', color: '#0052CC' },
  'jira.com': { name: 'Jira', type: 'service', icon: 'tasks', color: '#0052CC' },
  'slack.com': { name: 'Slack', type: 'service', icon: 'comment-dots', color: '#4A154B' },
  'notion.so': { name: 'Notion', type: 'service', icon: 'file-alt', color: '#000000' },
  'trello.com': { name: 'Trello', type: 'service', icon: 'columns', color: '#0079BF' },
  'asana.com': { name: 'Asana', type: 'service', icon: 'check-circle', color: '#F06A6A' },

  // Cloud & Infrastructure
  'aws.amazon.com': { name: 'AWS', type: 'service', icon: 'cloud', color: '#FF9900' },
  'azure.microsoft.com': { name: 'Azure', type: 'service', icon: 'cloud', color: '#0078D4' },
  'cloud.google.com': { name: 'Google Cloud', type: 'service', icon: 'cloud', color: '#4285F4' },
  'heroku.com': { name: 'Heroku', type: 'service', icon: 'server', color: '#430098' },
  'digitalocean.com': { name: 'DigitalOcean', type: 'service', icon: 'water', color: '#0080FF' },

  // Email & Productivity
  'google.com': { name: 'Google', type: 'service', icon: 'globe', color: '#4285F4' },
  'gmail.com': { name: 'Gmail', type: 'personal', icon: 'envelope', color: '#EA4335' },
  'outlook.com': { name: 'Outlook', type: 'personal', icon: 'envelope', color: '#0078D4' },
  'microsoft.com': { name: 'Microsoft', type: 'service', icon: 'windows', color: '#0078D4' },
  'apple.com': { name: 'Apple', type: 'service', icon: 'apple-alt', color: '#000000' },
  'zoom.us': { name: 'Zoom', type: 'service', icon: 'video', color: '#2D8CFF' },

  // E-commerce & Shopping
  'amazon.com': { name: 'Amazon', type: 'ecommerce', icon: 'shopping-cart', color: '#FF9900' },
  'ebay.com': { name: 'eBay', type: 'ecommerce', icon: 'shopping-bag', color: '#E53238' },
  'shopify.com': { name: 'Shopify', type: 'ecommerce', icon: 'store', color: '#96BF48' },
  'etsy.com': { name: 'Etsy', type: 'ecommerce', icon: 'store-alt', color: '#F56400' },
  'paypal.com': { name: 'PayPal', type: 'financial', icon: 'credit-card', color: '#003087' },
  'stripe.com': { name: 'Stripe', type: 'financial', icon: 'credit-card', color: '#635BFF' },

  // Job & Recruitment
  'indeed.com': { name: 'Indeed', type: 'job', icon: 'briefcase', color: '#2164F3' },
  'glassdoor.com': { name: 'Glassdoor', type: 'job', icon: 'door-open', color: '#0CAA41' },
  'monster.com': { name: 'Monster', type: 'job', icon: 'user-tie', color: '#6E46AE' },
  'lever.co': { name: 'Lever', type: 'job', icon: 'users', color: '#4A4A4A' },
  'greenhouse.io': { name: 'Greenhouse', type: 'job', icon: 'seedling', color: '#00A878' },

  // Newsletter & Marketing
  'mailchimp.com': { name: 'Mailchimp', type: 'newsletter', icon: 'envelope', color: '#FFE01B' },
  'sendgrid.net': { name: 'SendGrid', type: 'newsletter', icon: 'paper-plane', color: '#1A82E2' },
  'substack.com': { name: 'Substack', type: 'newsletter', icon: 'newspaper', color: '#FF6719' },
  'medium.com': { name: 'Medium', type: 'newsletter', icon: 'medium', color: '#00AB6C' },

  // Travel & Transportation
  'booking.com': { name: 'Booking.com', type: 'travel', icon: 'bed', color: '#003580' },
  'airbnb.com': { name: 'Airbnb', type: 'travel', icon: 'home', color: '#FF5A5F' },
  'uber.com': { name: 'Uber', type: 'transportation', icon: 'car', color: '#000000' },
  'lyft.com': { name: 'Lyft', type: 'transportation', icon: 'car', color: '#FF00BF' },

  // Finance & Banking
  'bank.com': { name: 'Bank', type: 'financial', icon: 'university', color: '#003087' },
  'chase.com': { name: 'Chase', type: 'financial', icon: 'university', color: '#117ACA' },
  'wellsfargo.com': { name: 'Wells Fargo', type: 'financial', icon: 'university', color: '#D71E28' },
  'bankofamerica.com': { name: 'Bank of America', type: 'financial', icon: 'university', color: '#E31837' }
};

/**
 * Common no-reply patterns
 */
const NO_REPLY_PATTERNS = [
  'noreply',
  'no-reply',
  'no_reply',
  'donotreply',
  'do-not-reply',
  'do_not_reply',
  'notification',
  'notifications',
  'automated',
  'auto-reply',
  'bounce',
  'mailer-daemon',
  'postmaster'
];

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  try {
    const match = email.match(/@([^@]+)$/);
    return match ? match[1].toLowerCase() : '';
  } catch (error) {
    logger.error('Error extracting domain from email:', { email, error });
    return '';
  }
}

/**
 * Check if email is a no-reply or automated address
 */
export function isNoReplyEmail(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  return NO_REPLY_PATTERNS.some(pattern => lowerEmail.includes(pattern));
}

/**
 * Identify known service from domain
 */
export function identifyKnownService(domain: string): string | null {
  const lowerDomain = domain.toLowerCase();

  // Direct match
  if (KNOWN_SERVICES[lowerDomain]) {
    return KNOWN_SERVICES[lowerDomain].name;
  }

  // Subdomain match (e.g., mail.google.com -> google.com)
  for (const [serviceDomain, config] of Object.entries(KNOWN_SERVICES)) {
    if (lowerDomain.endsWith(serviceDomain)) {
      return config.name;
    }
  }

  return null;
}

/**
 * Get service configuration for a domain
 */
export function getServiceConfig(domain: string): { name: string; type: string; icon?: string; color?: string } | null {
  const lowerDomain = domain.toLowerCase();

  // Direct match
  if (KNOWN_SERVICES[lowerDomain]) {
    return KNOWN_SERVICES[lowerDomain];
  }

  // Subdomain match
  for (const [serviceDomain, config] of Object.entries(KNOWN_SERVICES)) {
    if (lowerDomain.endsWith(serviceDomain)) {
      return config;
    }
  }

  return null;
}

/**
 * Extract company name from domain
 */
export function extractCompanyName(domain: string): string | null {
  try {
    // Remove common TLDs and subdomains
    const parts = domain.toLowerCase().split('.');

    // Skip if it's a known service
    if (identifyKnownService(domain)) {
      return null;
    }

    // Get the main part (before the TLD)
    if (parts.length >= 2) {
      const companyPart = parts[parts.length - 2];

      // Capitalize first letter
      return companyPart.charAt(0).toUpperCase() + companyPart.slice(1);
    }

    return null;
  } catch (error) {
    logger.error('Error extracting company name from domain:', { domain, error });
    return null;
  }
}

/**
 * Determine sender type from email and domain
 */
export function determineSenderType(
  email: string,
  domain: string,
  isNoReply: boolean,
  knownService: string | null
): 'service' | 'noreply' | 'personal' | 'business' | 'unknown' {
  if (isNoReply) {
    return 'noreply';
  }

  if (knownService) {
    const config = getServiceConfig(domain);
    if (config) {
      if (config.type === 'service' || config.type === 'social' || config.type === 'newsletter') {
        return 'service';
      }
      if (config.type === 'personal') {
        return 'personal';
      }
    }
  }

  // Personal email domains
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com', 'aol.com'];
  if (personalDomains.includes(domain.toLowerCase())) {
    return 'personal';
  }

  // Business email (custom domain)
  if (domain && !domain.includes('gmail') && !domain.includes('yahoo')) {
    return 'business';
  }

  return 'unknown';
}

/**
 * Parse email sender information
 */
export function parseEmailSender(email: string): ParsedSenderInfo {
  const domain = extractDomain(email);
  const isNoReply = isNoReplyEmail(email);
  const knownService = identifyKnownService(domain);
  const companyName = extractCompanyName(domain);
  const senderType = determineSenderType(email, domain, isNoReply, knownService);

  return {
    email,
    domain,
    isNoReply,
    isAutomated: isNoReply,
    knownService,
    companyName,
    senderType
  };
}

/**
 * Format sender info for AI prompt
 */
export function formatSenderInfoForAI(senderInfo: ParsedSenderInfo): string {
  const parts: string[] = [];

  parts.push(`Domain: ${senderInfo.domain}`);

  if (senderInfo.knownService) {
    parts.push(`Known Service: ${senderInfo.knownService}`);
  }

  if (senderInfo.companyName) {
    parts.push(`Company: ${senderInfo.companyName}`);
  }

  parts.push(`Type: ${senderInfo.senderType}`);

  if (senderInfo.isNoReply) {
    parts.push('No-Reply/Automated: Yes');
  }

  return parts.join(' | ');
}

export default {
  parseEmailSender,
  extractDomain,
  isNoReplyEmail,
  identifyKnownService,
  getServiceConfig,
  extractCompanyName,
  determineSenderType,
  formatSenderInfoForAI
};
