import { query, getClient } from '../config/database';
import { logger } from '../config/logger';
import { GmailService } from './gmail.service';

export class EmailService {
  /**
   * Fetch emails from provider (Gmail, Outlook, etc.)
   */
  async fetchFromProvider(userId: string, provider: string): Promise<any[]> {
    logger.info(`Fetching emails from ${provider} for user ${userId}`);

    if (provider === 'gmail' || provider === 'Gmail') {
      return this.fetchFromGmail(userId);
    }

    // TODO: Implement Outlook, IMAP, etc.
    logger.warn(`Provider ${provider} not fully implemented, returning empty array`);
    return [];
  }

  /**
   * Fetch emails from Gmail API
   */
  private async fetchFromGmail(userId: string): Promise<any[]> {
    // Get Gmail account credentials
    const accountResult = await query(
      `SELECT id, access_token, refresh_token, email_address
       FROM email_accounts
       WHERE user_id = $1 AND provider = 'gmail' AND is_active = true
       LIMIT 1`,
      [userId]
    );

    if (accountResult.rows.length === 0) {
      logger.warn(`No active Gmail account found for user ${userId}`);
      return [];
    }

    const account = accountResult.rows[0];

    if (!account.access_token || !account.refresh_token) {
      logger.warn(`Gmail account ${account.email_address} missing OAuth tokens`);
      return [];
    }

    const gmailService = new GmailService({
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      accountId: account.id
    });

    const maxEmails = parseInt(process.env.MAX_INITIAL_EMAILS || '100', 10);
    logger.info(`Fetching up to ${maxEmails} emails from Gmail for ${account.email_address}`);

    const emails = await gmailService.fetchRecentEmails(maxEmails);

    // Transform to common format and add account info
    return emails.map(email => ({
      ...email,
      providerId: email.messageId,
      emailAccountId: account.id,
      from: email.from,
      to: email.to,
      body: email.body || email.textBody,
      htmlBody: email.htmlBody,
      snippet: email.body?.substring(0, 200) || '',
      hasAttachments: email.hasAttachments || false,
      // Unsubscribe info from List-Unsubscribe header
      unsubscribeUrl: email.unsubscribeUrl || null,
      unsubscribeEmail: email.unsubscribeEmail || null
    }));
  }

  /**
   * Save emails to database
   */
  async saveEmails(userId: string, emails: any[]): Promise<any[]> {
    const client = await getClient();
    const savedEmails: any[] = [];

    try {
      await client.query('BEGIN');

      for (const email of emails) {
        const result = await client.query(
          `INSERT INTO emails (
            user_id, provider_email_id, from_email, from_name,
            to_emails, cc_emails, bcc_emails, reply_to_emails, subject, body, html_body,
            snippet, date, is_read, is_starred, has_attachments,
            ai_summary, category, importance, is_personally_relevant,
            company_name, company_domain, company_logo_url,
            is_answerable, response_urgency, suggested_replies, extracted_actions,
            unsubscribe_url, unsubscribe_email
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
          ON CONFLICT (user_id, provider_email_id) DO UPDATE SET
            ai_summary = EXCLUDED.ai_summary,
            category = EXCLUDED.category,
            importance = EXCLUDED.importance,
            is_personally_relevant = EXCLUDED.is_personally_relevant,
            company_name = EXCLUDED.company_name,
            company_domain = EXCLUDED.company_domain,
            company_logo_url = EXCLUDED.company_logo_url,
            is_answerable = EXCLUDED.is_answerable,
            response_urgency = EXCLUDED.response_urgency,
            suggested_replies = EXCLUDED.suggested_replies,
            extracted_actions = EXCLUDED.extracted_actions,
            unsubscribe_url = COALESCE(EXCLUDED.unsubscribe_url, emails.unsubscribe_url),
            unsubscribe_email = COALESCE(EXCLUDED.unsubscribe_email, emails.unsubscribe_email)
          RETURNING id`,
          [
            userId,
            email.providerId,
            email.from.email,
            email.from.name,
            JSON.stringify(email.to),
            JSON.stringify(email.cc || []),
            JSON.stringify(email.bcc || []),
            JSON.stringify(email.replyTo || []),
            email.subject,
            email.body,
            email.htmlBody,
            email.snippet,
            email.date,
            false, // is_read
            false, // is_starred
            email.hasAttachments || false,
            email.aiSummary,
            email.category,
            email.importance,
            email.isPersonallyRelevant,
            email.companyName,
            email.companyDomain,
            email.companyLogoUrl,
            email.isAnswerable ?? false,
            email.responseUrgency || 'none',
            email.suggestedReplies ? JSON.stringify(email.suggestedReplies) : '[]',
            email.extractedActions ? JSON.stringify(email.extractedActions) : '[]',
            email.unsubscribeUrl || null,
            email.unsubscribeEmail || null
          ]
        );

        const emailId = result.rows[0].id;

        // Save attachments if any
        if (email.attachments && email.attachments.length > 0) {
          for (const attachment of email.attachments) {
            await client.query(
              `INSERT INTO email_attachments (email_id, filename, mime_type, size, download_url)
               VALUES ($1, $2, $3, $4, $5)`,
              [emailId, attachment.filename, attachment.mimeType, attachment.size, attachment.downloadUrl]
            );
          }
        }

        // Save extracted actions to email_actions table
        if (email.extractedActions && email.extractedActions.length > 0) {
          for (const action of email.extractedActions) {
            await client.query(
              `INSERT INTO email_actions (
                email_id, user_id, action_type, title, due_date, priority,
                source_text, calendar_type, status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
              ON CONFLICT DO NOTHING`,
              [
                emailId,
                userId,
                action.type,
                action.title,
                action.date || null,
                action.priority || 'medium',
                action.source_text || null,
                action.calendar_type || 'reminder'
              ]
            );
          }
        }

        savedEmails.push({ ...email, id: emailId });
      }

      await client.query('COMMIT');
      return savedEmails;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to save emails:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get total count of emails with filters
   */
  async getEmailCount(filters: any): Promise<number> {
    const conditions: string[] = ['e.user_id = $1'];
    const params: any[] = [filters.userId];
    let paramIndex = 2;

    // By default, exclude deleted and archived emails unless specifically requested
    if (!filters.includeDeleted) {
      conditions.push(`COALESCE(e.is_deleted, false) = false`);
    }
    if (!filters.includeArchived) {
      conditions.push(`COALESCE(e.is_archived, false) = false`);
    }

    if (filters.category) {
      conditions.push(`e.category = $${paramIndex++}`);
      params.push(filters.category);
    }

    if (filters.isRead !== undefined) {
      conditions.push(`e.is_read = $${paramIndex++}`);
      params.push(filters.isRead);
    }

    if (filters.isStarred !== undefined) {
      conditions.push(`e.is_starred = $${paramIndex++}`);
      params.push(filters.isStarred);
    }

    if (filters.isPersonallyRelevant !== undefined) {
      conditions.push(`e.is_personally_relevant = $${paramIndex++}`);
      params.push(filters.isPersonallyRelevant);
    }

    if (filters.search) {
      conditions.push(`(
        e.subject ILIKE $${paramIndex} OR
        e.body ILIKE $${paramIndex} OR
        e.from_name ILIKE $${paramIndex} OR
        e.from_email ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM email_badges eb
          WHERE eb.email_id = e.id AND eb.badge_name ILIKE $${paramIndex}
        )
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.badgeName) {
      conditions.push(`EXISTS (
        SELECT 1 FROM email_badges eb
        WHERE eb.email_id = e.id AND eb.badge_name = $${paramIndex}
      )`);
      params.push(filters.badgeName);
      paramIndex++;
    }

    if (filters.emailAccountId) {
      conditions.push(`e.email_account_id = $${paramIndex++}`);
      params.push(filters.emailAccountId);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `SELECT COUNT(*) as count FROM emails e WHERE ${whereClause}`,
      params
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Get emails with filters
   */
  async getEmails(filters: any, limit: number, offset: number): Promise<any[]> {
    const conditions: string[] = ['e.user_id = $1'];
    const params: any[] = [filters.userId];
    let paramIndex = 2;

    // By default, exclude deleted and archived emails unless specifically requested
    // Note: is_deleted and is_archived columns may be null for older emails, treat null as false
    if (!filters.includeDeleted) {
      conditions.push(`COALESCE(e.is_deleted, false) = false`);
    }
    if (!filters.includeArchived) {
      conditions.push(`COALESCE(e.is_archived, false) = false`);
    }

    if (filters.category) {
      conditions.push(`e.category = $${paramIndex++}`);
      params.push(filters.category);
    }

    if (filters.isRead !== undefined) {
      conditions.push(`e.is_read = $${paramIndex++}`);
      params.push(filters.isRead);
    }

    if (filters.isStarred !== undefined) {
      conditions.push(`e.is_starred = $${paramIndex++}`);
      params.push(filters.isStarred);
    }

    if (filters.isPersonallyRelevant !== undefined) {
      conditions.push(`e.is_personally_relevant = $${paramIndex++}`);
      params.push(filters.isPersonallyRelevant);
    }

    if (filters.search) {
      // PostgreSQL full-text search across subject, body, from_name, and badge names
      conditions.push(`(
        e.subject ILIKE $${paramIndex} OR
        e.body ILIKE $${paramIndex} OR
        e.from_name ILIKE $${paramIndex} OR
        e.from_email ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM email_badges eb
          WHERE eb.email_id = e.id AND eb.badge_name ILIKE $${paramIndex}
        )
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.badgeName) {
      // Filter emails that have a specific badge
      conditions.push(`EXISTS (
        SELECT 1 FROM email_badges eb
        WHERE eb.email_id = e.id AND eb.badge_name = $${paramIndex}
      )`);
      params.push(filters.badgeName);
      paramIndex++;
    }

    if (filters.emailAccountId) {
      conditions.push(`e.email_account_id = $${paramIndex++}`);
      params.push(filters.emailAccountId);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `WITH email_personalized_scores AS (
        SELECT
          e.id,
          (
            COALESCE(e.master_importance_score, 0.5) * 0.3 +
            COALESCE(AVG(bem.engagement_score * eb.importance_score), 0.5) * 0.7
          ) as personalized_score
        FROM emails e
        LEFT JOIN email_badges eb ON eb.email_id = e.id
        LEFT JOIN badge_engagement_metrics bem
          ON bem.user_id = e.user_id AND bem.badge_name = eb.badge_name
        WHERE ${whereClause}
        GROUP BY e.id, e.master_importance_score
      )
      SELECT
        e.id, e.from_email, e.from_name, e.to_emails, e.cc_emails, e.bcc_emails, e.reply_to_emails,
        e.subject, e.body, e.html_body, e.snippet, e.date, e.is_read, e.is_starred,
        e.has_attachments, e.ai_summary, e.category, e.importance, e.is_personally_relevant,
        e.master_importance_score, e.created_at, e.email_account_id, e.message_id, e.thread_id,
        e.company_name, e.company_domain, e.company_logo_url,
        e.is_about_me, e.mention_context, e.html_snippet, e.render_as_html,
        e.is_answerable, e.response_urgency, e.suggested_replies, e.extracted_actions,
        eps.personalized_score,
        COALESCE(
          json_agg(
            json_build_object(
              'name', b.badge_name,
              'color', b.badge_color,
              'icon', b.badge_icon,
              'importance', b.importance_score,
              'category', COALESCE(b.category, 'Other'),
              'displayOrder', COALESCE(ubd.display_order, 999)
            ) ORDER BY COALESCE(ubd.display_order, 999) ASC, b.importance_score DESC
          ) FILTER (WHERE b.badge_name IS NOT NULL),
          '[]'
        ) as badges,
        row_to_json(s.*) as scores
       FROM emails e
       LEFT JOIN email_badges b ON b.email_id = e.id
       LEFT JOIN user_badge_definitions ubd ON ubd.user_id = e.user_id AND ubd.badge_name = b.badge_name
       LEFT JOIN email_scores s ON s.email_id = e.id
       LEFT JOIN email_personalized_scores eps ON eps.id = e.id
       WHERE ${whereClause}
       GROUP BY e.id, s.id, eps.personalized_score
       ORDER BY e.date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return result.rows.map(this.formatEmail);
  }

  /**
   * Get email by ID
   */
  async getEmailById(emailId: string, userId: string): Promise<any | null> {
    const result = await query(
      `SELECT * FROM emails WHERE id = $1 AND user_id = $2`,
      [emailId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Get attachments
    const attachments = await query(
      `SELECT * FROM email_attachments WHERE email_id = $1`,
      [emailId]
    );

    const email = this.formatEmail(result.rows[0]);
    email.attachments = attachments.rows;

    return email;
  }

  /**
   * Get emails by IDs
   */
  async getEmailsByIds(emailIds: string[], userId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM emails WHERE id = ANY($1) AND user_id = $2`,
      [emailIds, userId]
    );

    return result.rows.map(this.formatEmail);
  }

  /**
   * Update email classifications
   */
  async updateClassifications(classifications: any[]): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      for (const classification of classifications) {
        await client.query(
          `UPDATE emails
           SET category = $1, importance = $2, is_personally_relevant = $3
           WHERE id = $4`,
          [
            classification.category,
            classification.importance,
            classification.isPersonallyRelevant,
            classification.emailId
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update read status
   */
  async updateReadStatus(emailId: string, userId: string, isRead: boolean): Promise<void> {
    // First, update the database
    await query(
      `UPDATE emails SET is_read = $1 WHERE id = $2 AND user_id = $3`,
      [isRead, emailId, userId]
    );

    // Then, sync to IMAP/Gmail/Outlook server
    try {
      await this.syncReadStatusToProvider(emailId, userId, isRead);
    } catch (error) {
      logger.error(`Failed to sync read status to provider for email ${emailId}:`, error);
      // Don't throw - we've already updated the database
    }
  }

  /**
   * Sync read status back to email provider (IMAP/Gmail/Outlook)
   */
  private async syncReadStatusToProvider(emailId: string, userId: string, isRead: boolean): Promise<void> {
    // Get email details with IMAP UID and account info
    const result = await query(
      `SELECT e.imap_uid, e.provider_type, e.email_account_id,
              ea.imap_host, ea.imap_port, ea.imap_secure,
              ea.encrypted_password, ea.email_address
       FROM emails e
       LEFT JOIN email_accounts ea ON e.email_account_id = ea.id
       WHERE e.id = $1 AND e.user_id = $2`,
      [emailId, userId]
    );

    if (result.rows.length === 0) {
      logger.warn(`Email ${emailId} not found for syncing read status`);
      return;
    }

    const email = result.rows[0];

    if (!email.imap_uid || !email.imap_host) {
      logger.debug(`Email ${emailId} has no IMAP UID or host, skipping sync`);
      return;
    }

    const providerType = email.provider_type || 'imap';

    if (providerType === 'imap') {
      // Sync via IMAP
      const { ImapService } = await import('./imap.service');
      const { decrypt } = await import('../utils/encryption');

      // Construct IMAP config from database fields
      const imapConfig = {
        user: email.email_address,
        password: decrypt(email.encrypted_password),
        host: email.imap_host,
        port: email.imap_port,
        tls: email.imap_secure,
        tlsOptions: {
          rejectUnauthorized: false
        }
      };

      const imapService = new ImapService(imapConfig);

      try {
        await imapService.connect();

        if (isRead) {
          await imapService.markAsRead(email.imap_uid);
        } else {
          await imapService.markAsUnread(email.imap_uid);
        }

        await imapService.disconnect();
        logger.info(`Synced read status to IMAP for email ${emailId} (UID: ${email.imap_uid})`);
      } catch (error) {
        logger.error(`IMAP sync failed for email ${emailId}:`, error);
        throw error;
      }
    } else if (providerType === 'gmail') {
      // Sync via Gmail API
      const { GmailService } = await import('./gmail.service');

      // Get OAuth tokens from email account (columns are access_token, refresh_token)
      const accountResult = await query(
        `SELECT access_token, refresh_token FROM email_accounts WHERE id = $1`,
        [email.email_account_id]
      );

      if (accountResult.rows.length === 0 || !accountResult.rows[0].access_token) {
        logger.warn(`Gmail account ${email.email_account_id} has no OAuth tokens`);
        return;
      }

      const account = accountResult.rows[0];
      const gmailService = new GmailService({
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        accountId: account.id
      });

      try {
        if (isRead) {
          await gmailService.markAsRead(email.imap_uid); // For Gmail, imap_uid stores the Gmail message ID
        } else {
          await gmailService.markAsUnread(email.imap_uid);
        }
        logger.info(`Synced read status to Gmail for email ${emailId}`);
      } catch (error) {
        logger.error(`Gmail sync failed for email ${emailId}:`, error);
        throw error;
      }
    } else if (providerType === 'outlook') {
      // Sync via Outlook API
      const { OutlookService } = await import('./outlook.service');

      // Get OAuth tokens from email account (columns are access_token, refresh_token)
      const accountResult = await query(
        `SELECT access_token, refresh_token FROM email_accounts WHERE id = $1`,
        [email.email_account_id]
      );

      if (accountResult.rows.length === 0 || !accountResult.rows[0].access_token) {
        logger.warn(`Outlook account ${email.email_account_id} has no OAuth tokens`);
        return;
      }

      const account = accountResult.rows[0];
      const outlookService = new OutlookService({
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        clientId: process.env.OUTLOOK_CLIENT_ID || '',
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET || ''
      });

      try {
        if (isRead) {
          await outlookService.markAsRead(email.imap_uid); // For Outlook, imap_uid stores the Outlook message ID
        } else {
          await outlookService.markAsUnread(email.imap_uid);
        }
        logger.info(`Synced read status to Outlook for email ${emailId}`);
      } catch (error) {
        logger.error(`Outlook sync failed for email ${emailId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Update star status
   */
  async updateStarStatus(emailId: string, userId: string, isStarred: boolean): Promise<void> {
    await query(
      `UPDATE emails SET is_starred = $1 WHERE id = $2 AND user_id = $3`,
      [isStarred, emailId, userId]
    );
  }

  /**
   * Delete email
   */
  async deleteEmail(emailId: string, userId: string): Promise<void> {
    await query(
      `DELETE FROM emails WHERE id = $1 AND user_id = $2`,
      [emailId, userId]
    );
  }

  /**
   * Bulk delete emails from database and optionally from Gmail
   * Returns email metadata needed for Gmail deletion
   */
  async bulkDeleteEmails(emailIds: string[], userId: string): Promise<{ deletedCount: number; gmailEmails: { messageId: string; emailAccountId: string; accessToken: string; refreshToken: string }[] }> {
    // First, get the email metadata for Gmail deletion
    const emailMetadata = await query(
      `SELECT e.id, e.message_id, e.email_account_id, e.provider_type, ea.access_token, ea.refresh_token
       FROM emails e
       LEFT JOIN email_accounts ea ON ea.id = e.email_account_id
       WHERE e.id = ANY($1) AND e.user_id = $2`,
      [emailIds, userId]
    );

    const gmailEmails = emailMetadata.rows
      .filter(row => row.provider_type === 'gmail' && row.access_token)
      .map(row => ({
        messageId: row.message_id,
        emailAccountId: row.email_account_id,
        accessToken: row.access_token,
        refreshToken: row.refresh_token
      }));

    // Delete from database
    const result = await query(
      `DELETE FROM emails WHERE id = ANY($1) AND user_id = $2`,
      [emailIds, userId]
    );

    return {
      deletedCount: result.rowCount || 0,
      gmailEmails
    };
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(userId: string, emailAccountId?: string): Promise<any> {
    const conditions = ['user_id = $1'];
    const params: any[] = [userId];

    if (emailAccountId) {
      conditions.push('email_account_id = $2');
      params.push(emailAccountId);
    }

    const result = await query(
      `SELECT category, COUNT(*) as count
       FROM emails
       WHERE ${conditions.join(' AND ')}
       GROUP BY category`,
      params
    );

    return result.rows;
  }

  /**
   * Format email row from database
   */
  private formatEmail(row: any): any {
    // Parse JSON fields if they're strings
    const parseJsonField = (field: any, defaultValue: any = []) => {
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          // If it's the scores object, convert string numbers to actual numbers
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            Object.keys(parsed).forEach(key => {
              if (typeof parsed[key] === 'string' && !isNaN(parseFloat(parsed[key]))) {
                parsed[key] = parseFloat(parsed[key]);
              }
            });
          }
          return parsed;
        } catch (e) {
          return field;
        }
      }
      return field || defaultValue;
    };

    // Map category to iOS-compatible values
    const mapCategory = (category: string | null): string => {
      const validCategories = ['Work', 'Personal', 'Me-related', 'Finance', 'Social', 'Promotions', 'Updates', 'Other'];
      if (!category || !validCategories.includes(category)) {
        return 'Other';
      }
      return category;
    };

    // Format from as a string for frontend
    const fromString = row.from_name
      ? `${row.from_name} <${row.from_email}>`
      : row.from_email;

    // Format to as a string (take first recipient for compatibility)
    const toEmails = parseJsonField(row.to_emails, []);
    const toString = toEmails.length > 0
      ? (toEmails[0].name ? `${toEmails[0].name} <${toEmails[0].email}>` : toEmails[0].email)
      : '';

    return {
      id: row.id,
      messageId: row.message_id || row.id,
      threadId: row.thread_id || null, // Gmail's native thread ID for conversation grouping
      emailAccountId: row.email_account_id,
      from: fromString,
      to: toString,
      cc: parseJsonField(row.cc_emails),
      bcc: parseJsonField(row.bcc_emails),
      replyTo: parseJsonField(row.reply_to_emails),
      subject: row.subject,
      body: row.body,
      textBody: row.body, // Alias for frontend
      htmlBody: row.html_body || null,
      date: row.date,
      receivedAt: row.date,
      createdAt: row.created_at,
      isRead: row.is_read,
      isStarred: row.is_starred || false,
      hasAttachments: row.has_attachments,
      hasAttachment: row.has_attachments, // Alias
      attachments: [],
      ai_summary: row.ai_summary,
      summary: row.ai_summary, // Alias for frontend compatibility
      category: mapCategory(row.category),
      importance: row.importance?.toLowerCase() || 'normal',
      isMeRelated: row.is_personally_relevant,
      is_personally_relevant: row.is_personally_relevant,
      badges: parseJsonField(row.badges, []),
      scores: parseJsonField(row.scores, null),
      master_importance_score: row.master_importance_score ? parseFloat(row.master_importance_score) : null,
      companyName: row.company_name,
      companyDomain: row.company_domain,
      companyLogoUrl: row.company_logo_url,
      // NEW: Enhanced AI features (camelCase for frontend)
      isAboutMe: row.is_about_me || false,
      mentionContext: row.mention_context || null,
      htmlSnippet: row.html_snippet || null,
      renderAsHtml: row.render_as_html || false,
      // NEW: AI-powered reply assistance
      isAnswerable: row.is_answerable || false,
      responseUrgency: row.response_urgency || 'none',
      suggestedReplies: parseJsonField(row.suggested_replies, []),
      extractedActions: parseJsonField(row.extracted_actions, []),
      // Snooze and Archive features
      snoozedUntil: row.snoozed_until || null,
      isArchived: row.is_archived || false
    };
  }

  /**
   * Get badge statistics with usage counts
   * Includes display_order and hasCustomOrder flag for proper ordering
   */
  async getBadgeStats(userId: string, category?: string, emailAccountId?: string): Promise<any> {
    // Get custom order flag from users table
    const flagResult = await query(
      `SELECT COALESCE(has_custom_badge_order, false) as has_custom_order FROM users WHERE id = $1`,
      [userId]
    );
    const hasCustomOrder = flagResult.rows[0]?.has_custom_order || false;

    // Get actual email counts for each badge with display_order
    let queryText = `
      SELECT
        ubd.badge_name,
        ubd.badge_color,
        ubd.badge_icon,
        ubd.category,
        ubd.display_order,
        COUNT(DISTINCT eb.email_id) as email_count,
        ubd.last_used_at
      FROM user_badge_definitions ubd
      LEFT JOIN email_badges eb ON eb.badge_name = ubd.badge_name
      LEFT JOIN emails e ON e.id = eb.email_id AND e.user_id = $1
      WHERE ubd.user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    // Filter by email account if specified
    if (emailAccountId) {
      queryText += ` AND e.email_account_id = $${paramIndex}`;
      params.push(emailAccountId);
      paramIndex++;
    }

    if (category) {
      queryText += ` AND ubd.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    queryText += ` GROUP BY ubd.badge_name, ubd.badge_color, ubd.badge_icon, ubd.category, ubd.display_order, ubd.last_used_at`;

    // Order by display_order if custom order is enabled, otherwise by email count
    if (hasCustomOrder) {
      queryText += ` ORDER BY ubd.display_order ASC, email_count DESC`;
    } else {
      queryText += ` ORDER BY email_count DESC, ubd.last_used_at DESC`;
    }

    const result = await query(queryText, params);

    return {
      hasCustomOrder,
      badges: result.rows.map(row => ({
        name: row.badge_name,
        color: row.badge_color,
        icon: row.badge_icon,
        category: row.category,
        displayOrder: row.display_order,
        count: parseInt(row.email_count),
        lastUsedAt: row.last_used_at
      }))
    };
  }

  /**
   * Get badge category statistics (email counts per category)
   */
  async getBadgeCategoryStats(userId: string): Promise<any> {
    const result = await query(
      `SELECT
         ubd.category,
         COUNT(DISTINCT eb.email_id) as email_count,
         COUNT(DISTINCT ubd.badge_name) as badge_count,
         SUM(ubd.usage_count) as total_usage
       FROM user_badge_definitions ubd
       LEFT JOIN email_badges eb ON eb.badge_name = ubd.badge_name
       LEFT JOIN emails e ON e.id = eb.email_id AND e.user_id = ubd.user_id
       WHERE ubd.user_id = $1 AND ubd.category IS NOT NULL
       GROUP BY ubd.category
       ORDER BY email_count DESC, total_usage DESC`,
      [userId]
    );

    return {
      categories: result.rows.map(row => ({
        name: row.category,
        emailCount: parseInt(row.email_count) || 0,
        badgeCount: parseInt(row.badge_count),
        totalUsage: parseInt(row.total_usage)
      }))
    };
  }

  /**
   * Get AI analysis progress
   */
  async getAnalysisProgress(userId: string): Promise<{ analyzed: number, total: number }> {
    const result = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN ai_summary IS NOT NULL THEN 1 END) as analyzed
       FROM emails
       WHERE user_id = $1`,
      [userId]
    );

    return {
      total: parseInt(result.rows[0].total),
      analyzed: parseInt(result.rows[0].analyzed)
    };
  }

  /**
   * Snooze an email until a specific time
   */
  async snoozeEmail(emailId: string, userId: string, snoozeUntil: Date): Promise<void> {
    await query(
      `UPDATE emails SET snoozed_until = $1 WHERE id = $2 AND user_id = $3`,
      [snoozeUntil, emailId, userId]
    );
    logger.info(`Snoozed email ${emailId} until ${snoozeUntil.toISOString()}`);
  }

  /**
   * Unsnooze an email (remove snooze time)
   */
  async unsnoozeEmail(emailId: string, userId: string): Promise<void> {
    await query(
      `UPDATE emails SET snoozed_until = NULL WHERE id = $1 AND user_id = $2`,
      [emailId, userId]
    );
    logger.info(`Unsnoozed email ${emailId}`);
  }

  /**
   * Get snoozed emails that should be unsnoozed (snooze time has passed)
   */
  async getExpiredSnoozes(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM emails
       WHERE user_id = $1
         AND snoozed_until IS NOT NULL
         AND snoozed_until <= NOW()`,
      [userId]
    );
    return result.rows.map(this.formatEmail);
  }

  /**
   * Get all currently snoozed emails
   */
  async getSnoozedEmails(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM emails
       WHERE user_id = $1
         AND snoozed_until IS NOT NULL
         AND snoozed_until > NOW()
       ORDER BY snoozed_until ASC`,
      [userId]
    );
    return result.rows.map(this.formatEmail);
  }

  /**
   * Archive an email
   */
  async archiveEmail(emailId: string, userId: string): Promise<void> {
    await query(
      `UPDATE emails SET is_archived = TRUE WHERE id = $1 AND user_id = $2`,
      [emailId, userId]
    );
    logger.info(`Archived email ${emailId}`);

    // Sync archive status to provider (Gmail uses a label system)
    try {
      await this.syncArchiveStatusToProvider(emailId, userId, true);
    } catch (error) {
      logger.error(`Failed to sync archive status to provider for email ${emailId}:`, error);
    }
  }

  /**
   * Unarchive an email
   */
  async unarchiveEmail(emailId: string, userId: string): Promise<void> {
    await query(
      `UPDATE emails SET is_archived = FALSE WHERE id = $1 AND user_id = $2`,
      [emailId, userId]
    );
    logger.info(`Unarchived email ${emailId}`);

    try {
      await this.syncArchiveStatusToProvider(emailId, userId, false);
    } catch (error) {
      logger.error(`Failed to sync unarchive status to provider for email ${emailId}:`, error);
    }
  }

  /**
   * Get archived emails
   */
  async getArchivedEmails(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await query(
      `SELECT * FROM emails
       WHERE user_id = $1 AND is_archived = TRUE
       ORDER BY date DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows.map(this.formatEmail);
  }

  /**
   * Bulk archive emails
   */
  async bulkArchiveEmails(emailIds: string[], userId: string): Promise<number> {
    const result = await query(
      `UPDATE emails SET is_archived = TRUE
       WHERE id = ANY($1) AND user_id = $2`,
      [emailIds, userId]
    );

    // Sync to provider for each email
    for (const emailId of emailIds) {
      try {
        await this.syncArchiveStatusToProvider(emailId, userId, true);
      } catch (error) {
        logger.error(`Failed to sync archive to provider for email ${emailId}:`, error);
      }
    }

    return result.rowCount || 0;
  }

  /**
   * Soft delete email (move to trash)
   */
  async trashEmail(emailId: string, userId: string): Promise<void> {
    await query(
      `UPDATE emails SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1 AND user_id = $2`,
      [emailId, userId]
    );
    logger.info(`Moved email ${emailId} to trash`);

    // Optionally sync to provider (Gmail has a trash function)
    try {
      await this.syncTrashStatusToProvider(emailId, userId, true);
    } catch (error) {
      logger.error(`Failed to sync trash status to provider for email ${emailId}:`, error);
    }
  }

  /**
   * Restore email from trash
   */
  async restoreEmail(emailId: string, userId: string): Promise<void> {
    await query(
      `UPDATE emails SET is_deleted = FALSE, deleted_at = NULL WHERE id = $1 AND user_id = $2`,
      [emailId, userId]
    );
    logger.info(`Restored email ${emailId} from trash`);

    try {
      await this.syncTrashStatusToProvider(emailId, userId, false);
    } catch (error) {
      logger.error(`Failed to sync restore status to provider for email ${emailId}:`, error);
    }
  }

  /**
   * Get deleted/trashed emails
   */
  async getDeletedEmails(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await query(
      `SELECT * FROM emails
       WHERE user_id = $1 AND is_deleted = TRUE
       ORDER BY deleted_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows.map(this.formatEmail);
  }

  /**
   * Sync trash status to email provider
   */
  private async syncTrashStatusToProvider(emailId: string, userId: string, isTrashed: boolean): Promise<void> {
    const result = await query(
      `SELECT e.message_id, e.provider_type, e.email_account_id,
              ea.access_token, ea.refresh_token
       FROM emails e
       LEFT JOIN email_accounts ea ON e.email_account_id = ea.id
       WHERE e.id = $1 AND e.user_id = $2`,
      [emailId, userId]
    );

    if (result.rows.length === 0) return;

    const email = result.rows[0];

    if (email.provider_type === 'gmail' && email.access_token) {
      const { GmailService } = await import('./gmail.service');
      const gmailService = new GmailService({
        accessToken: email.access_token,
        refreshToken: email.refresh_token,
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        accountId: email.email_account_id
      });

      try {
        if (isTrashed) {
          await gmailService.trashEmail(email.message_id);
        } else {
          await gmailService.untrashEmail(email.message_id);
        }
        logger.info(`Synced trash status to Gmail for email ${emailId}`);
      } catch (error) {
        logger.error(`Gmail trash sync failed for email ${emailId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Sync archive status to email provider (Gmail removes INBOX label for archive)
   */
  private async syncArchiveStatusToProvider(emailId: string, userId: string, isArchived: boolean): Promise<void> {
    const result = await query(
      `SELECT e.message_id, e.provider_type, e.email_account_id,
              ea.access_token, ea.refresh_token
       FROM emails e
       LEFT JOIN email_accounts ea ON e.email_account_id = ea.id
       WHERE e.id = $1 AND e.user_id = $2`,
      [emailId, userId]
    );

    if (result.rows.length === 0) return;

    const email = result.rows[0];

    if (email.provider_type === 'gmail' && email.access_token) {
      const { GmailService } = await import('./gmail.service');
      const gmailService = new GmailService({
        accessToken: email.access_token,
        refreshToken: email.refresh_token,
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        accountId: email.email_account_id
      });

      try {
        if (isArchived) {
          // Gmail archive = remove INBOX label
          await gmailService.removeLabel(email.message_id, 'INBOX');
        } else {
          // Unarchive = add INBOX label back
          await gmailService.addLabel(email.message_id, 'INBOX');
        }
        logger.info(`Synced archive status to Gmail for email ${emailId}`);
      } catch (error) {
        logger.error(`Gmail archive sync failed for email ${emailId}:`, error);
        throw error;
      }
    }
  }
}
