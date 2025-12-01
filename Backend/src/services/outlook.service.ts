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
            $select: 'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,body'
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
   * Parse Outlook message into standardized format
   */
  private parseOutlookMessage(message: any): any {
    return {
      messageId: message.id,
      from: {
        email: message.from?.emailAddress?.address || '',
        name: message.from?.emailAddress?.name || ''
      },
      to: message.toRecipients?.map((r: any) => ({
        email: r.emailAddress?.address || '',
        name: r.emailAddress?.name || ''
      })) || [],
      subject: message.subject || '(No Subject)',
      body: message.body?.content || '',
      htmlBody: message.body?.contentType === 'html' ? message.body?.content : undefined,
      date: new Date(message.receivedDateTime),
      isRead: message.isRead,
      hasAttachments: message.hasAttachments || false,
      uid: message.id,
      providerType: 'outlook'
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
