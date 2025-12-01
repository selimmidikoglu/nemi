import { google } from 'googleapis';
import { logger } from '../config/logger';
import { pool } from '../config/database';
import WebSocket from 'ws';
import { GmailService } from './gmail.service';
import { DeepEmailAnalyzerService } from './deep-email-analyzer.service';
import { parseEmailSender } from '../utils/email-domain-parser';
import { PeopleService } from './people.service';

export interface GmailPushConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export class GmailPushService {
  private static wsServer: WebSocket.Server | null = null;
  private static clients: Map<string, WebSocket[]> = new Map(); // userId -> WebSocket connections

  /**
   * Initialize WebSocket server for real-time updates
   */
  static initializeWebSocket(server: any): void {
    this.wsServer = new WebSocket.Server({ server, path: '/ws' });

    this.wsServer.on('connection', (ws: WebSocket, req: any) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        ws.close(1008, 'User ID required');
        return;
      }

      logger.info(`WebSocket connected for user: ${userId}`);

      // Add to clients map
      if (!this.clients.has(userId)) {
        this.clients.set(userId, []);
      }
      this.clients.get(userId)!.push(ws);

      ws.on('close', () => {
        logger.info(`WebSocket disconnected for user: ${userId}`);
        const userClients = this.clients.get(userId);
        if (userClients) {
          const index = userClients.indexOf(ws);
          if (index > -1) {
            userClients.splice(index, 1);
          }
          if (userClients.length === 0) {
            this.clients.delete(userId);
          }
        }
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for user ${userId}:`, error);
      });

      // Send initial connection success
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
    });

    logger.info('WebSocket server initialized on /ws');
  }

  /**
   * Notify user via WebSocket about new emails
   */
  static notifyUser(userId: string, data: any): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.length === 0) {
      logger.debug(`No WebSocket clients for user ${userId}`);
      return;
    }

    const message = JSON.stringify(data);
    userClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    logger.info(`Notified ${userClients.length} WebSocket client(s) for user ${userId}`);
  }

  /**
   * Set up Gmail watch for push notifications
   */
  static async setupWatch(config: GmailPushConfig, emailAccountId: string): Promise<{ historyId: string; expiration: string }> {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topicName) {
      throw new Error('GMAIL_PUBSUB_TOPIC environment variable not set');
    }

    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: ['INBOX'],
        labelFilterBehavior: 'include'
      }
    });

    const historyId = response.data.historyId!;
    const expiration = response.data.expiration!;

    // Save watch info to database
    await pool.query(
      `UPDATE email_accounts
       SET gmail_history_id = $1, gmail_watch_expiration = $2
       WHERE id = $3`,
      [historyId, new Date(parseInt(expiration)), emailAccountId]
    );

    logger.info(`Gmail watch set up for account ${emailAccountId}, historyId: ${historyId}, expires: ${new Date(parseInt(expiration))}`);

    return { historyId, expiration };
  }

  /**
   * Stop Gmail watch
   */
  static async stopWatch(config: GmailPushConfig): Promise<void> {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.stop({
      userId: 'me'
    });

    logger.info('Gmail watch stopped');
  }

  /**
   * Process push notification from Google Pub/Sub
   * Now fetches, analyzes, and saves new emails immediately
   */
  static async processPushNotification(data: { emailAddress: string; historyId: string }): Promise<void> {
    logger.info(`Processing push notification for ${data.emailAddress}, historyId: ${data.historyId}`);

    // Find the email account
    const accountQuery = await pool.query(
      `SELECT ea.id, ea.user_id, ea.access_token, ea.refresh_token, ea.gmail_history_id
       FROM email_accounts ea
       WHERE ea.email_address = $1 AND ea.provider = 'gmail'`,
      [data.emailAddress]
    );

    if (accountQuery.rows.length === 0) {
      logger.warn(`No Gmail account found for ${data.emailAddress}`);
      return;
    }

    const account = accountQuery.rows[0];
    const userId = account.user_id;
    const emailAccountId = account.id;
    const previousHistoryId = account.gmail_history_id;

    if (!previousHistoryId) {
      logger.warn(`No previous history ID for ${data.emailAddress}, skipping`);
      return;
    }

    const config = {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || ''
    };

    // Get history changes from Gmail
    const changes = await this.getHistoryChanges(config, previousHistoryId);

    if (changes.newMessageIds.length > 0) {
      logger.info(`Found ${changes.newMessageIds.length} new message(s) for ${data.emailAddress}`);

      // Update history ID immediately
      await pool.query(
        `UPDATE email_accounts SET gmail_history_id = $1 WHERE id = $2`,
        [data.historyId, emailAccountId]
      );

      // Fetch and analyze the new emails immediately
      const savedEmails = await this.fetchAndAnalyzeEmails(
        config,
        changes.newMessageIds,
        userId,
        emailAccountId
      );

      // Notify user via WebSocket with the analyzed emails
      this.notifyUser(userId, {
        type: 'new_emails',
        count: savedEmails.length,
        messageIds: changes.newMessageIds,
        emailAddress: data.emailAddress,
        emails: savedEmails // Include analyzed email data for immediate display
      });

      logger.info(`✅ Push notification processed: ${savedEmails.length} emails fetched, analyzed, and saved for ${data.emailAddress}`);
    }
  }

  /**
   * Fetch emails by IDs and analyze them with AI
   */
  private static async fetchAndAnalyzeEmails(
    config: GmailPushConfig,
    messageIds: string[],
    userId: string,
    emailAccountId: string
  ): Promise<any[]> {
    const gmailService = new GmailService(config);
    const deepAnalyzer = new DeepEmailAnalyzerService(pool);
    const peopleService = new PeopleService(config);
    const savedEmails: any[] = [];

    // Fetch the emails
    const emails = await gmailService.fetchEmailsByIds(messageIds);

    // Batch fetch profile photos for all senders
    const senderEmails = emails.map(e => e.from.email);
    let profilePhotos = new Map<string, string | null>();
    try {
      profilePhotos = await peopleService.getProfilePhotosWithCache(senderEmails);
    } catch (error) {
      logger.debug('Could not fetch profile photos, continuing without them');
    }

    for (const email of emails) {
      try {
        // Check if email already exists
        const existingQuery = await pool.query(
          'SELECT id FROM emails WHERE user_id = $1 AND message_id = $2',
          [userId, email.messageId]
        );

        if (existingQuery.rows.length > 0) {
          logger.debug(`Email ${email.messageId} already exists, skipping`);
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

        // Parse sender info
        const senderInfo = parseEmailSender(email.from.email);
        const companyName = senderInfo.knownService || senderInfo.companyName || null;
        const companyLogoUrl = companyName ? `https://logo.clearbit.com/${senderInfo.domain}` : null;

        // Get sender profile photo (from People API cache)
        const senderProfilePhotoUrl = profilePhotos.get(email.from.email) || null;

        if (aiAnalysis) {
          // Save with AI analysis
          const result = await pool.query(
            `INSERT INTO emails (
              user_id, message_id, thread_id, from_email, from_name, to_emails, cc_emails, bcc_emails,
              subject, body, html_body, snippet, date, is_read, is_starred, has_attachments,
              category, importance, is_personally_relevant, extracted_images,
              email_account_id, ai_summary, master_importance_score, ai_analyzed_at, imap_uid, provider_type,
              company_name, company_logo_url, is_about_me, mention_context, html_snippet, render_as_html
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
            RETURNING id`,
            [
              userId,
              email.messageId,
              email.threadId || null, // Gmail's native thread ID
              email.from.email,
              email.from.name || null,
              JSON.stringify(email.to || []),
              JSON.stringify([]),
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
              email.uid,
              'gmail',
              companyName,
              companyLogoUrl,
              aiAnalysis.is_about_me || false,
              aiAnalysis.mention_context || null,
              aiAnalysis.html_snippet || null,
              aiAnalysis.render_as_html || false
            ]
          );

          const emailId = result.rows[0].id;

          // Save badges and scores
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
            threadId: email.threadId || null,
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
            companyName: companyName,
            companyLogoUrl: companyLogoUrl,
            senderProfilePhotoUrl: senderProfilePhotoUrl,
            isAboutMe: aiAnalysis.is_about_me || false,
            mentionContext: aiAnalysis.mention_context || null,
            htmlSnippet: aiAnalysis.html_snippet || null,
            renderAsHtml: aiAnalysis.render_as_html || false,
            scores: aiAnalysis.scores || null
          });

          logger.info(`✅ [PUSH] Saved AI-analyzed email: "${email.subject.substring(0, 50)}..." (score: ${aiAnalysis.masterImportanceScore})`);
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
              email.threadId || null, // Gmail's native thread ID
              email.from.email,
              email.from.name || null,
              JSON.stringify(email.to || []),
              JSON.stringify([]),
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
              email.uid,
              'gmail'
            ]
          );

          savedEmails.push({
            id: result.rows[0].id,
            messageId: email.messageId,
            threadId: email.threadId || null,
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
            senderProfilePhotoUrl: senderProfilePhotoUrl,
            isAboutMe: false,
            mentionContext: null,
            htmlSnippet: null,
            renderAsHtml: false,
            scores: null
          });

          logger.info(`[PUSH] Saved email without AI: "${email.subject.substring(0, 50)}..."`);
        }
      } catch (error: any) {
        if (error.code === '23505') {
          logger.debug(`Email ${email.messageId} already exists (duplicate key)`);
        } else {
          logger.error(`Error processing push email "${email.subject}":`, error);
        }
      }
    }

    return savedEmails;
  }

  /**
   * Get history changes from Gmail
   */
  private static async getHistoryChanges(
    config: GmailPushConfig,
    startHistoryId: string
  ): Promise<{ newMessageIds: string[] }> {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    try {
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
        labelId: 'INBOX'
      });

      const newMessageIds: string[] = [];

      if (response.data.history) {
        for (const historyRecord of response.data.history) {
          if (historyRecord.messagesAdded) {
            for (const added of historyRecord.messagesAdded) {
              if (added.message?.id) {
                newMessageIds.push(added.message.id);
              }
            }
          }
        }
      }

      return { newMessageIds };
    } catch (error: any) {
      if (error.code === 404) {
        // History ID is too old, need to do full sync
        logger.warn('History ID too old, full sync required');
        return { newMessageIds: [] };
      }
      throw error;
    }
  }

  /**
   * Renew Gmail watches that are about to expire
   */
  static async renewExpiringWatches(): Promise<void> {
    // Find watches expiring in the next hour
    const expiringQuery = await pool.query(
      `SELECT id, access_token, refresh_token
       FROM email_accounts
       WHERE provider = 'gmail'
         AND access_token IS NOT NULL
         AND gmail_watch_expiration < NOW() + INTERVAL '1 hour'`
    );

    for (const account of expiringQuery.rows) {
      try {
        await this.setupWatch(
          {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            clientId: process.env.GMAIL_CLIENT_ID || '',
            clientSecret: process.env.GMAIL_CLIENT_SECRET || ''
          },
          account.id
        );
        logger.info(`Renewed watch for account ${account.id}`);
      } catch (error) {
        logger.error(`Failed to renew watch for account ${account.id}:`, error);
      }
    }
  }
}
