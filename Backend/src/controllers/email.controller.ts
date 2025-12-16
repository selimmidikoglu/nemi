import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service';
import { AIService } from '../services/ai.service';
import { SmtpService } from '../services/smtp.service';
import { ReplyAutocomplete } from '../../../AI/services/replyAutocomplete';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';
import { query as dbQuery } from '../config/database';
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
   * Send an email (new or reply)
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
}
