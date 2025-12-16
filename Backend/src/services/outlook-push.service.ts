import axios from 'axios';
import { logger } from '../config/logger';
import { pool } from '../config/database';
import { OutlookService } from './outlook.service';
import { DeepEmailAnalyzerService } from './deep-email-analyzer.service';
import { LogoService } from './logo.service';
import { GmailPushService } from './gmail-push.service'; // Reuse WebSocket notification

export interface OutlookPushConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  accountId?: string;
}

export interface OutlookNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: string;
  resource: string;
  resourceData?: {
    id: string;
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
  };
  clientState: string;
  tenantId: string;
}

export class OutlookPushService {
  private static baseUrl = 'https://graph.microsoft.com/v1.0';

  /**
   * Create Microsoft Graph subscription for mailbox changes
   * Subscriptions last max 3 days (4230 minutes)
   */
  static async createSubscription(
    config: OutlookPushConfig,
    emailAccountId: string,
    webhookUrl: string
  ): Promise<{ subscriptionId: string; expiration: Date }> {
    // Calculate expiration (max 3 days = 4230 minutes)
    const expirationDateTime = new Date();
    expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 4230);

    const subscriptionBody = {
      changeType: 'created',
      notificationUrl: webhookUrl,
      resource: 'me/mailFolders/inbox/messages',
      expirationDateTime: expirationDateTime.toISOString(),
      clientState: emailAccountId // Use account ID for validation
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/subscriptions`,
        subscriptionBody,
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const subscriptionId = response.data.id;
      const expiration = new Date(response.data.expirationDateTime);

      // Save subscription info to database
      await pool.query(
        `UPDATE email_accounts
         SET outlook_subscription_id = $1, outlook_subscription_expiration = $2
         WHERE id = $3`,
        [subscriptionId, expiration, emailAccountId]
      );

      logger.info(`Outlook subscription created for account ${emailAccountId}, subscriptionId: ${subscriptionId}, expires: ${expiration}`);

      return { subscriptionId, expiration };
    } catch (error: any) {
      logger.error('Failed to create Outlook subscription:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete subscription when account is disconnected
   */
  static async deleteSubscription(
    config: OutlookPushConfig,
    subscriptionId: string
  ): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`
          }
        }
      );

      logger.info(`Outlook subscription ${subscriptionId} deleted`);
    } catch (error: any) {
      // Subscription may already be expired/deleted
      if (error.response?.status === 404) {
        logger.warn(`Outlook subscription ${subscriptionId} not found (already deleted/expired)`);
      } else {
        logger.error('Failed to delete Outlook subscription:', error.response?.data || error.message);
        throw error;
      }
    }
  }

  /**
   * Renew subscription before expiration (max 3 days lifetime)
   */
  static async renewSubscription(
    config: OutlookPushConfig,
    subscriptionId: string,
    emailAccountId: string
  ): Promise<{ expiration: Date }> {
    const expirationDateTime = new Date();
    expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 4230);

    try {
      const response = await axios.patch(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        {
          expirationDateTime: expirationDateTime.toISOString()
        },
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const expiration = new Date(response.data.expirationDateTime);

      // Update expiration in database
      await pool.query(
        `UPDATE email_accounts
         SET outlook_subscription_expiration = $1
         WHERE id = $2`,
        [expiration, emailAccountId]
      );

      logger.info(`Outlook subscription ${subscriptionId} renewed, new expiration: ${expiration}`);

      return { expiration };
    } catch (error: any) {
      logger.error('Failed to renew Outlook subscription:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Process incoming webhook notification from Microsoft Graph
   */
  static async processNotification(notification: OutlookNotification): Promise<void> {
    const { subscriptionId, clientState, resourceData, changeType } = notification;

    logger.info(`Processing Outlook notification: subscriptionId=${subscriptionId}, changeType=${changeType}`);

    // clientState contains the emailAccountId
    const emailAccountId = clientState;

    // Find the email account
    const accountQuery = await pool.query(
      `SELECT ea.id, ea.user_id, ea.email_address, ea.access_token, ea.refresh_token, ea.outlook_subscription_id
       FROM email_accounts ea
       WHERE ea.id = $1 AND ea.provider = 'outlook'`,
      [emailAccountId]
    );

    if (accountQuery.rows.length === 0) {
      logger.warn(`No Outlook account found for id ${emailAccountId}`);
      return;
    }

    const account = accountQuery.rows[0];

    // Validate subscription ID matches
    if (account.outlook_subscription_id !== subscriptionId) {
      logger.warn(`Subscription ID mismatch: expected ${account.outlook_subscription_id}, got ${subscriptionId}`);
      return;
    }

    const userId = account.user_id;

    // For 'created' change type, fetch the new message
    if (changeType === 'created' && resourceData?.id) {
      const messageId = resourceData.id;

      const config: OutlookPushConfig = {
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        clientId: process.env.OUTLOOK_CLIENT_ID || '',
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
        accountId: emailAccountId
      };

      try {
        // Fetch and analyze the new email
        const savedEmails = await this.fetchAndAnalyzeEmails(
          config,
          [messageId],
          userId,
          emailAccountId
        );

        // Notify user via WebSocket (reuse Gmail's WebSocket infrastructure)
        GmailPushService.notifyUser(userId, {
          type: 'new_emails',
          count: savedEmails.length,
          messageIds: [messageId],
          emailAddress: account.email_address,
          emails: savedEmails,
          provider: 'outlook'
        });

        logger.info(`✅ Outlook push notification processed: ${savedEmails.length} emails for ${account.email_address}`);
      } catch (error) {
        logger.error(`Error processing Outlook notification for ${account.email_address}:`, error);
      }
    }
  }

  /**
   * Fetch emails by IDs and analyze them with AI
   */
  private static async fetchAndAnalyzeEmails(
    config: OutlookPushConfig,
    messageIds: string[],
    userId: string,
    emailAccountId: string
  ): Promise<any[]> {
    const outlookService = new OutlookService(config);
    const deepAnalyzer = new DeepEmailAnalyzerService(pool);
    const savedEmails: any[] = [];

    for (const messageId of messageIds) {
      try {
        // Check if email already exists
        const existingQuery = await pool.query(
          'SELECT id FROM emails WHERE user_id = $1 AND message_id = $2',
          [userId, messageId]
        );

        if (existingQuery.rows.length > 0) {
          logger.debug(`Email ${messageId} already exists, skipping`);
          continue;
        }

        // Fetch the full message from Outlook
        const email = await this.fetchMessageById(config, messageId);

        if (!email) {
          logger.warn(`Could not fetch message ${messageId}`);
          continue;
        }

        // Analyze with AI
        const emailForAnalysis = {
          id: '',
          user_id: userId,
          from_email: email.from.email,
          from_name: email.from.name || null,
          to_emails: email.to || [],
          subject: email.subject,
          body: email.body || email.textBody,
          date: email.date
        };

        const aiAnalysis = await deepAnalyzer.analyzeEmailBeforeSave(emailForAnalysis, userId);

        // Get company logo
        const logoInfo = await LogoService.getLogoForEmail(email.from.email);

        if (aiAnalysis) {
          // Save with AI analysis
          const result = await pool.query(
            `INSERT INTO emails (
              user_id, message_id, thread_id, from_email, from_name, to_emails, cc_emails, bcc_emails,
              subject, body, html_body, snippet, date, is_read, is_starred, has_attachments,
              category, importance, is_personally_relevant, extracted_images,
              email_account_id, ai_summary, master_importance_score, ai_analyzed_at, imap_uid, provider_type,
              company_name, company_domain, company_logo_url, is_about_me, mention_context, html_snippet, render_as_html
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
            RETURNING id`,
            [
              userId,
              email.messageId,
              email.conversationId || null,
              email.from.email,
              email.from.name || null,
              JSON.stringify(email.to || []),
              JSON.stringify(email.cc || []),
              JSON.stringify([]),
              email.subject,
              email.body || email.textBody,
              email.htmlBody || null,
              (email.body || email.textBody || '').substring(0, 200),
              email.date,
              email.isRead,
              false,
              email.hasAttachments,
              aiAnalysis.category,
              aiAnalysis.importance,
              aiAnalysis.isPersonallyRelevant,
              JSON.stringify([]),
              emailAccountId,
              aiAnalysis.summary,
              aiAnalysis.masterImportanceScore,
              new Date(),
              email.messageId, // Use messageId as UID for Outlook
              'outlook',
              logoInfo.companyName,
              logoInfo.companyDomain,
              logoInfo.logoUrl,
              aiAnalysis.is_about_me || false,
              aiAnalysis.mention_context || null,
              aiAnalysis.html_snippet || null,
              aiAnalysis.render_as_html || false
            ]
          );

          const emailId = result.rows[0].id;

          // Save badges
          if (aiAnalysis.badges && aiAnalysis.badges.length > 0) {
            for (const badge of aiAnalysis.badges) {
              await pool.query(
                `INSERT INTO email_badges (email_id, badge_name, badge_color, badge_icon, importance, category)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT DO NOTHING`,
                [emailId, badge.name, badge.color, badge.icon, badge.importance, badge.category || 'Other']
              );
            }
          }

          // Save scores
          if (aiAnalysis.scores) {
            await pool.query(
              `INSERT INTO email_scores (email_id, work_score, personal_score, urgent_score, requires_action_score, financial_score, social_score, promotional_score)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (email_id) DO UPDATE SET
                 work_score = EXCLUDED.work_score,
                 personal_score = EXCLUDED.personal_score,
                 urgent_score = EXCLUDED.urgent_score,
                 requires_action_score = EXCLUDED.requires_action_score,
                 financial_score = EXCLUDED.financial_score,
                 social_score = EXCLUDED.social_score,
                 promotional_score = EXCLUDED.promotional_score`,
              [
                emailId,
                aiAnalysis.scores.work_related || 0,
                aiAnalysis.scores.personal || 0,
                aiAnalysis.scores.urgent || 0,
                aiAnalysis.scores.requires_action || 0,
                aiAnalysis.scores.financial || 0,
                aiAnalysis.scores.social || 0,
                aiAnalysis.scores.promotional || 0
              ]
            );
          }

          savedEmails.push({
            id: emailId,
            messageId: email.messageId,
            threadId: email.conversationId || null,
            subject: email.subject,
            from: email.from,
            fromEmail: email.from.email,
            fromName: email.from.name || null,
            to: email.to || [],
            body: email.body || email.textBody,
            htmlBody: email.htmlBody || null,
            snippet: (email.body || email.textBody || '').substring(0, 200),
            date: email.date,
            isRead: email.isRead,
            isStarred: false,
            hasAttachments: email.hasAttachments,
            category: aiAnalysis.category,
            importance: aiAnalysis.importance,
            isPersonallyRelevant: aiAnalysis.isPersonallyRelevant,
            summary: aiAnalysis.summary,
            masterImportanceScore: aiAnalysis.masterImportanceScore,
            badges: aiAnalysis.badges,
            companyName: logoInfo.companyName,
            companyLogoUrl: logoInfo.logoUrl,
            isAboutMe: aiAnalysis.is_about_me || false,
            mentionContext: aiAnalysis.mention_context || null,
            htmlSnippet: aiAnalysis.html_snippet || null,
            renderAsHtml: aiAnalysis.render_as_html || false,
            scores: aiAnalysis.scores || null
          });

          logger.info(`✅ [OUTLOOK PUSH] Saved AI-analyzed email: "${email.subject.substring(0, 50)}..." (score: ${aiAnalysis.masterImportanceScore})`);
        } else {
          // Save without AI (fallback)
          const result = await pool.query(
            `INSERT INTO emails (
              user_id, message_id, thread_id, from_email, from_name, to_emails, cc_emails, bcc_emails,
              subject, body, html_body, snippet, date, is_read, is_starred, has_attachments,
              category, importance, is_personally_relevant, extracted_images, email_account_id, imap_uid, provider_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING id`,
            [
              userId,
              email.messageId,
              email.conversationId || null,
              email.from.email,
              email.from.name || null,
              JSON.stringify(email.to || []),
              JSON.stringify(email.cc || []),
              JSON.stringify([]),
              email.subject,
              email.body || email.textBody,
              email.htmlBody || null,
              (email.body || email.textBody || '').substring(0, 200),
              email.date,
              email.isRead,
              false,
              email.hasAttachments,
              'inbox',
              'normal',
              false,
              JSON.stringify([]),
              emailAccountId,
              email.messageId,
              'outlook'
            ]
          );

          savedEmails.push({
            id: result.rows[0].id,
            messageId: email.messageId,
            threadId: email.conversationId || null,
            subject: email.subject,
            from: email.from,
            fromEmail: email.from.email,
            fromName: email.from.name || null,
            to: email.to || [],
            body: email.body || email.textBody,
            htmlBody: email.htmlBody || null,
            snippet: (email.body || email.textBody || '').substring(0, 200),
            date: email.date,
            isRead: email.isRead,
            isStarred: false,
            hasAttachments: email.hasAttachments,
            category: 'inbox',
            importance: 'normal',
            isPersonallyRelevant: false,
            summary: null,
            masterImportanceScore: null,
            badges: [],
            companyName: null,
            companyLogoUrl: null,
            isAboutMe: false,
            mentionContext: null,
            htmlSnippet: null,
            renderAsHtml: false,
            scores: null
          });

          logger.info(`[OUTLOOK PUSH] Saved email without AI: "${email.subject.substring(0, 50)}..."`);
        }
      } catch (error: any) {
        if (error.code === '23505') {
          logger.debug(`Email ${messageId} already exists (duplicate key)`);
        } else {
          logger.error(`Error processing Outlook push email ${messageId}:`, error);
        }
      }
    }

    return savedEmails;
  }

  /**
   * Fetch a single message by ID from Microsoft Graph
   */
  private static async fetchMessageById(config: OutlookPushConfig, messageId: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`
          },
          params: {
            $select: 'id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,body,bodyPreview,internetMessageHeaders'
          }
        }
      );

      const msg = response.data;

      // Extract unsubscribe info from headers
      let unsubscribeUrl: string | undefined;
      let unsubscribeEmail: string | undefined;

      if (msg.internetMessageHeaders) {
        const unsubHeader = msg.internetMessageHeaders.find(
          (h: any) => h.name.toLowerCase() === 'list-unsubscribe'
        );
        if (unsubHeader) {
          const urlMatch = unsubHeader.value.match(/<(https?:\/\/[^>]+)>/i);
          const emailMatch = unsubHeader.value.match(/<mailto:([^>?]+)/i);
          unsubscribeUrl = urlMatch?.[1];
          unsubscribeEmail = emailMatch?.[1];
        }
      }

      // Parse body - Outlook returns HTML by default
      let body = '';
      let htmlBody = '';
      let textBody = '';

      if (msg.body) {
        if (msg.body.contentType === 'html') {
          htmlBody = msg.body.content || '';
          // Strip HTML for plain text
          textBody = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          body = textBody;
        } else {
          textBody = msg.body.content || '';
          body = textBody;
        }
      }

      return {
        messageId: msg.id,
        conversationId: msg.conversationId,
        from: {
          email: msg.from?.emailAddress?.address || '',
          name: msg.from?.emailAddress?.name || ''
        },
        to: msg.toRecipients?.map((r: any) => ({
          email: r.emailAddress?.address || '',
          name: r.emailAddress?.name || ''
        })) || [],
        cc: msg.ccRecipients?.map((r: any) => ({
          email: r.emailAddress?.address || '',
          name: r.emailAddress?.name || ''
        })) || [],
        subject: msg.subject || '(No Subject)',
        body,
        textBody,
        htmlBody,
        date: new Date(msg.receivedDateTime),
        isRead: msg.isRead,
        hasAttachments: msg.hasAttachments || false,
        unsubscribeUrl,
        unsubscribeEmail
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, try to refresh
        logger.warn('Outlook token expired during message fetch, attempting refresh...');
        // TODO: Implement token refresh and retry
      }
      logger.error(`Failed to fetch Outlook message ${messageId}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Renew all expiring Outlook subscriptions
   * Should be called every 2 hours (subscriptions max out at 3 days)
   */
  static async renewExpiringSubscriptions(): Promise<void> {
    // Find subscriptions expiring in the next 4 hours
    const expiringQuery = await pool.query(
      `SELECT id, access_token, refresh_token, outlook_subscription_id, email_address
       FROM email_accounts
       WHERE provider = 'outlook'
         AND access_token IS NOT NULL
         AND outlook_subscription_id IS NOT NULL
         AND outlook_subscription_expiration < NOW() + INTERVAL '4 hours'`
    );

    logger.info(`Found ${expiringQuery.rows.length} Outlook subscriptions to renew`);

    for (const account of expiringQuery.rows) {
      try {
        await this.renewSubscription(
          {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            clientId: process.env.OUTLOOK_CLIENT_ID || '',
            clientSecret: process.env.OUTLOOK_CLIENT_SECRET || ''
          },
          account.outlook_subscription_id,
          account.id
        );
        logger.info(`Renewed Outlook subscription for ${account.email_address}`);
      } catch (error: any) {
        // If renewal fails (subscription expired), create a new one
        if (error.response?.status === 404) {
          logger.warn(`Outlook subscription expired for ${account.email_address}, creating new subscription`);
          try {
            const webhookUrl = `${process.env.OUTLOOK_WEBHOOK_BASE_URL || process.env.NGROK_DOMAIN}/api/outlook/webhook`;
            await this.createSubscription(
              {
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                clientId: process.env.OUTLOOK_CLIENT_ID || '',
                clientSecret: process.env.OUTLOOK_CLIENT_SECRET || ''
              },
              account.id,
              webhookUrl
            );
          } catch (createError) {
            logger.error(`Failed to create new Outlook subscription for ${account.email_address}:`, createError);
          }
        } else {
          logger.error(`Failed to renew Outlook subscription for ${account.email_address}:`, error);
        }
      }
    }
  }
}
