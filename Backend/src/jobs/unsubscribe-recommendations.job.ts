import cron from 'node-cron';
import { pool } from '../config/database';
import { logger } from '../config/logger';
import { unsubscribeService } from '../services/unsubscribe.service';

/**
 * Unsubscribe Recommendations Background Job
 * Runs daily to generate unsubscribe recommendations for users
 * based on their email engagement patterns
 */
export class UnsubscribeRecommendationsJob {
  private isRunning: boolean = false;

  /**
   * Start the cron job - runs at 2 AM daily
   */
  start(): void {
    // Run at 2 AM every day: 0 2 * * *
    cron.schedule('0 2 * * *', async () => {
      if (this.isRunning) {
        logger.warn('Unsubscribe recommendations job is already running, skipping');
        return;
      }

      this.isRunning = true;

      try {
        await this.generateAllRecommendations();
      } catch (error) {
        logger.error('Error in unsubscribe recommendations job:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Unsubscribe recommendations job scheduled (2 AM daily)');
  }

  /**
   * Generate recommendations for all users with enabled settings
   */
  private async generateAllRecommendations(): Promise<void> {
    try {
      logger.info('Starting daily unsubscribe recommendations generation');

      // Get all users with recommendations enabled (or users without settings - use defaults)
      const usersResult = await pool.query(
        `SELECT DISTINCT u.id as user_id
         FROM users u
         LEFT JOIN user_unsubscribe_settings uss ON u.id = uss.user_id
         WHERE uss.enabled = TRUE OR uss.user_id IS NULL`
      );

      if (usersResult.rows.length === 0) {
        logger.info('No users eligible for unsubscribe recommendations');
        return;
      }

      logger.info(`Generating recommendations for ${usersResult.rows.length} users`);

      let totalRecommendations = 0;
      let usersProcessed = 0;

      for (const userRow of usersResult.rows) {
        try {
          const count = await unsubscribeService.generateRecommendations(userRow.user_id);
          totalRecommendations += count;
          usersProcessed++;

          if (count > 0) {
            logger.debug(`Generated ${count} recommendations for user ${userRow.user_id}`);
          }
        } catch (error) {
          logger.error(`Error generating recommendations for user ${userRow.user_id}:`, error);
          // Continue with next user
        }
      }

      logger.info(`Unsubscribe recommendations complete: ${totalRecommendations} recommendations for ${usersProcessed} users`);
    } catch (error) {
      logger.error('Error in generateAllRecommendations:', error);
      throw error;
    }
  }

  /**
   * Run recommendations generation manually (for testing or on-demand)
   */
  async runNow(): Promise<{ totalRecommendations: number; usersProcessed: number }> {
    if (this.isRunning) {
      throw new Error('Job is already running');
    }

    this.isRunning = true;

    try {
      const usersResult = await pool.query(
        `SELECT DISTINCT u.id as user_id
         FROM users u
         LEFT JOIN user_unsubscribe_settings uss ON u.id = uss.user_id
         WHERE uss.enabled = TRUE OR uss.user_id IS NULL`
      );

      let totalRecommendations = 0;
      let usersProcessed = 0;

      for (const userRow of usersResult.rows) {
        try {
          const count = await unsubscribeService.generateRecommendations(userRow.user_id);
          totalRecommendations += count;
          usersProcessed++;
        } catch (error) {
          logger.error(`Error generating recommendations for user ${userRow.user_id}:`, error);
        }
      }

      return { totalRecommendations, usersProcessed };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Generate recommendations for a single user
   */
  async generateForUser(userId: string): Promise<number> {
    return unsubscribeService.generateRecommendations(userId);
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<any> {
    try {
      const stats = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM sender_engagement_metrics) as total_sender_metrics,
          (SELECT COUNT(*) FROM sender_engagement_metrics WHERE has_unsubscribe_option = TRUE) as senders_with_unsubscribe,
          (SELECT COUNT(*) FROM unsubscribe_recommendations) as total_recommendations,
          (SELECT COUNT(*) FROM unsubscribe_recommendations WHERE status = 'pending') as pending_recommendations,
          (SELECT COUNT(*) FROM unsubscribe_recommendations WHERE status = 'unsubscribed') as unsubscribed_count,
          (SELECT COUNT(*) FROM unsubscribe_recommendations WHERE status = 'dismissed') as dismissed_count,
          (SELECT COUNT(DISTINCT user_id) FROM user_unsubscribe_settings WHERE enabled = TRUE) as users_with_enabled_settings,
          (SELECT AVG(recommendation_score) FROM unsubscribe_recommendations WHERE status = 'pending') as avg_recommendation_score
        `
      );

      return stats.rows[0];
    } catch (error) {
      logger.error('Error getting unsubscribe job stats:', error);
      return null;
    }
  }
}
