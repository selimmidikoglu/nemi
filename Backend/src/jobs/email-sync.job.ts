import cron from 'node-cron';
import { pool } from '../config/database';
import { ImapService, FetchedEmail } from '../services/imap.service';
import { GmailService } from '../services/gmail.service';
import { OutlookService } from '../services/outlook.service';
import { DeepEmailAnalyzerService } from '../services/deep-email-analyzer.service';
import { GmailPushService } from '../services/gmail-push.service';
import { OutlookPushService } from '../services/outlook-push.service';
import { logger } from '../config/logger';
import { LogoService } from '../services/logo.service';
import * as elasticsearchService from '../services/elasticsearch.service';

/**
 * Background job to sync emails from all connected email accounts
 *
 * NEW ARCHITECTURE:
 * - Gmail accounts: Initial sync ONCE (100/500/1000 based on plan), then rely on push notifications
 * - IMAP accounts: Regular polling (for providers without push support)
 */
export class EmailSyncJob {
  private deepAnalyzer: DeepEmailAnalyzerService;
  private isRunning: boolean = false;

  constructor() {
    this.deepAnalyzer = new DeepEmailAnalyzerService(pool);
  }

  /**
   * Start the cron job
   */
  start(): void {
    // Run every 30 seconds for IMAP accounts only (Gmail uses push notifications)
    cron.schedule('*/30 * * * * *', async () => {
      if (this.isRunning) {
        return;
      }

      this.isRunning = true;

      try {
        await this.syncImapAccountsOnly();
      } catch (error) {
        logger.error('Error in email sync job:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Email sync job scheduled (every 30 seconds for IMAP accounts only)');

    // Run initial sync for all new accounts on startup
    setTimeout(async () => {
      await this.runInitialSyncForNewAccounts();
    }, 5000);
  }

  /**
   * Run initial sync for accounts that haven't completed initial sync yet
   * This is called once on startup and when new accounts are added
   */
  async runInitialSyncForNewAccounts(): Promise<void> {
    try {
      // Find accounts that haven't completed initial sync
      const accountsQuery = await pool.query(`
        SELECT ea.id, ea.user_id, ea.email_address, ea.provider,
               ea.access_token, ea.refresh_token, ea.imap_host, ea.imap_port,
               ea.imap_secure, ea.encrypted_password
        FROM email_accounts ea
        WHERE ea.is_active = true
          AND ea.sync_enabled = true
          AND (ea.initial_sync_complete = false OR ea.initial_sync_complete IS NULL)
      `);

      if (accountsQuery.rows.length === 0) {
        logger.info('No accounts need initial sync');
        return;
      }

      logger.info(`Found ${accountsQuery.rows.length} account(s) needing initial sync`);

      for (const row of accountsQuery.rows) {
        const account = {
          id: row.id,
          userId: row.user_id,
          emailAddress: row.email_address,
          provider: row.provider,
          imapConfig: {
            host: row.imap_host,
            port: row.imap_port,
            secure: row.imap_secure,
            user: row.email_address,
            password: row.encrypted_password
          },
          oauthTokens: row.access_token && row.refresh_token ? {
            accessToken: row.access_token,
            refreshToken: row.refresh_token
          } : undefined
        };

        await this.runInitialSync(account);
      }
    } catch (error) {
      logger.error('Error running initial sync for new accounts:', error);
    }
  }

  /**
   * Run initial sync for a single account (ONE TIME ONLY)
   * Pulls the last N emails based on customer plan
   */
  private async runInitialSync(account: {
    id: string;
    userId: string;
    emailAddress: string;
    provider?: string;
    imapConfig: any;
    oauthTokens?: {
      accessToken: string;
      refreshToken: string;
    };
  }): Promise<void> {
    try {
      logger.info(`🚀 Starting INITIAL SYNC for ${account.emailAddress} (provider: ${account.provider || 'imap'})`);

      // For Gmail: Set up push notifications BEFORE initial sync
      // This ensures we don't miss any emails that arrive during the sync
      if (account.provider === 'gmail' && account.oauthTokens) {
        try {
          await GmailPushService.setupWatch(
            {
              accessToken: account.oauthTokens.accessToken,
              refreshToken: account.oauthTokens.refreshToken,
              clientId: process.env.GMAIL_CLIENT_ID || '',
              clientSecret: process.env.GMAIL_CLIENT_SECRET || ''
            },
            account.id
          );
          logger.info(`📡 Gmail push notifications enabled for ${account.emailAddress} (before sync)`);
        } catch (pushError) {
          logger.error(`Failed to set up push notifications for ${account.emailAddress}:`, pushError);
          // Continue with sync even if push setup fails
        }
      }

      // For Outlook: Set up push notifications BEFORE initial sync
      if (account.provider === 'outlook' && account.oauthTokens) {
        try {
          const webhookBaseUrl = process.env.OUTLOOK_WEBHOOK_BASE_URL ||
            `https://${process.env.NGROK_DOMAIN}`;
          const webhookUrl = `${webhookBaseUrl}/api/outlook/webhook`;

          await OutlookPushService.createSubscription(
            {
              accessToken: account.oauthTokens.accessToken,
              refreshToken: account.oauthTokens.refreshToken,
              clientId: process.env.OUTLOOK_CLIENT_ID || '',
              clientSecret: process.env.OUTLOOK_CLIENT_SECRET || ''
            },
            account.id,
            webhookUrl
          );
          logger.info(`📡 Outlook push notifications enabled for ${account.emailAddress} (before sync)`);
        } catch (pushError) {
          logger.error(`Failed to set up Outlook push notifications for ${account.emailAddress}:`, pushError);
          // Continue with sync even if push setup fails
        }
      }

      // Get initial email limit from plan (TODO: get from user's subscription plan)
      const maxInitialEmails = parseInt(process.env.MAX_INITIAL_EMAILS || '100', 10);

      let emails: FetchedEmail[] = [];

      if (account.provider === 'gmail' && account.oauthTokens) {
        // Gmail: Fetch initial emails
        emails = await this.syncGmailInitial(account, maxInitialEmails);
      } else if (account.provider === 'outlook' && account.oauthTokens) {
        // Outlook: Fetch initial emails
        emails = await this.syncOutlookInitial(account, maxInitialEmails);
      } else {
        // IMAP: Fetch initial emails
        emails = await this.syncImapInitial(account, maxInitialEmails);
      }

      logger.info(`📥 Fetched ${emails.length} emails for initial sync of ${account.emailAddress}`);

      // Analyze and save all emails
      let savedCount = 0;
      for (const email of emails) {
        const saved = await this.analyzeAndSaveEmail(email, account.userId, account.id);
        if (saved) savedCount++;
      }

      // Mark initial sync as complete
      await pool.query(
        `UPDATE email_accounts SET initial_sync_complete = true, last_sync_at = NOW() WHERE id = $1`,
        [account.id]
      );

      logger.info(`✅ INITIAL SYNC COMPLETE for ${account.emailAddress}: ${savedCount}/${emails.length} emails saved`);

    } catch (error: any) {
      logger.error(`Error in initial sync for ${account.emailAddress}:`, error);
      await pool.query(
        `UPDATE email_accounts SET last_sync_error = $1 WHERE id = $2`,
        [error.message || 'Initial sync failed', account.id]
      );
    }
  }

  /**
   * Sync IMAP accounts only (called by cron job)
   * Gmail accounts are handled by push notifications
   */
  private async syncImapAccountsOnly(): Promise<void> {
    try {
      // Only get IMAP accounts that have completed initial sync
      const accountsQuery = await pool.query(`
        SELECT ea.id, ea.user_id, ea.email_address, ea.provider,
               ea.imap_host, ea.imap_port, ea.imap_secure, ea.encrypted_password,
               ea.last_sync_at
        FROM email_accounts ea
        WHERE ea.is_active = true
          AND ea.sync_enabled = true
          AND ea.initial_sync_complete = true
          AND ea.provider != 'gmail'
      `);

      if (accountsQuery.rows.length === 0) {
        return; // No IMAP accounts to sync
      }

      logger.debug(`Syncing ${accountsQuery.rows.length} IMAP account(s)`);

      for (const row of accountsQuery.rows) {
        const account = {
          id: row.id,
          userId: row.user_id,
          emailAddress: row.email_address,
          provider: row.provider,
          imapConfig: {
            host: row.imap_host,
            port: row.imap_port,
            secure: row.imap_secure,
            user: row.email_address,
            password: row.encrypted_password
          },
          lastSyncAt: row.last_sync_at
        };

        await this.syncImapAccountIncremental(account);
      }
    } catch (error) {
      logger.error('Error syncing IMAP accounts:', error);
    }
  }

  /**
   * Initial Gmail sync - fetch last N emails
   */
  private async syncGmailInitial(account: {
    id: string;
    emailAddress: string;
    oauthTokens?: {
      accessToken: string;
      refreshToken: string;
    };
  }, limit: number): Promise<FetchedEmail[]> {
    if (!account.oauthTokens) {
      throw new Error('Gmail account missing OAuth tokens');
    }

    const gmailService = new GmailService({
      accessToken: account.oauthTokens.accessToken,
      refreshToken: account.oauthTokens.refreshToken,
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      accountId: account.id
    });

    const gmailEmails = await gmailService.fetchRecentEmails(limit);

    return gmailEmails.map(email => ({
      messageId: email.messageId,
      threadId: email.threadId, // Gmail's native thread ID for conversation grouping
      from: email.from,
      to: email.to,
      cc: [],
      bcc: [],
      subject: email.subject,
      body: email.body || email.textBody,
      htmlBody: email.htmlBody || '',
      date: email.date,
      isRead: email.isRead,
      hasAttachments: email.hasAttachments,
      uid: email.uid,
      providerType: 'gmail'
    }));
  }

  /**
   * Initial Outlook sync - fetch last N emails
   */
  private async syncOutlookInitial(account: {
    id: string;
    emailAddress: string;
    oauthTokens?: {
      accessToken: string;
      refreshToken: string;
    };
  }, limit: number): Promise<FetchedEmail[]> {
    if (!account.oauthTokens) {
      throw new Error('Outlook account missing OAuth tokens');
    }

    const outlookService = new OutlookService({
      accessToken: account.oauthTokens.accessToken,
      refreshToken: account.oauthTokens.refreshToken,
      clientId: process.env.OUTLOOK_CLIENT_ID || '',
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET || ''
    });

    const outlookEmails = await outlookService.fetchRecentEmails(limit);

    return outlookEmails.map((email: any) => ({
      messageId: email.messageId,
      threadId: email.conversationId || null, // Outlook's conversation ID
      from: email.from,
      to: email.to,
      cc: [],
      bcc: [],
      subject: email.subject,
      body: email.body || email.textBody,
      htmlBody: email.htmlBody || '',
      date: email.date,
      isRead: email.isRead,
      hasAttachments: email.hasAttachments,
      uid: email.uid || email.messageId,
      providerType: 'outlook'
    }));
  }

  /**
   * Initial IMAP sync - fetch last N emails
   */
  private async syncImapInitial(account: {
    imapConfig: any;
  }, limit: number): Promise<FetchedEmail[]> {
    const imapService = new ImapService(account.imapConfig);

    try {
      await imapService.connect();

      // For initial sync, go back 30 days
      const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const emails = await imapService.fetchEmailsSince(sinceDate, limit);

      await imapService.disconnect();
      return emails;
    } catch (error) {
      try {
        await imapService.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      throw error;
    }
  }

  /**
   * Incremental IMAP sync - fetch emails since last sync
   */
  private async syncImapAccountIncremental(account: {
    id: string;
    userId: string;
    emailAddress: string;
    imapConfig: any;
    lastSyncAt: Date | null;
  }): Promise<void> {
    try {
      const imapService = new ImapService(account.imapConfig);
      await imapService.connect();

      // Fetch emails since last sync (or last hour if no previous sync)
      const sinceDate = account.lastSyncAt
        ? new Date(account.lastSyncAt)
        : new Date(Date.now() - 60 * 60 * 1000);

      const emails = await imapService.fetchEmailsSince(sinceDate, 50);
      await imapService.disconnect();

      if (emails.length > 0) {
        logger.info(`[IMAP] Found ${emails.length} new emails for ${account.emailAddress}`);

        for (const email of emails) {
          await this.analyzeAndSaveEmail(email, account.userId, account.id);
        }
      }

      // Update last sync time
      await pool.query(
        `UPDATE email_accounts SET last_sync_at = NOW(), last_sync_error = NULL WHERE id = $1`,
        [account.id]
      );

    } catch (error: any) {
      logger.error(`Error syncing IMAP account ${account.emailAddress}:`, error);
      await pool.query(
        `UPDATE email_accounts SET last_sync_error = $1 WHERE id = $2`,
        [error.message || 'Sync failed', account.id]
      );
    }
  }

  /**
   * Analyze email with AI and save to database
   * Returns true if email was saved, false if it already existed
   */
  async analyzeAndSaveEmail(
    email: FetchedEmail,
    userId: string,
    emailAccountId: string
  ): Promise<boolean> {
    try {
      // Check if email already exists
      const existingQuery = await pool.query(
        'SELECT id FROM emails WHERE user_id = $1 AND message_id = $2',
        [userId, email.messageId]
      );

      if (existingQuery.rows.length > 0) {
        return false; // Already exists
      }

      // Analyze with AI
      const emailForAnalysis = {
        id: '',
        user_id: userId,
        from_email: email.from.email,
        from_name: email.from.name || null,
        to_emails: email.to || [],
        subject: email.subject,
        body: email.body,
        date: email.date
      };

      const aiAnalysis = await this.deepAnalyzer.analyzeEmailBeforeSave(emailForAnalysis, userId);

      // Get company logo from LogoService (uses caching)
      const logoInfo = await LogoService.getLogoForEmail(email.from.email);
      const companyName = logoInfo.companyName;
      const companyDomain = logoInfo.companyDomain;
      const companyLogoUrl = logoInfo.logoUrl;

      if (aiAnalysis) {
        // Save with AI analysis
        const result = await pool.query(
          `INSERT INTO emails (
            user_id, message_id, thread_id, from_email, from_name, to_emails, cc_emails, bcc_emails,
            subject, body, html_body, snippet, date, is_read, is_starred, has_attachments,
            category, importance, is_personally_relevant, extracted_images,
            email_account_id, ai_summary, master_importance_score, ai_analyzed_at, imap_uid, provider_type,
            company_name, company_domain, company_logo_url, is_about_me, mention_context, html_snippet, render_as_html,
            unsubscribe_url, unsubscribe_email
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
          RETURNING id`,
          [
            userId,
            email.messageId,
            email.threadId || null, // Gmail's native thread ID
            email.from.email,
            email.from.name || null,
            JSON.stringify(email.to || []),
            JSON.stringify(email.cc || []),
            JSON.stringify(email.bcc || []),
            email.subject,
            email.body,
            email.htmlBody || null,
            (email.body || '').substring(0, 200),
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
            email.providerType || 'imap',
            companyName,
            companyDomain,
            companyLogoUrl,
            aiAnalysis.is_about_me || false,
            aiAnalysis.mention_context || null,
            aiAnalysis.html_snippet || null,
            aiAnalysis.render_as_html || false,
            (email as any).unsubscribeUrl || null,
            (email as any).unsubscribeEmail || null
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

        // Index to Elasticsearch (non-blocking)
        this.indexEmailToElasticsearch(emailId, userId, emailAccountId, email, aiAnalysis).catch((err: Error) => {
          logger.warn(`Failed to index email to Elasticsearch: ${err.message}`);
        });

        logger.info(`✅ Saved: "${email.subject.substring(0, 40)}..." (score: ${aiAnalysis.masterImportanceScore})`);
        return true;
      } else {
        // Save without AI
        const result = await pool.query(
          `INSERT INTO emails (
            user_id, message_id, thread_id, from_email, from_name, to_emails, cc_emails, bcc_emails,
            subject, body, html_body, snippet, date, is_read, is_starred, has_attachments,
            category, importance, is_personally_relevant, extracted_images, email_account_id, imap_uid, provider_type,
            unsubscribe_url, unsubscribe_email
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
          RETURNING id`,
          [
            userId,
            email.messageId,
            email.threadId || null, // Gmail's native thread ID
            email.from.email,
            email.from.name || null,
            JSON.stringify(email.to || []),
            JSON.stringify(email.cc || []),
            JSON.stringify(email.bcc || []),
            email.subject,
            email.body,
            email.htmlBody || null,
            (email.body || '').substring(0, 200),
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
            email.providerType || 'imap',
            (email as any).unsubscribeUrl || null,
            (email as any).unsubscribeEmail || null
          ]
        );

        const noAiEmailId = result.rows[0]?.id;

        // Index to Elasticsearch (non-blocking)
        if (noAiEmailId) {
          this.indexEmailToElasticsearch(noAiEmailId, userId, emailAccountId, email, null).catch((err: Error) => {
            logger.warn(`Failed to index email to Elasticsearch: ${err.message}`);
          });
        }

        logger.debug(`Saved (no AI): ${email.subject}`);
        return true;
      }
    } catch (error: any) {
      if (error.code === '23505') {
        return false; // Duplicate - already exists
      }
      logger.error(`Error saving email "${email.subject}":`, error);
      return false;
    }
  }

  /**
   * Index email to Elasticsearch for search
   */
  private async indexEmailToElasticsearch(
    emailId: string,
    userId: string,
    emailAccountId: string,
    email: FetchedEmail,
    aiAnalysis: any
  ): Promise<void> {
    try {
      // Check if ES is available
      const esAvailable = await elasticsearchService.isElasticsearchAvailable();
      if (!esAvailable) {
        return; // Silently skip if ES is not available
      }

      // Initialize index if needed (only creates if doesn't exist)
      await elasticsearchService.initializeIndex();

      // Build document for indexing - all IDs are UUIDs (strings)
      const document = {
        id: emailId,
        user_id: userId,
        email_account_id: emailAccountId,
        message_id: email.messageId,
        thread_id: email.threadId || undefined,
        subject: email.subject || '',
        from_email: email.from.email || '',
        from_name: email.from.name || undefined,
        to_addresses: (email.to || []).map(addr => typeof addr === 'object' ? addr.email : addr),
        cc_addresses: (email.cc || []).map(addr => typeof addr === 'object' ? addr.email : addr),
        bcc_addresses: (email.bcc || []).map(addr => typeof addr === 'object' ? addr.email : addr),
        body_text: email.body || undefined,
        body_html: email.htmlBody || undefined,
        snippet: (email.body || '').substring(0, 200),
        date: email.date instanceof Date ? email.date.toISOString() : email.date,
        is_read: email.isRead || false,
        is_starred: false,
        is_archived: false,
        is_deleted: false,
        has_attachments: email.hasAttachments || false,
        attachment_names: [],
        labels: [],
        category: aiAnalysis?.category || 'inbox',
        importance: aiAnalysis?.importance || 'normal',
        badges: aiAnalysis?.badges?.map((b: any) => b.name) || [],
        company_name: undefined,
        summary: aiAnalysis?.summary || undefined,
        unsubscribe_url: (email as any).unsubscribeUrl || undefined
      };

      await elasticsearchService.indexEmail(document);
      logger.debug(`📇 Indexed email to Elasticsearch: ${emailId}`);
    } catch (error: any) {
      // Don't throw - ES indexing failure shouldn't break email sync
      logger.warn(`Elasticsearch indexing failed for email ${emailId}: ${error.message}`);
    }
  }
}
