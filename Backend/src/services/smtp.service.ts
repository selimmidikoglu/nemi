import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { logger } from '../config/logger';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  from: EmailRecipient;
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  replyTo?: EmailRecipient[];
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: string; // Message-ID of the email being replied to
  references?: string[]; // Array of Message-IDs for threading
}

export class SmtpService {
  private transporter: Mail | null = null;

  constructor(private config: SmtpConfig) {}

  /**
   * Connect to SMTP server
   */
  async connect(): Promise<void> {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      });

      // Verify connection
      await this.transporter.verify();
      logger.info(`SMTP connected: ${this.config.auth.user}@${this.config.host}`);
    } catch (error) {
      logger.error('SMTP connection error:', error);
      throw new Error(`Failed to connect to SMTP server: ${error}`);
    }
  }

  /**
   * Disconnect from SMTP server
   */
  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      logger.info('SMTP connection closed');
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: SendEmailOptions): Promise<{ messageId: string }> {
    if (!this.transporter) {
      throw new Error('SMTP not connected');
    }

    try {
      // Format recipients
      const formatRecipient = (recipient: EmailRecipient) => {
        return recipient.name
          ? `"${recipient.name}" <${recipient.email}>`
          : recipient.email;
      };

      const formatRecipients = (recipients: EmailRecipient[]) => {
        return recipients.map(formatRecipient).join(', ');
      };

      // Build email options
      const mailOptions: Mail.Options = {
        from: formatRecipient(options.from),
        to: formatRecipients(options.to),
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      // Add optional fields
      if (options.cc && options.cc.length > 0) {
        mailOptions.cc = formatRecipients(options.cc);
      }

      if (options.bcc && options.bcc.length > 0) {
        mailOptions.bcc = formatRecipients(options.bcc);
      }

      if (options.replyTo && options.replyTo.length > 0) {
        mailOptions.replyTo = formatRecipients(options.replyTo);
      }

      // Add threading headers for replies
      if (options.inReplyTo) {
        mailOptions.inReplyTo = options.inReplyTo;
      }

      if (options.references && options.references.length > 0) {
        mailOptions.references = options.references.join(' ');
      }

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent: ${info.messageId}`);
      logger.info(`From: ${options.from.email}`);
      logger.info(`To: ${options.to.map(r => r.email).join(', ')}`);
      logger.info(`Subject: ${options.subject}`);

      return { messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  /**
   * Test SMTP connection
   */
  static async testConnection(config: SmtpConfig): Promise<boolean> {
    const service = new SmtpService(config);
    try {
      await service.connect();
      await service.disconnect();
      return true;
    } catch (error) {
      logger.error('SMTP test connection failed:', error);
      return false;
    }
  }

  /**
   * Get SMTP config from email provider
   */
  static getSmtpConfig(provider: 'gmail' | 'outlook' | 'imap', email: string, password: string, customHost?: string): SmtpConfig {
    switch (provider) {
      case 'gmail':
        return {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // Use STARTTLS
          auth: { user: email, pass: password }
        };

      case 'outlook':
        return {
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false, // Use STARTTLS
          auth: { user: email, pass: password }
        };

      case 'imap':
        // For custom IMAP providers, try to infer SMTP host
        const domain = email.split('@')[1];
        const smtpHost = customHost || `smtp.${domain}`;
        return {
          host: smtpHost,
          port: 587,
          secure: false,
          auth: { user: email, pass: password }
        };

      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }
}
