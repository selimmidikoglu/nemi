import axios from 'axios';
import { logger } from '../config/logger';

export interface OutlookConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export class OutlookService {
  private accessToken: string;
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(private config: OutlookConfig) {
    this.accessToken = config.accessToken;
  }

  /**
   * Mark email as read on Outlook
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await axios.patch(
        `${this.baseUrl}/me/messages/${messageId}`,
        { isRead: true },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Marked Outlook message ${messageId} as read`);
    } catch (error: any) {
      logger.error(`Failed to mark Outlook message ${messageId} as read:`, error.message);
      throw error;
    }
  }

  /**
   * Mark email as unread on Outlook
   */
  async markAsUnread(messageId: string): Promise<void> {
    try {
      await axios.patch(
        `${this.baseUrl}/me/messages/${messageId}`,
        { isRead: false },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Marked Outlook message ${messageId} as unread`);
    } catch (error: any) {
      logger.error(`Failed to mark Outlook message ${messageId} as unread:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch recent emails from Outlook
   */
  async fetchRecentEmails(maxResults: number = 200): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me/mailFolders/inbox/messages`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          },
          params: {
            $top: maxResults,
            $orderby: 'receivedDateTime desc',
            $select: 'id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,body,bodyPreview,internetMessageHeaders'
          }
        }
      );

      const messages = response.data.value || [];
      return messages.map((msg: any) => this.parseOutlookMessage(msg));
    } catch (error: any) {
      logger.error('Failed to fetch Outlook emails:', error.message);
      throw error;
    }
  }

  /**
   * Fetch specific emails by IDs (for push notification handling)
   */
  async fetchEmailsByIds(messageIds: string[]): Promise<any[]> {
    const emails: any[] = [];

    for (const messageId of messageIds) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/me/messages/${messageId}`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`
            },
            params: {
              $select: 'id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,body,bodyPreview,internetMessageHeaders'
            }
          }
        );
        emails.push(this.parseOutlookMessage(response.data));
      } catch (error: any) {
        logger.error(`Failed to fetch Outlook message ${messageId}:`, error.message);
      }
    }

    return emails;
  }

  /**
   * Move email to trash
   */
  async trashEmail(messageId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/me/messages/${messageId}/move`,
        { destinationId: 'deleteditems' },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      logger.info(`Moved Outlook message ${messageId} to trash`);
    } catch (error: any) {
      logger.error(`Failed to trash Outlook message ${messageId}:`, error.message);
      throw error;
    }
  }

  /**
   * Archive email (move to archive folder)
   */
  async archiveEmail(messageId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/me/messages/${messageId}/move`,
        { destinationId: 'archive' },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      logger.info(`Archived Outlook message ${messageId}`);
    } catch (error: any) {
      logger.error(`Failed to archive Outlook message ${messageId}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse Outlook message into standardized format
   */
  private parseOutlookMessage(message: any): any {
    // Extract unsubscribe info from headers
    let unsubscribeUrl: string | undefined;
    let unsubscribeEmail: string | undefined;

    if (message.internetMessageHeaders) {
      const unsubHeader = message.internetMessageHeaders.find(
        (h: any) => h.name.toLowerCase() === 'list-unsubscribe'
      );
      if (unsubHeader) {
        const urlMatch = unsubHeader.value.match(/<(https?:\/\/[^>]+)>/i);
        const emailMatch = unsubHeader.value.match(/<mailto:([^>?]+)/i);
        unsubscribeUrl = urlMatch?.[1];
        unsubscribeEmail = emailMatch?.[1];
      }
    }

    // Parse body - Outlook may return HTML or text
    let body = '';
    let htmlBody: string | undefined;
    let textBody = '';

    if (message.body) {
      if (message.body.contentType === 'html') {
        htmlBody = message.body.content || '';
        // Strip HTML for plain text
        textBody = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        body = textBody;
      } else {
        textBody = message.body.content || '';
        body = textBody;
      }
    }

    return {
      messageId: message.id,
      conversationId: message.conversationId || null,
      from: {
        email: message.from?.emailAddress?.address || '',
        name: message.from?.emailAddress?.name || ''
      },
      to: message.toRecipients?.map((r: any) => ({
        email: r.emailAddress?.address || '',
        name: r.emailAddress?.name || ''
      })) || [],
      cc: message.ccRecipients?.map((r: any) => ({
        email: r.emailAddress?.address || '',
        name: r.emailAddress?.name || ''
      })) || [],
      subject: message.subject || '(No Subject)',
      body,
      textBody,
      htmlBody,
      date: new Date(message.receivedDateTime),
      isRead: message.isRead,
      hasAttachments: message.hasAttachments || false,
      uid: message.id,
      providerType: 'outlook',
      unsubscribeUrl,
      unsubscribeEmail
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    try {
      const response = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/Mail.ReadWrite offline_access'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error: any) {
      logger.error('Failed to refresh Outlook access token:', error.message);
      throw error;
    }
  }

  /**
   * Test Outlook connection
   */
  static async testConnection(config: OutlookConfig): Promise<boolean> {
    try {
      const service = new OutlookService(config);
      await axios.get(
        'https://graph.microsoft.com/v1.0/me',
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`
          }
        }
      );
      return true;
    } catch (error) {
      logger.error('Outlook test connection failed:', error);
      return false;
    }
  }
}
