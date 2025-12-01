import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service';
import { AIService } from '../services/ai.service';
import { SmtpService } from '../services/smtp.service';
import { ReplyAutocomplete } from '../../../AI/services/replyAutocomplete';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';
import { query as dbQuery } from '../config/database';
import { decrypt } from '../utils/encryption';

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
        badgeName
      } = req.query;

      const filters: any = { userId };

      if (category) filters.category = category;
      if (isRead !== undefined) filters.isRead = isRead === 'true';
      if (isStarred !== undefined) filters.isStarred = isStarred === 'true';
      if (isPersonallyRelevant !== undefined) {
        filters.isPersonallyRelevant = isPersonallyRelevant === 'true';
      }
      if (search) filters.search = search;
      if (badgeName) filters.badgeName = badgeName;

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
            clientSecret: process.env.GMAIL_CLIENT_SECRET || ''
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

      const stats = await this.emailService.getCategoryStats(userId);

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
      const { category } = req.query;

      const stats = await this.emailService.getBadgeStats(userId, category as string | undefined);

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

      // Get email account details
      const accountResult = await dbQuery(
        `SELECT email_address, account_name, provider, imap_host, imap_port, imap_secure, password
         FROM email_accounts
         WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [emailAccountId, userId]
      );

      if (accountResult.rows.length === 0) {
        res.status(404).json({ error: 'Email account not found or inactive' });
        return;
      }

      const account = accountResult.rows[0];
      const decryptedPassword = decrypt(account.password);

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

      // Get the original email's message-id for threading (if replying)
      let references: string[] | undefined;
      if (inReplyTo) {
        const originalEmailResult = await dbQuery(
          `SELECT provider_email_id FROM emails WHERE id = $1 AND user_id = $2`,
          [inReplyTo, userId]
        );

        if (originalEmailResult.rows.length > 0) {
          references = [originalEmailResult.rows[0].provider_email_id];
        }
      }

      // Send email
      const result = await smtpService.sendEmail({
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
        inReplyTo: inReplyTo ? `<${inReplyTo}>` : undefined,
        references
      });

      // Disconnect
      await smtpService.disconnect();

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
}
