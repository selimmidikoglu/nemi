import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service';
import { AIService } from '../services/ai.service';
import { SmtpService } from '../services/smtp.service';
import { ReplyAutocomplete } from '../../../AI/services/replyAutocomplete';
import { DeepEmailAnalyzerService } from '../services/deep-email-analyzer.service';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';
import { query as dbQuery, pool } from '../config/database';
import { decrypt } from '../utils/encryption';

/**
 * Refresh Gmail OAuth access token using refresh token
 */
async function refreshGmailAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Gmail OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json() as { error?: string; error_description?: string };
    logger.error('Failed to refresh Gmail token:', error);
    throw new Error(error.error_description || 'Failed to refresh access token');
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  return data.access_token;
}

export class EmailController {
  private emailService: EmailService;
  private aiService: AIService;
  private replyAutocomplete: ReplyAutocomplete;

  constructor() {
    this.emailService = new EmailService();
    this.aiService = new AIService();
    this.replyAutocomplete = new ReplyAutocomplete();
  }

  /**
   * Fetch emails from email provider
   */
  fetchEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { provider } = req.body;

      logger.info(`Fetching emails for user ${userId} from ${provider}`);

      // TODO: Fetch emails from email provider API (Gmail, Outlook, etc.)
      // This is a placeholder - actual implementation would use provider-specific APIs
      const emails = await this.emailService.fetchFromProvider(userId, provider);

      // Process with AI for classification and summarization
      const processedEmails = await this.aiService.processNewEmails(emails);

      // Save to database
      const savedEmails = await this.emailService.saveEmails(userId, processedEmails);

      res.json({
        count: savedEmails.length,
        emails: savedEmails
      });
    } catch (error) {
      logger.error('Fetch emails error:', error);
      next(error);
    }
  };

  /**
   * Get user's emails with filtering
   */
  getEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const {
        category,
        limit = 50,
        offset = 0,
        isRead,
        isStarred,
        isPersonallyRelevant,
        search,
        badgeName,
        emailAccountId
      } = req.query;

      const filters: any = { userId };

      if (category) filters.category = category;
      if (isRead !== undefined) filters.isRead = String(isRead) === 'true';
      if (isStarred !== undefined) {
        filters.isStarred = String(isStarred) === 'true';
      }
      if (isPersonallyRelevant !== undefined) {
        filters.isPersonallyRelevant = String(isPersonallyRelevant) === 'true';
      }
      if (search) filters.search = search;
      if (badgeName) filters.badgeName = badgeName;
      if (emailAccountId) filters.emailAccountId = emailAccountId;

      // Get total count and emails in parallel
      const [total, emails] = await Promise.all([
        this.emailService.getEmailCount(filters),
        this.emailService.getEmails(filters, Number(limit), Number(offset))
      ]);

      // Log first email to see badges
      if (emails.length > 0) {
        logger.info('Sample email response:', JSON.stringify({
          id: emails[0].id,
          subject: emails[0].subject,
          badges: emails[0].badges,
          scores: emails[0].scores
        }));
      }

      const page = Math.floor(Number(offset) / Number(limit)) + 1;

      res.json({
        emails,
        total,
        page,
        limit: Number(limit)
      });
    } catch (error) {
      logger.error('Get emails error:', error);
      next(error);
    }
  };

  /**
   * Get single email by ID
   */
  getEmailById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const email = await this.emailService.getEmailById(id, userId);

      if (!email) {
        res.status(404).json({
          error: 'Not found',
          message: 'Email not found'
        });
        return;
      }

      // Mark as read when viewed
      await this.emailService.updateReadStatus(id, userId, true);

      res.json(email);
    } catch (error) {
      logger.error('Get email by ID error:', error);
      next(error);
    }
  };

  /**
   * Classify emails using AI
   */
  classifyEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { emailIds } = req.body;

      logger.info(`Classifying ${emailIds.length} emails for user ${userId}`);

      // Get emails from database
      const emails = await this.emailService.getEmailsByIds(emailIds, userId);

      if (emails.length === 0) {
        res.status(404).json({
          error: 'Not found',
          message: 'No emails found for classification'
        });
        return;
      }

      // Classify with AI
      const classifications = await this.aiService.classifyEmails(emails);

      // Update database
      await this.emailService.updateClassifications(classifications);

      res.json({
        classified: classifications.length,
        results: classifications
      });
    } catch (error) {
      logger.error('Classify emails error:', error);
      next(error);
    }
  };

  /**
   * Update email read status
   */
  updateReadStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { isRead } = req.body;

      await this.emailService.updateReadStatus(id, userId, isRead);

      res.json({ message: 'Read status updated' });
    } catch (error) {
      logger.error('Update read status error:', error);
      next(error);
    }
  };

  /**
   * Update email star status
   */
  updateStarStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { isStarred } = req.body;

      await this.emailService.updateStarStatus(id, userId, isStarred);

      res.json({ message: 'Star status updated' });
    } catch (error) {
      logger.error('Update star status error:', error);
      next(error);
    }
  };

  /**
   * Delete email
   */
  deleteEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await this.emailService.deleteEmail(id, userId);

      res.json({ message: 'Email deleted successfully' });
    } catch (error) {
      logger.error('Delete email error:', error);
      next(error);
    }
  };

  /**
   * Bulk delete emails from database and Gmail
   */
  bulkDeleteEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { emailIds } = req.body;

      if (!Array.isArray(emailIds) || emailIds.length === 0) {
        res.status(400).json({ error: 'emailIds must be a non-empty array' });
        return;
      }

      // Delete from database and get Gmail email info
      const { deletedCount, gmailEmails } = await this.emailService.bulkDeleteEmails(emailIds.map(String), userId);

      // Delete from Gmail if applicable
      let gmailDeletedCount = 0;
      const gmailErrors: string[] = [];

      for (const email of gmailEmails) {
        try {
          const { GmailService } = await import('../services/gmail.service');
          const gmailService = new GmailService({
            accessToken: email.accessToken,
            refreshToken: email.refreshToken,
            clientId: process.env.GMAIL_CLIENT_ID || '',
            clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
            accountId: email.emailAccountId
          });

          await gmailService.trashEmail(email.messageId);
          gmailDeletedCount++;
        } catch (err: any) {
          logger.error(`Failed to delete Gmail message ${email.messageId}:`, err.message);
          gmailErrors.push(email.messageId);
        }
      }

      res.json({
        message: `Deleted ${deletedCount} emails from database, ${gmailDeletedCount} from Gmail`,
        deletedCount,
        gmailDeletedCount,
        gmailErrors: gmailErrors.length > 0 ? gmailErrors : undefined
      });
    } catch (error) {
      logger.error('Bulk delete emails error:', error);
      next(error);
    }
  };

  /**
   * Get category statistics
   */
  getCategoryStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { emailAccountId } = req.query;

      const stats = await this.emailService.getCategoryStats(userId, emailAccountId as string | undefined);

      res.json(stats);
    } catch (error) {
      logger.error('Get category stats error:', error);
      next(error);
    }
  };

  /**
   * Get badge statistics with usage counts
   */
  getBadgeStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { category, emailAccountId } = req.query;

      const stats = await this.emailService.getBadgeStats(
        userId,
        category as string | undefined,
        emailAccountId as string | undefined
      );

      res.json(stats);
    } catch (error) {
      logger.error('Get badge stats error:', error);
      next(error);
    }
  };

  /**
   * Get badge category statistics (email counts per category)
   */
  getBadgeCategoryStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      const stats = await this.emailService.getBadgeCategoryStats(userId);

      res.json(stats);
    } catch (error) {
      logger.error('Get badge category stats error:', error);
      next(error);
    }
  };

  /**
   * Get AI analysis progress
   */
  getAnalysisProgress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      const progress = await this.emailService.getAnalysisProgress(userId);

      res.json(progress);
    } catch (error) {
      logger.error('Get analysis progress error:', error);
      next(error);
    }
  };

  /**
   * Schedule an email for sending with undo capability (10 second delay)
   */
  scheduleEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const {
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        inReplyTo,
        emailAccountId,
        sendAt, // Optional: for scheduled send feature
        undoDelay = 10 // Default 10 seconds for undo
      } = req.body;

      logger.info(`Scheduling email for user ${userId} from account ${emailAccountId}`);

      // Calculate when to actually send
      const scheduledFor = sendAt
        ? new Date(sendAt)
        : new Date(Date.now() + undoDelay * 1000);

      // Save to scheduled_emails table
      const result = await dbQuery(
        `INSERT INTO scheduled_emails (
          user_id, email_account_id, to_recipients, cc_recipients, bcc_recipients,
          subject, text_body, html_body, in_reply_to, scheduled_for, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
        RETURNING id, scheduled_for`,
        [
          userId,
          emailAccountId,
          JSON.stringify(to),
          cc ? JSON.stringify(cc) : null,
          bcc ? JSON.stringify(bcc) : null,
          subject,
          text,
          html,
          inReplyTo,
          scheduledFor
        ]
      );

      const scheduledEmail = result.rows[0];

      logger.info(`Email scheduled: ${scheduledEmail.id}, will send at ${scheduledEmail.scheduled_for}`);

      res.json({
        success: true,
        scheduledEmailId: scheduledEmail.id,
        scheduledFor: scheduledEmail.scheduled_for,
        canUndoUntil: scheduledFor.toISOString(),
        message: sendAt ? 'Email scheduled successfully' : `Email will be sent in ${undoDelay} seconds`
      });
    } catch (error: any) {
      logger.error('Schedule email error:', error);
      res.status(500).json({
        error: 'Failed to schedule email',
        message: error.message || 'Unknown error'
      });
    }
  };

  /**
   * Cancel a scheduled email (undo send)
   */
  cancelScheduledEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if email exists and is still pending
      const checkResult = await dbQuery(
        `SELECT id, status, scheduled_for FROM scheduled_emails
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Scheduled email not found' });
        return;
      }

      const scheduledEmail = checkResult.rows[0];

      if (scheduledEmail.status !== 'pending') {
        res.status(400).json({
          error: 'Cannot cancel email',
          message: scheduledEmail.status === 'sent'
            ? 'Email has already been sent'
            : 'Email has already been cancelled'
        });
        return;
      }

      // Cancel the email
      await dbQuery(
        `UPDATE scheduled_emails SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      logger.info(`Scheduled email ${id} cancelled by user ${userId}`);

      res.json({
        success: true,
        message: 'Email cancelled successfully'
      });
    } catch (error: any) {
      logger.error('Cancel scheduled email error:', error);
      res.status(500).json({
        error: 'Failed to cancel email',
        message: error.message || 'Unknown error'
      });
    }
  };

  /**
   * Get pending scheduled emails
   */
  getScheduledEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      const result = await dbQuery(
        `SELECT id, email_account_id, to_recipients, subject, scheduled_for, status, created_at
         FROM scheduled_emails
         WHERE user_id = $1 AND status = 'pending' AND scheduled_for > NOW()
         ORDER BY scheduled_for ASC`,
        [userId]
      );

      res.json({
        success: true,
        scheduledEmails: result.rows.map(row => ({
          id: row.id,
          emailAccountId: row.email_account_id,
          to: JSON.parse(row.to_recipients),
          subject: row.subject,
          scheduledFor: row.scheduled_for,
          status: row.status,
          createdAt: row.created_at
        }))
      });
    } catch (error: any) {
      logger.error('Get scheduled emails error:', error);
      res.status(500).json({
        error: 'Failed to get scheduled emails',
        message: error.message || 'Unknown error'
      });
    }
  };

  /**
   * Send an email (new or reply) - immediate send without undo
   */
  sendEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const {
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        inReplyTo,
        emailAccountId
      } = req.body;

      logger.info(`Sending email for user ${userId} from account ${emailAccountId}`);

      // Get email account details including OAuth tokens
      const accountResult = await dbQuery(
        `SELECT email_address, account_name, provider, imap_host, imap_port, imap_secure, encrypted_password, access_token, refresh_token
         FROM email_accounts
         WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [emailAccountId, userId]
      );

      if (accountResult.rows.length === 0) {
        res.status(404).json({ error: 'Email account not found or inactive' });
        return;
      }

      const account = accountResult.rows[0];

      // Get the original email's message-id for threading (if replying)
      let references: string[] | undefined;
      let originalMessageId: string | undefined;
      if (inReplyTo) {
        const originalEmailResult = await dbQuery(
          `SELECT provider_email_id, message_id FROM emails WHERE id = $1 AND user_id = $2`,
          [inReplyTo, userId]
        );

        if (originalEmailResult.rows.length > 0) {
          originalMessageId = originalEmailResult.rows[0].message_id || originalEmailResult.rows[0].provider_email_id;
          references = [originalMessageId];
        }
      }

      let result: { messageId: string };

      // Handle Gmail OAuth accounts
      if (account.provider === 'gmail' && account.access_token) {
        logger.info('Sending via Gmail API with OAuth');

        // Build the email in RFC 2822 format
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2)}`;
        const toHeader = to.map((t: any) => t.name ? `${t.name} <${t.email}>` : t.email).join(', ');
        const ccHeader = cc && cc.length > 0 ? cc.map((c: any) => c.name ? `${c.name} <${c.email}>` : c.email).join(', ') : '';
        const bccHeader = bcc && bcc.length > 0 ? bcc.map((b: any) => b.name ? `${b.name} <${b.email}>` : b.email).join(', ') : '';

        let emailContent = '';
        emailContent += `From: ${account.account_name ? `${account.account_name} <${account.email_address}>` : account.email_address}\r\n`;
        emailContent += `To: ${toHeader}\r\n`;
        if (ccHeader) emailContent += `Cc: ${ccHeader}\r\n`;
        if (bccHeader) emailContent += `Bcc: ${bccHeader}\r\n`;
        emailContent += `Subject: ${subject}\r\n`;
        emailContent += `MIME-Version: 1.0\r\n`;

        if (originalMessageId) {
          emailContent += `In-Reply-To: <${originalMessageId}>\r\n`;
          emailContent += `References: <${originalMessageId}>\r\n`;
        }

        if (html) {
          emailContent += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
          emailContent += `--${boundary}\r\n`;
          emailContent += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
          emailContent += `${text || ''}\r\n`;
          emailContent += `--${boundary}\r\n`;
          emailContent += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
          emailContent += `${html}\r\n`;
          emailContent += `--${boundary}--`;
        } else {
          emailContent += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
          emailContent += text || '';
        }

        // Base64 URL-safe encode the email
        const encodedEmail = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        // Send via Gmail API
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: encodedEmail })
        });

        if (!response.ok) {
          const errorData = await response.json() as { error?: { message?: string } };
          logger.error('Gmail API error:', errorData);

          // If token expired, try to refresh and retry
          if (response.status === 401 && account.refresh_token) {
            logger.info('Access token expired, attempting refresh...');

            try {
              const newAccessToken = await refreshGmailAccessToken(account.refresh_token);
              logger.info('Successfully refreshed Gmail access token');

              // Update the token in the database
              await dbQuery(
                `UPDATE email_accounts SET access_token = $1, updated_at = NOW() WHERE id = $2`,
                [newAccessToken, emailAccountId]
              );

              // Retry sending with new token
              const retryResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${newAccessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: encodedEmail })
              });

              if (!retryResponse.ok) {
                const retryError = await retryResponse.json() as { error?: { message?: string } };
                throw new Error(retryError.error?.message || 'Failed to send after token refresh');
              }

              const retryResult = await retryResponse.json() as { id: string };
              result = { messageId: retryResult.id };

              // Skip the normal result assignment below
              logger.info(`Email sent successfully after token refresh: ${result.messageId}`);
              res.json({
                success: true,
                messageId: result.messageId,
                message: 'Email sent successfully'
              });
              return;
            } catch (refreshError: any) {
              logger.error('Failed to refresh token:', refreshError);
              throw new Error('Access token expired and refresh failed. Please reconnect your Gmail account.');
            }
          }

          throw new Error(errorData.error?.message || 'Failed to send via Gmail API');
        }

        const gmailResult = await response.json() as { id: string };
        result = { messageId: gmailResult.id };

      } else {
        // Handle IMAP/SMTP accounts with password
        if (!account.encrypted_password) {
          throw new Error('No password configured for this account. Gmail accounts require OAuth.');
        }

        const decryptedPassword = decrypt(account.encrypted_password);

        // Get SMTP config based on provider
        const smtpConfig = SmtpService.getSmtpConfig(
          account.provider,
          account.email_address,
          decryptedPassword,
          account.imap_host // Use IMAP host to infer SMTP host for custom providers
        );

        // Create SMTP service and connect
        const smtpService = new SmtpService(smtpConfig);
        await smtpService.connect();

        // Send email
        result = await smtpService.sendEmail({
          from: {
            email: account.email_address,
            name: account.account_name || undefined
          },
          to,
          cc,
          bcc,
          subject,
          text,
          html,
          inReplyTo: originalMessageId ? `<${originalMessageId}>` : undefined,
          references
        });

        // Disconnect
        await smtpService.disconnect();
      }

      logger.info(`Email sent successfully: ${result.messageId}`);

      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      });
    } catch (error: any) {
      logger.error('Send email error:', error);
      res.status(500).json({
        error: 'Failed to send email',
        message: error.message || 'Unknown error'
      });
    }
  };

  /**
   * Get AI autocomplete suggestion for reply
   */
  getAutocompleteSuggestion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentText, emailContext } = req.body;

      if (!emailContext || !emailContext.subject || !emailContext.from) {
        res.status(400).json({
          error: 'Missing required email context'
        });
        return;
      }

      logger.info('Getting autocomplete suggestion');

      const result = await this.replyAutocomplete.getAutocompleteSuggestion({
        currentText: currentText || '',
        emailContext: {
          subject: emailContext.subject,
          from: emailContext.from,
          body: emailContext.body || '',
          aiSummary: emailContext.aiSummary
        }
      });

      res.json({
        suggestion: result.suggestion,
        confidence: result.confidence
      });
    } catch (error: any) {
      logger.error('Autocomplete suggestion error:', error);
      res.status(500).json({
        error: 'Failed to get autocomplete suggestion',
        message: error.message || 'Unknown error'
      });
    }
  };

  /**
   * Snooze an email until a specific time
   */
  snoozeEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { snoozeUntil } = req.body;

      const snoozeDate = new Date(snoozeUntil);
      if (isNaN(snoozeDate.getTime())) {
        res.status(400).json({ error: 'Invalid snoozeUntil date' });
        return;
      }

      if (snoozeDate <= new Date()) {
        res.status(400).json({ error: 'Snooze time must be in the future' });
        return;
      }

      await this.emailService.snoozeEmail(id, userId, snoozeDate);

      res.json({
        message: 'Email snoozed successfully',
        snoozedUntil: snoozeDate.toISOString()
      });
    } catch (error) {
      logger.error('Snooze email error:', error);
      next(error);
    }
  };

  /**
   * Unsnooze an email
   */
  unsnoozeEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await this.emailService.unsnoozeEmail(id, userId);

      res.json({ message: 'Email unsnoozed successfully' });
    } catch (error) {
      logger.error('Unsnooze email error:', error);
      next(error);
    }
  };

  /**
   * Get snoozed emails
   */
  getSnoozedEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      const emails = await this.emailService.getSnoozedEmails(userId);

      res.json({ emails });
    } catch (error) {
      logger.error('Get snoozed emails error:', error);
      next(error);
    }
  };

  /**
   * Archive an email
   */
  archiveEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await this.emailService.archiveEmail(id, userId);

      res.json({ message: 'Email archived successfully' });
    } catch (error) {
      logger.error('Archive email error:', error);
      next(error);
    }
  };

  /**
   * Unarchive an email
   */
  unarchiveEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await this.emailService.unarchiveEmail(id, userId);

      res.json({ message: 'Email unarchived successfully' });
    } catch (error) {
      logger.error('Unarchive email error:', error);
      next(error);
    }
  };

  /**
   * Get archived emails
   */
  getArchivedEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { limit = 50, offset = 0 } = req.query;

      const emails = await this.emailService.getArchivedEmails(
        userId,
        Number(limit),
        Number(offset)
      );

      res.json({ emails });
    } catch (error) {
      logger.error('Get archived emails error:', error);
      next(error);
    }
  };

  /**
   * Bulk archive emails
   */
  bulkArchiveEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { emailIds } = req.body;

      if (!Array.isArray(emailIds) || emailIds.length === 0) {
        res.status(400).json({ error: 'emailIds must be a non-empty array' });
        return;
      }

      const archivedCount = await this.emailService.bulkArchiveEmails(emailIds, userId);

      res.json({
        message: `Archived ${archivedCount} emails`,
        archivedCount
      });
    } catch (error) {
      logger.error('Bulk archive emails error:', error);
      next(error);
    }
  };

  /**
   * Soft delete email (move to trash)
   */
  trashEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await this.emailService.trashEmail(id, userId);

      res.json({ message: 'Email moved to trash successfully' });
    } catch (error) {
      logger.error('Trash email error:', error);
      next(error);
    }
  };

  /**
   * Restore email from trash
   */
  restoreEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await this.emailService.restoreEmail(id, userId);

      res.json({ message: 'Email restored successfully' });
    } catch (error) {
      logger.error('Restore email error:', error);
      next(error);
    }
  };

  /**
   * Get deleted/trashed emails
   */
  getDeletedEmails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { limit = 50, offset = 0 } = req.query;

      const emails = await this.emailService.getDeletedEmails(
        userId,
        Number(limit),
        Number(offset)
      );

      res.json({ emails });
    } catch (error) {
      logger.error('Get deleted emails error:', error);
      next(error);
    }
  };

  /**
   * Re-analyze an email with AI (extract actions, update metadata)
   */
  reanalyzeEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      logger.info(`Re-analyzing email ${id} for user ${userId}`);

      // Get email from database
      const emailResult = await dbQuery(
        'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (emailResult.rows.length === 0) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      const email = emailResult.rows[0];

      // Create analyzer instance
      const analyzer = new DeepEmailAnalyzerService(pool);

      // Build email for analysis
      const emailForAnalysis = {
        id: email.id,
        user_id: userId,
        from_email: email.from_email,
        from_name: email.from_name,
        to_emails: typeof email.to_emails === 'string' ? JSON.parse(email.to_emails) : email.to_emails,
        cc_emails: typeof email.cc_emails === 'string' ? JSON.parse(email.cc_emails) : email.cc_emails,
        subject: email.subject,
        body: email.body || '',
        date: email.date
      };

      // Re-analyze
      const analysis = await analyzer.analyzeEmail(emailForAnalysis, userId);

      if (!analysis) {
        res.status(500).json({ error: 'AI analysis failed' });
        return;
      }

      // Get any new actions that were extracted
      const actionsResult = await dbQuery(
        'SELECT * FROM email_actions WHERE email_id = $1 ORDER BY created_at DESC',
        [id]
      );

      res.json({
        success: true,
        message: 'Email re-analyzed successfully',
        analysis: {
          summary: analysis.summary,
          badges: analysis.badges,
          scores: analysis.scores,
          extractedActions: actionsResult.rows,
          metadata: analysis.metadata
        }
      });
    } catch (error) {
      logger.error('Re-analyze email error:', error);
      next(error);
    }
  };
}
