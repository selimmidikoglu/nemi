import { query, getClient } from '../config/database';
import { logger } from '../config/logger';

interface EngagementEvent {
  userId: string;
  emailId: string | null;
  eventType: string;
  eventData: any;
}

interface ViewSession {
  sessionId: string;
  userId: string;
  emailId: string;
  openedAt: Date;
  closedAt: Date;
  durationSeconds: number;
  linkClicksCount: number;
}

interface BadgeEngagementMetric {
  badge_name: string;
  total_emails_with_badge: number;
  emails_opened: number;
  emails_with_clicks: number;
  total_time_spent_seconds: number;
  avg_time_spent_seconds: number;
  total_link_clicks: number;
  open_rate: number;
  click_rate: number;
  engagement_score: number;
  last_interaction_at: Date | null;
}

interface UserReadingStats {
  total_emails_opened: number;
  total_reading_time_seconds: number;
  avg_reading_time_seconds: number;
  total_link_clicks: number;
  click_rate: number;
  most_active_hour: number;
  most_active_day: string;
}

export class EngagementService {
  /**
   * Record a user engagement event
   */
  async recordEvent(event: EngagementEvent): Promise<void> {
    try {
      await query(
        `INSERT INTO email_engagement_events (user_id, email_id, event_type, event_data, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [event.userId, event.emailId, event.eventType, JSON.stringify(event.eventData)]
      );

      logger.info(`Recorded ${event.eventType} event for user ${event.userId}`);
    } catch (error) {
      logger.error('Error recording engagement event:', error);
      throw error;
    }
  }

  /**
   * Save an email view session
   */
  async saveViewSession(session: ViewSession): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Save view session (let database generate UUID)
      await client.query(
        `INSERT INTO email_view_sessions (
          user_id, email_id, opened_at, closed_at,
          duration_seconds, link_clicks_count, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          session.userId,
          session.emailId,
          session.openedAt,
          session.closedAt,
          session.durationSeconds,
          session.linkClicksCount
        ]
      );

      // Get badges associated with this email
      const badgesResult = await client.query(
        `SELECT DISTINCT badge_name
         FROM email_badges
         WHERE email_id = $1`,
        [session.emailId]
      );

      // Refresh engagement metrics for each badge
      for (const row of badgesResult.rows) {
        await client.query(
          `SELECT refresh_badge_engagement_metrics($1, $2)`,
          [session.userId, row.badge_name]
        );
      }

      await client.query('COMMIT');

      logger.info(`Saved view session ${session.sessionId}, duration: ${session.durationSeconds}s`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error saving view session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get badge engagement metrics for a user
   */
  async getBadgeEngagementMetrics(userId: string): Promise<BadgeEngagementMetric[]> {
    try {
      const result = await query(
        `SELECT
          bem.badge_name,
          bem.total_emails_with_badge,
          bem.emails_opened,
          bem.emails_with_clicks,
          bem.total_time_spent_seconds,
          bem.avg_time_spent_seconds,
          bem.total_link_clicks,
          bem.open_rate,
          bem.click_rate,
          bem.engagement_score,
          bem.last_interaction_at,
          ubd.badge_color,
          ubd.badge_icon,
          ubd.category,
          ubd.display_order
         FROM badge_engagement_metrics bem
         JOIN user_badge_definitions ubd
           ON ubd.user_id = bem.user_id AND ubd.badge_name = bem.badge_name
         WHERE bem.user_id = $1
         ORDER BY ubd.display_order ASC, bem.engagement_score DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting badge engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Get top engaged badges for a user
   */
  async getTopEngagedBadges(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await query(
        `SELECT * FROM get_top_engaged_badges($1, $2)`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting top engaged badges:', error);
      throw error;
    }
  }

  /**
   * Refresh badge engagement metrics for a user
   * If badgeName is provided, only refresh that badge
   * Otherwise, refresh all badges
   */
  async refreshBadgeMetrics(userId: string, badgeName?: string): Promise<void> {
    try {
      if (badgeName) {
        // Refresh single badge
        await query(
          `SELECT refresh_badge_engagement_metrics($1, $2)`,
          [userId, badgeName]
        );
        logger.info(`Refreshed metrics for badge ${badgeName}, user ${userId}`);
      } else {
        // Refresh all badges for user
        const badgesResult = await query(
          `SELECT DISTINCT badge_name FROM user_badge_definitions WHERE user_id = $1`,
          [userId]
        );

        for (const row of badgesResult.rows) {
          await query(
            `SELECT refresh_badge_engagement_metrics($1, $2)`,
            [userId, row.badge_name]
          );
        }

        logger.info(`Refreshed all badge metrics for user ${userId}`);
      }
    } catch (error) {
      logger.error('Error refreshing badge metrics:', error);
      throw error;
    }
  }

  /**
   * Get user's reading statistics
   */
  async getUserReadingStats(userId: string): Promise<UserReadingStats> {
    try {
      // Total emails opened and reading time
      const totalsResult = await query(
        `SELECT
          COUNT(*) as total_emails_opened,
          COALESCE(SUM(duration_seconds), 0) as total_reading_time_seconds,
          COALESCE(AVG(duration_seconds), 0) as avg_reading_time_seconds,
          COALESCE(SUM(link_clicks_count), 0) as total_link_clicks
         FROM email_view_sessions
         WHERE user_id = $1 AND closed_at IS NOT NULL`,
        [userId]
      );

      const totals = totalsResult.rows[0];

      // Calculate click rate
      const clickRate = totals.total_emails_opened > 0
        ? (totals.total_link_clicks / totals.total_emails_opened)
        : 0;

      // Most active hour (0-23)
      const hourResult = await query(
        `SELECT EXTRACT(HOUR FROM opened_at)::INTEGER as hour, COUNT(*) as count
         FROM email_view_sessions
         WHERE user_id = $1
         GROUP BY hour
         ORDER BY count DESC
         LIMIT 1`,
        [userId]
      );

      const mostActiveHour = hourResult.rows.length > 0 ? hourResult.rows[0].hour : 9;

      // Most active day of week (0=Sunday, 6=Saturday)
      const dayResult = await query(
        `SELECT
           CASE EXTRACT(DOW FROM opened_at)::INTEGER
             WHEN 0 THEN 'Sunday'
             WHEN 1 THEN 'Monday'
             WHEN 2 THEN 'Tuesday'
             WHEN 3 THEN 'Wednesday'
             WHEN 4 THEN 'Thursday'
             WHEN 5 THEN 'Friday'
             WHEN 6 THEN 'Saturday'
           END as day,
           COUNT(*) as count
         FROM email_view_sessions
         WHERE user_id = $1
         GROUP BY day
         ORDER BY count DESC
         LIMIT 1`,
        [userId]
      );

      const mostActiveDay = dayResult.rows.length > 0 ? dayResult.rows[0].day : 'Monday';

      return {
        total_emails_opened: parseInt(totals.total_emails_opened),
        total_reading_time_seconds: parseInt(totals.total_reading_time_seconds),
        avg_reading_time_seconds: parseFloat(totals.avg_reading_time_seconds),
        total_link_clicks: parseInt(totals.total_link_clicks),
        click_rate: clickRate,
        most_active_hour: mostActiveHour,
        most_active_day: mostActiveDay
      };
    } catch (error) {
      logger.error('Error getting user reading stats:', error);
      throw error;
    }
  }

  /**
   * Get emails with personalized importance scores
   * This combines master_importance_score with badge engagement scores
   */
  async getPersonalizedEmailScores(userId: string, emailIds: string[]): Promise<Map<string, number>> {
    try {
      const result = await query(
        `SELECT
          e.id as email_id,
          (
            COALESCE(e.master_importance_score, 0.5) * 0.3 +
            COALESCE(AVG(bem.engagement_score * eb.importance_score), 0.5) * 0.7
          ) as personalized_score
         FROM emails e
         LEFT JOIN email_badges eb ON eb.email_id = e.id
         LEFT JOIN badge_engagement_metrics bem
           ON bem.user_id = e.user_id AND bem.badge_name = eb.badge_name
         WHERE e.id = ANY($1) AND e.user_id = $2
         GROUP BY e.id, e.master_importance_score`,
        [emailIds, userId]
      );

      const scores = new Map<string, number>();
      result.rows.forEach(row => {
        scores.set(row.email_id, parseFloat(row.personalized_score));
      });

      return scores;
    } catch (error) {
      logger.error('Error getting personalized email scores:', error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific badge with optional date range
   */
  async getBadgeAnalytics(
    userId: string,
    badgeName: string,
    range: '7d' | '30d' | '90d' | 'all'
  ): Promise<any | null> {
    try {
      // Calculate date threshold based on range
      let dateThreshold: string | null = null;
      if (range !== 'all') {
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        dateThreshold = `NOW() - INTERVAL '${days} days'`;
      }

      // Get badge metrics with optional date filtering
      const metricsQuery = dateThreshold
        ? `SELECT
            ubd.badge_name,
            ubd.badge_color,
            ubd.category,
            COUNT(DISTINCT e.id) as total_emails_with_badge,
            COUNT(DISTINCT CASE WHEN evs.id IS NOT NULL THEN e.id END) as emails_opened,
            COUNT(DISTINCT CASE WHEN evs.link_clicks_count > 0 THEN e.id END) as emails_with_clicks,
            COALESCE(SUM(evs.duration_seconds), 0) as total_time_spent_seconds,
            COALESCE(AVG(evs.duration_seconds), 0) as avg_time_spent_seconds,
            COALESCE(SUM(evs.link_clicks_count), 0) as total_link_clicks,
            CASE WHEN COUNT(DISTINCT e.id) > 0
              THEN COUNT(DISTINCT CASE WHEN evs.id IS NOT NULL THEN e.id END)::FLOAT / COUNT(DISTINCT e.id)
              ELSE 0
            END as open_rate,
            CASE WHEN COUNT(DISTINCT CASE WHEN evs.id IS NOT NULL THEN e.id END) > 0
              THEN COUNT(DISTINCT CASE WHEN evs.link_clicks_count > 0 THEN e.id END)::FLOAT / COUNT(DISTINCT CASE WHEN evs.id IS NOT NULL THEN e.id END)
              ELSE 0
            END as click_rate,
            MAX(evs.opened_at) as last_interaction_at
           FROM user_badge_definitions ubd
           LEFT JOIN email_badges eb ON eb.badge_name = ubd.badge_name
           LEFT JOIN emails e ON e.id = eb.email_id AND e.user_id = ubd.user_id AND e.received_at >= ${dateThreshold}
           LEFT JOIN email_view_sessions evs ON evs.email_id = e.id AND evs.user_id = e.user_id
           WHERE ubd.user_id = $1 AND ubd.badge_name = $2
           GROUP BY ubd.badge_name, ubd.badge_color, ubd.category`
        : `SELECT
            bem.badge_name,
            ubd.badge_color,
            ubd.category,
            bem.total_emails_with_badge,
            bem.emails_opened,
            bem.emails_with_clicks,
            bem.total_time_spent_seconds,
            bem.avg_time_spent_seconds,
            bem.total_link_clicks,
            bem.open_rate,
            bem.click_rate,
            bem.last_interaction_at
           FROM badge_engagement_metrics bem
           JOIN user_badge_definitions ubd
             ON ubd.user_id = bem.user_id AND ubd.badge_name = bem.badge_name
           WHERE bem.user_id = $1 AND bem.badge_name = $2`;

      const result = await query(metricsQuery, [userId, badgeName]);

      if (result.rows.length === 0) {
        return null;
      }

      const metrics = result.rows[0];

      // Calculate engagement score
      const engagement_score =
        (metrics.open_rate * 0.4 +
         metrics.click_rate * 0.3 +
         Math.min(metrics.avg_time_spent_seconds / 300, 1) * 0.3);

      return {
        badge_name: metrics.badge_name,
        badge_color: metrics.badge_color,
        category: metrics.category,
        total_emails_with_badge: parseInt(metrics.total_emails_with_badge),
        emails_opened: parseInt(metrics.emails_opened),
        emails_with_clicks: parseInt(metrics.emails_with_clicks),
        total_time_spent_seconds: parseInt(metrics.total_time_spent_seconds),
        avg_time_spent_seconds: parseFloat(metrics.avg_time_spent_seconds),
        total_link_clicks: parseInt(metrics.total_link_clicks),
        open_rate: parseFloat(metrics.open_rate),
        click_rate: parseFloat(metrics.click_rate),
        engagement_score: parseFloat(engagement_score.toFixed(2)),
        last_interaction_at: metrics.last_interaction_at
      };
    } catch (error) {
      logger.error('Error getting badge analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics overview across all badges
   */
  async getAnalyticsOverview(userId: string): Promise<any> {
    try {
      // Get all badges with their metrics (using badge definitions as primary source)
      // Left join with engagement metrics so we show all badges even without engagement data
      const badgesResult = await query(
        `SELECT
          ubd.badge_name,
          ubd.badge_color,
          ubd.category,
          ubd.usage_count as total_emails,
          COALESCE(bem.emails_opened, 0) as emails_opened,
          COALESCE(bem.emails_with_clicks, 0) as emails_with_clicks,
          COALESCE(bem.total_time_spent_seconds, 0) as total_time_spent_seconds,
          COALESCE(bem.avg_time_spent_seconds, 0) as avg_time_spent_seconds,
          COALESCE(bem.total_link_clicks, 0) as total_link_clicks,
          COALESCE(bem.open_rate, 0) as open_rate,
          COALESCE(bem.click_rate, 0) as click_rate,
          COALESCE(bem.engagement_score, 0) as engagement_score,
          bem.last_interaction_at
         FROM user_badge_definitions ubd
         LEFT JOIN badge_engagement_metrics bem
           ON ubd.user_id = bem.user_id AND ubd.badge_name = bem.badge_name
         WHERE ubd.user_id = $1 AND ubd.usage_count > 0
         ORDER BY ubd.usage_count DESC`,
        [userId]
      );

      // Generate heatmap data for last 12 weeks (84 days)
      const heatmapResult = await query(
        `WITH date_series AS (
          SELECT
            date::DATE as activity_date,
            EXTRACT(DOW FROM date)::INTEGER as day_of_week,
            (CURRENT_DATE - date::DATE) / 7 as week_number
          FROM generate_series(
            CURRENT_DATE - INTERVAL '83 days',
            CURRENT_DATE,
            '1 day'::INTERVAL
          ) AS date
        )
        SELECT
          ds.activity_date::TEXT as date,
          ds.day_of_week as day,
          ds.week_number as week,
          COUNT(DISTINCT evs.email_id) as count
        FROM date_series ds
        LEFT JOIN email_view_sessions evs
          ON evs.user_id = $1
          AND DATE(evs.opened_at) = ds.activity_date
        GROUP BY ds.activity_date, ds.day_of_week, ds.week_number
        ORDER BY ds.activity_date`,
        [userId]
      );

      return {
        badges: badgesResult.rows.map(row => ({
          name: row.badge_name,
          color: row.badge_color,
          category: row.category,
          totalEmails: parseInt(row.total_emails) || 0,
          timeSpent: parseInt(row.total_time_spent_seconds) || 0,
          openRate: parseFloat(row.open_rate) || 0,
          engagementScore: parseFloat(row.engagement_score) || 0
        })),
        heatmap: heatmapResult.rows.map(row => ({
          date: row.date,
          day: parseInt(row.day),
          week: parseInt(row.week),
          count: parseInt(row.count)
        }))
      };
    } catch (error) {
      logger.error('Error getting analytics overview:', error);
      throw error;
    }
  }
}
