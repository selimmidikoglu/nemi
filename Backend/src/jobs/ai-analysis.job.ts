import cron from 'node-cron';
import { pool } from '../config/database';
import { DeepEmailAnalyzerService } from '../services/deep-email-analyzer.service';
import { logger } from '../config/logger';

/**
 * AI Analysis Background Job
 * Runs every 30 seconds to analyze emails that haven't been analyzed yet
 */
export class AIAnalysisJob {
  private deepAnalyzer: DeepEmailAnalyzerService;
  private isRunning: boolean = false;
  private batchSize: number = 5; // Process 5 emails at a time
  private intervalSeconds: number = 30;

  constructor() {
    this.deepAnalyzer = new DeepEmailAnalyzerService(pool);
    this.batchSize = parseInt(process.env.AI_BATCH_SIZE || '5', 10);
    this.intervalSeconds = parseInt(process.env.AI_ANALYSIS_INTERVAL_SECONDS || '30', 10);
  }

  /**
   * Start the cron job
   */
  start(): void {
    // Convert seconds to cron pattern
    // For 30 seconds: */30 * * * * *
    const cronPattern = `*/${this.intervalSeconds} * * * * *`;

    cron.schedule(cronPattern, async () => {
      if (this.isRunning) {
        logger.warn('AI analysis job is already running, skipping this iteration');
        return;
      }

      this.isRunning = true;

      try {
        await this.processUnanalyzedEmails();
      } catch (error) {
        logger.error('Error in AI analysis job:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info(`AI analysis job scheduled (every ${this.intervalSeconds} seconds, batch size: ${this.batchSize})`);

    // Run immediately on startup after a delay
    setTimeout(() => {
      logger.info('Running initial AI analysis');
      this.processUnanalyzedEmails().catch(error => {
        logger.error('Error in initial AI analysis:', error);
      });
    }, 10000); // Wait 10 seconds after startup
  }

  /**
   * Find and process emails that need AI analysis
   */
  private async processUnanalyzedEmails(): Promise<void> {
    try {
      // Find emails that haven't been analyzed yet
      // Priority: newest emails first, but only if body is not empty
      const result = await pool.query(
        `SELECT e.id, e.user_id, e.from_email, e.from_name, e.to_emails, e.cc_emails,
                e.subject, e.body, e.date
         FROM emails e
         WHERE e.ai_analyzed_at IS NULL
           AND LENGTH(e.body) > 50
           AND e.created_at > NOW() - INTERVAL '7 days'
         ORDER BY e.date DESC
         LIMIT $1`,
        [this.batchSize]
      );

      if (result.rows.length === 0) {
        logger.debug('No emails need AI analysis');
        return;
      }

      logger.info(`Found ${result.rows.length} emails to analyze`);

      // Group emails by user for better context
      const emailsByUser = this.groupEmailsByUser(result.rows);

      // Process each user's emails
      for (const [userId, emails] of Object.entries(emailsByUser)) {
        logger.info(`Analyzing ${emails.length} emails for user ${userId}`);

        for (const email of emails) {
          try {
            await this.deepAnalyzer.analyzeEmail(email, userId);

            // Small delay to avoid rate limiting
            await this.delay(500);
          } catch (error: any) {
            logger.error(`Failed to analyze email ${email.id}:`, error.message);

            // Mark as analyzed (with error) to avoid infinite retries
            await this.markAnalysisFailed(email.id, error.message);
          }
        }
      }

      logger.info(`AI analysis batch completed: ${result.rows.length} emails processed`);
    } catch (error) {
      logger.error('Error processing unanalyzed emails:', error);
      throw error;
    }
  }

  /**
   * Group emails by user_id for better context
   */
  private groupEmailsByUser(emails: any[]): Record<string, any[]> {
    return emails.reduce((acc, email) => {
      const userId = email.user_id;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(email);
      return acc;
    }, {} as Record<string, any[]>);
  }

  /**
   * Mark email analysis as failed to avoid infinite retries
   */
  private async markAnalysisFailed(emailId: string, errorMessage: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE emails
         SET ai_analyzed_at = NOW(),
             ai_raw_response = $1
         WHERE id = $2`,
        [JSON.stringify({ error: errorMessage, failed_at: new Date().toISOString() }), emailId]
      );

      logger.info(`Marked email ${emailId} as failed analysis`);
    } catch (error) {
      logger.error(`Failed to mark email ${emailId} as failed:`, error);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get job statistics
   */
  async getStatistics(): Promise<{
    total_emails: number;
    analyzed_emails: number;
    pending_emails: number;
    failed_emails: number;
    success_rate: number;
  }> {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) as total_emails,
          COUNT(CASE WHEN ai_analyzed_at IS NOT NULL THEN 1 END) as analyzed_emails,
          COUNT(CASE WHEN ai_analyzed_at IS NULL THEN 1 END) as pending_emails,
          COUNT(CASE WHEN ai_raw_response::text LIKE '%error%' THEN 1 END) as failed_emails
        FROM emails
        WHERE created_at > NOW() - INTERVAL '7 days'
      `);

      const row = result.rows[0];
      const successRate = row.total_emails > 0
        ? ((row.analyzed_emails - row.failed_emails) / row.total_emails * 100).toFixed(2)
        : 0;

      return {
        total_emails: parseInt(row.total_emails),
        analyzed_emails: parseInt(row.analyzed_emails),
        pending_emails: parseInt(row.pending_emails),
        failed_emails: parseInt(row.failed_emails),
        success_rate: parseFloat(successRate as string)
      };
    } catch (error) {
      logger.error('Error getting AI job statistics:', error);
      return {
        total_emails: 0,
        analyzed_emails: 0,
        pending_emails: 0,
        failed_emails: 0,
        success_rate: 0
      };
    }
  }

  /**
   * Manually trigger analysis for specific email
   */
  async analyzeEmailById(emailId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT e.id, e.user_id, e.from_email, e.from_name, e.to_emails,
                e.subject, e.body, e.date
         FROM emails e
         WHERE e.id = $1`,
        [emailId]
      );

      if (result.rows.length === 0) {
        logger.error(`Email ${emailId} not found`);
        return false;
      }

      const email = result.rows[0];
      const analysis = await this.deepAnalyzer.analyzeEmail(email, email.user_id);

      return analysis !== null;
    } catch (error) {
      logger.error(`Failed to analyze email ${emailId}:`, error);
      return false;
    }
  }

  /**
   * Reanalyze all emails for a user (useful for testing new prompts)
   */
  async reanalyzeUserEmails(userId: string, limit: number = 10): Promise<number> {
    try {
      logger.info(`Reanalyzing up to ${limit} emails for user ${userId}`);

      const result = await pool.query(
        `SELECT e.id, e.user_id, e.from_email, e.from_name, e.to_emails,
                e.subject, e.body, e.date
         FROM emails e
         WHERE e.user_id = $1
           AND LENGTH(e.body) > 50
         ORDER BY e.date DESC
         LIMIT $2`,
        [userId, limit]
      );

      if (result.rows.length === 0) {
        logger.info(`No emails found for user ${userId}`);
        return 0;
      }

      let successCount = 0;

      for (const email of result.rows) {
        try {
          const analysis = await this.deepAnalyzer.analyzeEmail(email, userId);
          if (analysis) {
            successCount++;
          }

          // Delay to avoid rate limiting
          await this.delay(1000);
        } catch (error: any) {
          logger.error(`Failed to reanalyze email ${email.id}:`, error.message);
        }
      }

      logger.info(`Reanalysis complete: ${successCount}/${result.rows.length} successful`);
      return successCount;
    } catch (error) {
      logger.error('Error reanalyzing user emails:', error);
      return 0;
    }
  }
}
