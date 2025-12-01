import { query, getClient } from '../config/database';
import { logger } from '../config/logger';
import { EngagementService } from './engagement.service';

interface Badge {
  badge_name: string;
  badge_color: string;
  badge_icon: string;
  category: string;
  usage_count: number;
  display_order: number;
  engagement_score?: number;
}

interface BadgeOrderItem {
  badge_name: string;
  order: number;
}

interface UpsertBadgeData {
  badgeName: string;
  badgeColor: string;
  badgeIcon: string;
  category: string;
}

export class BadgeService {
  private engagementService: EngagementService;

  constructor() {
    this.engagementService = new EngagementService();
  }

  /**
   * Get user's badge definitions with engagement metrics and custom order flag
   */
  async getUserBadges(userId: string): Promise<{ badges: Badge[], hasCustomOrder: boolean }> {
    try {
      // Get badges
      const badgesResult = await query(
        `SELECT * FROM get_user_badges_ordered($1)`,
        [userId]
      );

      // Get custom order flag
      const flagResult = await query(
        `SELECT COALESCE(has_custom_badge_order, false) as has_custom_order FROM users WHERE id = $1`,
        [userId]
      );

      const hasCustomOrder = flagResult.rows[0]?.has_custom_order || false;

      return {
        badges: badgesResult.rows,
        hasCustomOrder
      };
    } catch (error) {
      logger.error('Error getting user badges:', error);
      throw error;
    }
  }

  /**
   * Update badge display order for a user
   * Also sets has_custom_badge_order flag to true
   */
  async updateBadgeOrder(userId: string, badgeOrder: BadgeOrderItem[]): Promise<void> {
    try {
      // Convert to JSONB format for the function
      const badgeOrderJson = JSON.stringify(badgeOrder);

      await query(
        `SELECT update_badge_display_order($1, $2::jsonb)`,
        [userId, badgeOrderJson]
      );

      // Set custom order flag to true
      await query(
        `UPDATE users SET has_custom_badge_order = true, updated_at = NOW() WHERE id = $1`,
        [userId]
      );

      logger.info(`Updated badge order for user ${userId} (custom order enabled)`);
    } catch (error) {
      logger.error('Error updating badge order:', error);
      throw error;
    }
  }

  /**
   * Reset badge order to default (sorted by email count)
   * Clears the has_custom_badge_order flag
   */
  async resetBadgeOrder(userId: string): Promise<void> {
    try {
      await query(
        `SELECT reset_badge_order_to_default($1)`,
        [userId]
      );

      logger.info(`Reset badge order to default for user ${userId}`);
    } catch (error) {
      logger.error('Error resetting badge order:', error);
      throw error;
    }
  }

  /**
   * Update user's badge display mode
   */
  async updateBadgeDisplayMode(userId: string, displayMode: 'horizontal' | 'bottom'): Promise<void> {
    try {
      await query(
        `UPDATE users SET badge_display_mode = $1, updated_at = NOW() WHERE id = $2`,
        [displayMode, userId]
      );

      logger.info(`Updated badge display mode to ${displayMode} for user ${userId}`);
    } catch (error) {
      logger.error('Error updating badge display mode:', error);
      throw error;
    }
  }

  /**
   * Get unique badge categories for a user
   */
  async getBadgeCategories(userId: string): Promise<string[]> {
    try {
      const result = await query(
        `SELECT DISTINCT category
         FROM user_badge_definitions
         WHERE user_id = $1 AND category IS NOT NULL
         ORDER BY category`,
        [userId]
      );

      return result.rows.map(row => row.category);
    } catch (error) {
      logger.error('Error getting badge categories:', error);
      throw error;
    }
  }

  /**
   * Delete a badge definition for a user
   * Also removes the badge from all their emails
   */
  async deleteBadge(userId: string, badgeName: string): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Delete from email_badges
      await client.query(
        `DELETE FROM email_badges
         WHERE email_id IN (SELECT id FROM emails WHERE user_id = $1)
         AND badge_name = $2`,
        [userId, badgeName]
      );

      // Delete badge engagement metrics
      await client.query(
        `DELETE FROM badge_engagement_metrics
         WHERE user_id = $1 AND badge_name = $2`,
        [userId, badgeName]
      );

      // Delete user badge definition
      await client.query(
        `DELETE FROM user_badge_definitions
         WHERE user_id = $1 AND badge_name = $2`,
        [userId, badgeName]
      );

      await client.query('COMMIT');

      logger.info(`Deleted badge ${badgeName} for user ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting badge:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create or update a badge definition
   */
  async upsertBadge(userId: string, badgeData: UpsertBadgeData): Promise<void> {
    try {
      await query(
        `INSERT INTO user_badge_definitions (
          user_id, badge_name, badge_color, badge_icon, category, usage_count
        )
        VALUES ($1, $2, $3, $4, $5, 0)
        ON CONFLICT (user_id, badge_name) DO UPDATE SET
          badge_color = EXCLUDED.badge_color,
          badge_icon = EXCLUDED.badge_icon,
          category = EXCLUDED.category,
          updated_at = NOW()`,
        [userId, badgeData.badgeName, badgeData.badgeColor, badgeData.badgeIcon, badgeData.category]
      );

      // Ensure engagement metrics exist for this badge
      await query(
        `INSERT INTO badge_engagement_metrics (user_id, badge_name)
         VALUES ($1, $2)
         ON CONFLICT (user_id, badge_name) DO NOTHING`,
        [userId, badgeData.badgeName]
      );

      logger.info(`Upserted badge ${badgeData.badgeName} for user ${userId}`);
    } catch (error) {
      logger.error('Error upserting badge:', error);
      throw error;
    }
  }

  /**
   * Get emails filtered by badge
   */
  async getEmailsByBadge(userId: string, badgeName: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const result = await query(
        `SELECT DISTINCT e.*
         FROM emails e
         JOIN email_badges eb ON eb.email_id = e.id
         WHERE e.user_id = $1 AND eb.badge_name = $2
         ORDER BY e.date DESC
         LIMIT $3 OFFSET $4`,
        [userId, badgeName, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting emails by badge:', error);
      throw error;
    }
  }

  /**
   * Get badge statistics for a user
   */
  async getBadgeStats(userId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT
          COUNT(DISTINCT badge_name) as total_badges,
          SUM(usage_count) as total_badge_uses,
          AVG(usage_count) as avg_usage_per_badge,
          COUNT(DISTINCT category) as total_categories
         FROM user_badge_definitions
         WHERE user_id = $1`,
        [userId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting badge stats:', error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific badge
   */
  async getBadgeAnalytics(
    userId: string,
    badgeName: string,
    range: '7d' | '30d' | '90d' | 'all'
  ): Promise<any | null> {
    return this.engagementService.getBadgeAnalytics(userId, badgeName, range);
  }
}
