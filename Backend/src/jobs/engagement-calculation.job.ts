import cron from 'node-cron';
import { pool } from '../config/database';
import { logger } from '../config/logger';

/**
 * Engagement Calculation Background Job
 * Runs every 5 minutes to refresh badge engagement metrics
 * for users who have recent activity
 */
export class EngagementCalculationJob {
  private isRunning: boolean = false;
  private intervalMinutes: number = 5;

  constructor() {
    this.intervalMinutes = parseInt(process.env.ENGAGEMENT_CALC_INTERVAL_MINUTES || '5', 10);
  }

  /**
   * Start the cron job
   */
  start(): void {
    // For 5 minutes: */5 * * * *
    const cronPattern = `*/${this.intervalMinutes} * * * *`;

    cron.schedule(cronPattern, async () => {
      if (this.isRunning) {
        logger.warn('Engagement calculation job is already running, skipping this iteration');
        return;
      }

      this.isRunning = true;

      try {
        await this.refreshEngagementMetrics();
      } catch (error) {
        logger.error('Error in engagement calculation job:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info(`Engagement calculation job scheduled (every ${this.intervalMinutes} minutes)`);

    // Run immediately on startup after a delay
    setTimeout(() => {
      logger.info('Running initial engagement metrics calculation');
      this.refreshEngagementMetrics().catch(error => {
        logger.error('Error in initial engagement calculation:', error);
      });
    }, 15000); // Wait 15 seconds after startup
  }

  /**
   * Refresh engagement metrics for users with recent activity
   */
  private async refreshEngagementMetrics(): Promise<void> {
    try {
      // Find users who have view sessions in the last hour
      const recentUsersResult = await pool.query(
        `SELECT DISTINCT user_id
         FROM email_view_sessions
         WHERE created_at > NOW() - INTERVAL '1 hour'
           OR closed_at > NOW() - INTERVAL '1 hour'`
      );

      if (recentUsersResult.rows.length === 0) {
        logger.debug('No users with recent activity for engagement calculation');
        return;
      }

      logger.info(`Refreshing engagement metrics for ${recentUsersResult.rows.length} active users`);

      let totalBadgesRefreshed = 0;

      // For each active user, refresh all their badge metrics
      for (const userRow of recentUsersResult.rows) {
        const userId = userRow.user_id;

        try {
          // Get all badges for this user
          const badgesResult = await pool.query(
            `SELECT DISTINCT badge_name
             FROM user_badge_definitions
             WHERE user_id = $1`,
            [userId]
          );

          // Refresh metrics for each badge
          for (const badgeRow of badgesResult.rows) {
            await pool.query(
              `SELECT refresh_badge_engagement_metrics($1, $2)`,
              [userId, badgeRow.badge_name]
            );
            totalBadgesRefreshed++;
          }

          logger.debug(`Refreshed ${badgesResult.rows.length} badges for user ${userId}`);
        } catch (error) {
          logger.error(`Error refreshing metrics for user ${userId}:`, error);
          // Continue with next user
        }
      }

      logger.info(`Engagement metrics refreshed: ${totalBadgesRefreshed} badges across ${recentUsersResult.rows.length} users`);
    } catch (error) {
      logger.error('Error in refreshEngagementMetrics:', error);
      throw error;
    }
  }

  /**
   * Clean up old view sessions (keep last 90 days)
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      const result = await pool.query(
        `DELETE FROM email_view_sessions
         WHERE created_at < NOW() - INTERVAL '90 days'`
      );

      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} old view sessions`);
      }
    } catch (error) {
      logger.error('Error cleaning up old sessions:', error);
    }
  }

  /**
   * Clean up old engagement events (keep last 90 days)
   */
  private async cleanupOldEvents(): Promise<void> {
    try {
      const result = await pool.query(
        `DELETE FROM email_engagement_events
         WHERE created_at < NOW() - INTERVAL '90 days'`
      );

      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} old engagement events`);
      }
    } catch (error) {
      logger.error('Error cleaning up old events:', error);
    }
  }

  /**
   * Run daily maintenance tasks
   */
  startDailyMaintenance(): void {
    // Run at 3 AM every day: 0 3 * * *
    cron.schedule('0 3 * * *', async () => {
      logger.info('Running daily engagement data maintenance');

      try {
        await this.cleanupOldSessions();
        await this.cleanupOldEvents();

        // Refresh all badge metrics for all users (full recalculation)
        const allUsersResult = await pool.query(
          `SELECT DISTINCT user_id FROM user_badge_definitions`
        );

        logger.info(`Running full metric recalculation for ${allUsersResult.rows.length} users`);

        for (const userRow of allUsersResult.rows) {
          const userId = userRow.user_id;

          const badgesResult = await pool.query(
            `SELECT DISTINCT badge_name FROM user_badge_definitions WHERE user_id = $1`,
            [userId]
          );

          for (const badgeRow of badgesResult.rows) {
            await pool.query(
              `SELECT refresh_badge_engagement_metrics($1, $2)`,
              [userId, badgeRow.badge_name]
            );
          }
        }

        logger.info('Daily maintenance completed successfully');
      } catch (error) {
        logger.error('Error in daily maintenance:', error);
      }
    });

    logger.info('Daily maintenance job scheduled (3 AM every day)');
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<any> {
    try {
      const stats = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM email_view_sessions) as total_sessions,
          (SELECT COUNT(*) FROM email_engagement_events) as total_events,
          (SELECT COUNT(*) FROM badge_engagement_metrics) as total_badge_metrics,
          (SELECT COUNT(DISTINCT user_id) FROM email_view_sessions) as active_users,
          (SELECT COUNT(*) FROM email_view_sessions WHERE created_at > NOW() - INTERVAL '24 hours') as sessions_last_24h,
          (SELECT AVG(duration_seconds) FROM email_view_sessions WHERE closed_at IS NOT NULL) as avg_session_duration
        `
      );

      return stats.rows[0];
    } catch (error) {
      logger.error('Error getting job stats:', error);
      return null;
    }
  }
}
