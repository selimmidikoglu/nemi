import { google } from 'googleapis';
import { logger } from '../config/logger';
import { query } from '../config/database';

export interface GmailConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  accountId?: string; // email_accounts.id - needed to update token in DB
}

// Callback to notify when token is refreshed (so caller can update DB if needed)
type TokenRefreshCallback = (newAccessToken: string, expiresAt: Date) => Promise<void>;

export class GmailService {
  private gmail: any;
  private oauth2Client: any;
  private tokenRefreshed = false;

  constructor(private config: GmailConfig, onTokenRefresh?: TokenRefreshCallback) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );

    this.oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken
    });

    // Listen for token refresh events from the Google API client
    this.oauth2Client.on('tokens', async (tokens: any) => {
      if (tokens.access_token) {
        logger.info('Gmail access token automatically refreshed');
        this.tokenRefreshed = true;

        const expiresAt = tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3600 * 1000); // Default 1 hour

        // Update database if we have accountId
        if (this.config.accountId) {
          try {
            await query(
              `UPDATE email_accounts
               SET access_token = $1, token_expires_at = $2, updated_at = NOW()
               WHERE id = $3`,
              [tokens.access_token, expiresAt, this.config.accountId]
            );
            logger.info(`Updated access token in database for account ${this.config.accountId}`);
          } catch (err) {
            logger.error('Failed to update refreshed token in database:', err);
          }
        }

        // Call callback if provided
        if (onTokenRefresh) {
          try {
            await onTokenRefresh(tokens.access_token, expiresAt);
          } catch (err) {
            logger.error('Token refresh callback failed:', err);
          }
        }
      }
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Execute a Gmail API call with automatic token refresh retry
   */
  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Check if it's a 401 (unauthorized) error - token expired
      const status = error?.response?.status || error?.code || error?.status;

      if ((status === 401 || error.message?.includes('invalid_grant') || error.message?.includes('Token has been expired or revoked'))
          && this.config.refreshToken && !this.tokenRefreshed) {
        logger.info(`Token expired during ${operationName}, attempting manual refresh...`);

        try {
          // Force token refresh
          const { credentials } = await this.oauth2Client.refreshAccessToken();

          if (credentials.access_token) {
            this.oauth2Client.setCredentials(credentials);
            this.tokenRefreshed = true;

            const expiresAt = credentials.expiry_date
              ? new Date(credentials.expiry_date)
              : new Date(Date.now() + 3600 * 1000);

            // Update database
            if (this.config.accountId) {
              await query(
                `UPDATE email_accounts
                 SET access_token = $1, token_expires_at = $2, updated_at = NOW()
                 WHERE id = $3`,
                [credentials.access_token, expiresAt, this.config.accountId]
              );
              logger.info(`Saved refreshed token to database for account ${this.config.accountId}`);
            }

            // Retry the operation
            logger.info(`Retrying ${operationName} with refreshed token...`);
            return await operation();
          }
        } catch (refreshError: any) {
          logger.error(`Failed to refresh token during ${operationName}:`, refreshError.message);
          throw new Error('Access token expired and refresh failed. Please reconnect your Gmail account.');
        }
      }

      throw error;
    }
  }

  /**
   * Mark email as read on Gmail
   */
  async markAsRead(messageId: string): Promise<void> {
    return this.withRetry(async () => {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
      logger.info(`Marked Gmail message ${messageId} as read`);
    }, 'markAsRead');
  }

  /**
   * Mark email as unread on Gmail
   */
  async markAsUnread(messageId: string): Promise<void> {
    return this.withRetry(async () => {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD']
        }
      });
    }, 'markAsUnread');
  }

  /**
   * Move email to trash on Gmail
   */
  async trashEmail(messageId: string): Promise<void> {
    return this.withRetry(async () => {
      await this.gmail.users.messages.trash({
        userId: 'me',
        id: messageId
      });
      logger.info(`Moved Gmail message ${messageId} to trash`);
    }, 'trashEmail');
  }

  /**
   * Restore email from trash on Gmail
   */
  async untrashEmail(messageId: string): Promise<void> {
    return this.withRetry(async () => {
      await this.gmail.users.messages.untrash({
        userId: 'me',
        id: messageId
      });
      logger.info(`Restored Gmail message ${messageId} from trash`);
    }, 'untrashEmail');
  }

  /**
   * Add a label to an email
   */
  async addLabel(messageId: string, labelId: string): Promise<void> {
    return this.withRetry(async () => {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });
      logger.info(`Added label ${labelId} to Gmail message ${messageId}`);
    }, 'addLabel');
  }

  /**
   * Remove a label from an email (used for archiving - removes INBOX label)
   */
  async removeLabel(messageId: string, labelId: string): Promise<void> {
    return this.withRetry(async () => {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: [labelId]
        }
      });
      logger.info(`Removed label ${labelId} from Gmail message ${messageId}`);
    }, 'removeLabel');
  }

  /**
   * Fetch recent emails from Gmail
   */
  async fetchRecentEmails(maxResults: number = 200): Promise<any[]> {
    return this.withRetry(async () => {
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
    }, 'fetchRecentEmails');
  }

  /**
   * Get detailed email information
   */
  private async getEmailDetails(messageId: string): Promise<any> {
    // Note: withRetry is called at the public method level, not here
    // to avoid nested retry logic
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

    // Extract List-Unsubscribe header for smart unsubscribe feature
    const unsubscribeInfo = this.extractUnsubscribeInfo(headers);

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
      providerType: 'gmail',
      // Unsubscribe info from List-Unsubscribe header
      unsubscribeUrl: unsubscribeInfo.url || null,
      unsubscribeEmail: unsubscribeInfo.email || null
    };
  }

  /**
   * Extract List-Unsubscribe header info
   * Supports both URL and mailto formats
   * Example: <https://example.com/unsubscribe>, <mailto:unsubscribe@example.com>
   */
  private extractUnsubscribeInfo(headers: any[]): { url?: string; email?: string } {
    const unsubHeader = headers.find((h: any) => h.name.toLowerCase() === 'list-unsubscribe');
    if (!unsubHeader) return {};

    const value = unsubHeader.value;

    // Extract HTTPS/HTTP URL
    const urlMatch = value.match(/<(https?:\/\/[^>]+)>/i);
    // Extract mailto address
    const emailMatch = value.match(/<mailto:([^>?]+)/i);

    return {
      url: urlMatch?.[1],
      email: emailMatch?.[1]
    };
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
    return this.withRetry(async () => {
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
    }, 'fetchEmailsByIds');
  }

  /**
   * Get user's Gmail profile (useful for testing connection)
   */
  async getProfile(): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return response.data;
    }, 'getProfile');
  }

  /**
   * Test Gmail connection
   */
  static async testConnection(config: GmailConfig): Promise<boolean> {
    try {
      const service = new GmailService(config);
      await service.getProfile();
      return true;
    } catch (error) {
      logger.error('Gmail test connection failed:', error);
      return false;
    }
  }
}
