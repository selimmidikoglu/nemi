import { google } from 'googleapis';
import { logger } from '../config/logger';

export interface GmailConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export class GmailService {
  private gmail: any;

  constructor(private config: GmailConfig) {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Mark email as read on Gmail
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      logger.info(`Marked Gmail message ${messageId} as read`);
    } catch (error: any) {
      logger.error(`Failed to mark Gmail message ${messageId} as read:`, error.message);
      throw error;
    }
  }

  /**
   * Mark email as unread on Gmail
   */
  async markAsUnread(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD']
        }
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Move email to trash on Gmail
   */
  async trashEmail(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.trash({
        userId: 'me',
        id: messageId
      });

      logger.info(`Moved Gmail message ${messageId} to trash`);
    } catch (error: any) {
      logger.error(`Failed to trash Gmail message ${messageId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch recent emails from Gmail
   */
  async fetchRecentEmails(maxResults: number = 200): Promise<any[]> {
    try {
      // Fetch all emails except drafts and spam, not just INBOX
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: '-in:drafts -in:spam'
      });


      const messages = response.data.messages || [];
      const emails: any[] = [];

      for (const message of messages) {
        const email = await this.getEmailDetails(message.id);
        emails.push(email);
      }

      return emails;
    } catch (error: any) {
      logger.error('Failed to fetch Gmail emails:', error.message);
      throw error;
    }
  }

  /**
   * Get detailed email information
   */
  private async getEmailDetails(messageId: string): Promise<any> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;

      const getHeader = (name: string) => {
        const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };

      const isRead = !message.labelIds?.includes('UNREAD');

      const { textBody, htmlBody, inlineImages } = this.extractBodyWithImages(message.payload);

      // Replace cid: references with inline base64 data URLs
      let processedHtmlBody = htmlBody;
      if (htmlBody && inlineImages.size > 0) {
        for (const [cid, dataUrl] of inlineImages) {
          // Replace both cid:xxx and cid:xxx formats
          processedHtmlBody = processedHtmlBody.replace(
            new RegExp(`(src=["']?)cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["']?)`, 'gi'),
            `$1${dataUrl}$2`
          );
        }
      }

      return {
        messageId: message.id,
        threadId: message.threadId, // Gmail's native thread ID for accurate conversation grouping
        from: this.parseEmailAddress(getHeader('From')),
        to: [this.parseEmailAddress(getHeader('To'))],
        subject: getHeader('Subject'),
        body: textBody,
        textBody,
        htmlBody: processedHtmlBody,
        date: new Date(parseInt(message.internalDate)),
        isRead,
        hasAttachments: message.payload.parts?.some((part: any) => part.filename && !part.headers?.find((h: any) => h.name === 'Content-ID')) || false,
        uid: message.id,
        providerType: 'gmail'
      };
    } catch (error: any) {
      logger.error(`Failed to get Gmail message ${messageId}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse email address from header
   */
  private parseEmailAddress(emailString: string): { email: string; name: string } {
    const match = emailString.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    if (match) {
      return {
        name: match[1] || '',
        email: match[2] || emailString
      };
    }
    return { email: emailString, name: '' };
  }

  /**
   * Extract email body from Gmail payload (both text and HTML) with inline images
   */
  private extractBodyWithImages(payload: any): { textBody: string; htmlBody: string; inlineImages: Map<string, string> } {
    let textBody = '';
    let htmlBody = '';
    const inlineImages = new Map<string, string>();

    // Helper function to recursively extract body parts and inline images
    const extractFromParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data && !textBody) {
          textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data && !htmlBody) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType?.startsWith('image/') && part.body?.data) {
          // Extract inline image with Content-ID
          const contentIdHeader = part.headers?.find((h: any) => h.name.toLowerCase() === 'content-id');
          if (contentIdHeader) {
            // Content-ID is usually in format <cid> - remove angle brackets
            const cid = contentIdHeader.value.replace(/^<|>$/g, '');
            const base64Data = part.body.data;
            const dataUrl = `data:${part.mimeType};base64,${base64Data}`;
            inlineImages.set(cid, dataUrl);
          }
        } else if (part.parts) {
          // Recursively handle nested parts (multipart/alternative, etc.)
          extractFromParts(part.parts);
        }
      }
    };

    if (payload.body && payload.body.data) {
      // Simple message with body directly in payload
      const content = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.mimeType === 'text/html') {
        htmlBody = content;
      } else {
        textBody = content;
      }
    } else if (payload.parts) {
      extractFromParts(payload.parts);
    }

    return { textBody, htmlBody, inlineImages };
  }

  /**
   * Extract email body from Gmail payload (both text and HTML)
   * @deprecated Use extractBodyWithImages instead
   */
  private extractBody(payload: any): { textBody: string; htmlBody: string } {
    const { textBody, htmlBody } = this.extractBodyWithImages(payload);
    return { textBody, htmlBody };
  }

  /**
   * Fetch specific emails by their IDs (for push notification handling)
   */
  async fetchEmailsByIds(messageIds: string[]): Promise<any[]> {
    const emails: any[] = [];

    for (const messageId of messageIds) {
      try {
        const email = await this.getEmailDetails(messageId);
        emails.push(email);
      } catch (error: any) {
        logger.error(`Failed to fetch email ${messageId}:`, error.message);
        // Continue with other emails even if one fails
      }
    }

    return emails;
  }

  /**
   * Test Gmail connection
   */
  static async testConnection(config: GmailConfig): Promise<boolean> {
    try {
      const service = new GmailService(config);
      await service.gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      logger.error('Gmail test connection failed:', error);
      return false;
    }
  }
}
