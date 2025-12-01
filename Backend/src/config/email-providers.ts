// Email Provider IMAP Configurations
// Pre-configured IMAP settings for popular email providers

export interface EmailProviderConfig {
  name: string;
  provider: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  authType: 'password' | 'oauth2';
  setupInstructions?: string;
}

export const EMAIL_PROVIDERS: Record<string, EmailProviderConfig> = {
  gmail: {
    name: 'Gmail',
    provider: 'gmail',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    authType: 'password',
    setupInstructions: 'Enable "Allow less secure apps" or use App Password from Google Account settings'
  },
  outlook: {
    name: 'Outlook/Hotmail',
    provider: 'outlook',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: true,
    authType: 'password',
    setupInstructions: 'Use your regular email password'
  },
  yahoo: {
    name: 'Yahoo Mail',
    provider: 'yahoo',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 465,
    smtpSecure: true,
    authType: 'password',
    setupInstructions: 'Generate an App Password from Yahoo Account Security settings'
  },
  icloud: {
    name: 'iCloud Mail',
    provider: 'icloud',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
    smtpSecure: true,
    authType: 'password',
    setupInstructions: 'Generate an App-Specific Password from Apple ID settings'
  },
  custom: {
    name: 'Custom IMAP',
    provider: 'custom',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    authType: 'password',
    setupInstructions: 'Enter your custom IMAP server settings'
  }
};

export function getProviderConfig(provider: string): EmailProviderConfig | null {
  return EMAIL_PROVIDERS[provider.toLowerCase()] || null;
}

export function getAllProviders(): EmailProviderConfig[] {
  return Object.values(EMAIL_PROVIDERS);
}
