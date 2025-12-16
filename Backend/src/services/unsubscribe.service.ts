import { query } from '../config/database';
import { logger } from '../config/logger';
import axios from 'axios';

export interface UnsubscribeSettings {
  enabled: boolean;
  timeRangeDays: number;
  minEmailsThreshold: number;
  maxOpenRateThreshold: number;
  showNotificationBadge: boolean;
  lastNotifiedAt: Date | null;
  // New: Days without opening to consider sender "inactive" (user configurable)
  inactiveDaysThreshold: number;
}

export interface SenderMetrics {
  id: string;
  senderEmail: string;
  senderName: string | null;
  companyName: string | null;
  totalEmails: number;
  emailsOpened: number;
  openRate: number;
  avgTimeSpentSeconds: number;
  engagementScore: number;
  firstEmailAt: Date;
  lastEmailAt: Date;
  lastOpenedAt: Date | null;
  hasUnsubscribeOption: boolean;
  unsubscribeUrl: string | null;
  unsubscribeEmail: string | null;
  isUnsubscribed: boolean;
}

export interface UnsubscribeRecommendation {
  id: string;
  senderEmail: string;
  senderName: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  totalEmails: number;
  emailsOpened: number;
  openRate: number;
  daysSinceLastOpen: number;
  recommendationScore: number;
  unsubscribeUrl: string | null;
  unsubscribeEmail: string | null;
  status: 'pending' | 'dismissed' | 'unsubscribed';
  createdAt: Date;
}

export interface UnsubscribeResult {
  senderEmail: string;
  success: boolean;
  method: 'url' | 'email' | 'none';
  error?: string;
}

class UnsubscribeService {
  /**
   * Get user's unsubscribe settings (or defaults)
   */
  async getSettings(userId: string): Promise<UnsubscribeSettings> {
    const result = await query(
      `SELECT * FROM user_unsubscribe_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults
      return {
        enabled: true,
        timeRangeDays: 30,
        minEmailsThreshold: 5,
        maxOpenRateThreshold: 0.10,
        showNotificationBadge: true,
        lastNotifiedAt: null,
        inactiveDaysThreshold: 14 // Default: 2 weeks without opening = inactive
      };
    }

    const row = result.rows[0];
    return {
      enabled: row.enabled,
      timeRangeDays: row.time_range_days,
      minEmailsThreshold: row.min_emails_threshold,
      maxOpenRateThreshold: parseFloat(row.max_open_rate_threshold),
      showNotificationBadge: row.show_notification_badge,
      lastNotifiedAt: row.last_notified_at,
      inactiveDaysThreshold: row.inactive_days_threshold || 14
    };
  }

  /**
   * Update user's unsubscribe settings
   */
  async updateSettings(userId: string, settings: Partial<UnsubscribeSettings>): Promise<void> {
    const updates: string[] = [];
    const columns: string[] = ['user_id'];
    const insertValues: string[] = ['$1'];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (settings.enabled !== undefined) {
      columns.push('enabled');
      insertValues.push(`$${paramIndex}`);
      updates.push(`enabled = $${paramIndex++}`);
      values.push(settings.enabled);
    }
    if (settings.timeRangeDays !== undefined) {
      columns.push('time_range_days');
      insertValues.push(`$${paramIndex}`);
      updates.push(`time_range_days = $${paramIndex++}`);
      values.push(settings.timeRangeDays);
    }
    if (settings.minEmailsThreshold !== undefined) {
      columns.push('min_emails_threshold');
      insertValues.push(`$${paramIndex}`);
      updates.push(`min_emails_threshold = $${paramIndex++}`);
      values.push(settings.minEmailsThreshold);
    }
    if (settings.maxOpenRateThreshold !== undefined) {
      columns.push('max_open_rate_threshold');
      insertValues.push(`$${paramIndex}`);
      updates.push(`max_open_rate_threshold = $${paramIndex++}`);
      values.push(settings.maxOpenRateThreshold);
    }
    if (settings.showNotificationBadge !== undefined) {
      columns.push('show_notification_badge');
      insertValues.push(`$${paramIndex}`);
      updates.push(`show_notification_badge = $${paramIndex++}`);
      values.push(settings.showNotificationBadge);
    }
    if (settings.inactiveDaysThreshold !== undefined) {
      columns.push('inactive_days_threshold');
      insertValues.push(`$${paramIndex}`);
      updates.push(`inactive_days_threshold = $${paramIndex++}`);
      values.push(settings.inactiveDaysThreshold);
    }

    // If no settings to update, just ensure the row exists with defaults
    if (updates.length === 0) {
      await query(
        `INSERT INTO user_unsubscribe_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      return;
    }

    updates.push(`updated_at = NOW()`);

    await query(
      `INSERT INTO user_unsubscribe_settings (${columns.join(', ')})
       VALUES (${insertValues.join(', ')})
       ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}`,
      values
    );

    logger.info(`Updated unsubscribe settings for user ${userId}`);
  }

  /**
   * Get pending unsubscribe recommendations for a user
   */
  async getPendingRecommendations(userId: string): Promise<UnsubscribeRecommendation[]> {
    // Join with emails to get company logo URLs
    const result = await query(
      `SELECT
        ur.*,
        (
          SELECT company_logo_url
          FROM emails e
          WHERE e.user_id = ur.user_id
            AND LOWER(e.from_email) = LOWER(ur.sender_email)
            AND e.company_logo_url IS NOT NULL
          ORDER BY e.date DESC
          LIMIT 1
        ) as company_logo_url
       FROM unsubscribe_recommendations ur
       WHERE ur.user_id = $1 AND ur.status = 'pending'
       ORDER BY ur.recommendation_score DESC`,
      [userId]
    );

    return result.rows.map(this.formatRecommendation);
  }

  /**
   * Get count of pending recommendations (for notification badge)
   */
  async getRecommendationCount(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count FROM unsubscribe_recommendations
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );

    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Generate recommendations for a user (uses database function)
   */
  async generateRecommendations(userId: string): Promise<number> {
    const result = await query(
      `SELECT generate_unsubscribe_recommendations($1) as count`,
      [userId]
    );

    const count = result.rows[0]?.count || 0;
    logger.info(`Generated ${count} unsubscribe recommendations for user ${userId}`);
    return count;
  }

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(userId: string, senderEmail: string): Promise<void> {
    await query(
      `UPDATE unsubscribe_recommendations
       SET status = 'dismissed', dismissed_at = NOW()
       WHERE user_id = $1 AND sender_email = $2`,
      [userId, senderEmail.toLowerCase()]
    );

    logger.info(`Dismissed recommendation for ${senderEmail} for user ${userId}`);
  }

  /**
   * Execute unsubscribe for a single sender
   */
  async unsubscribe(userId: string, senderEmail: string): Promise<UnsubscribeResult> {
    const normalizedEmail = senderEmail.toLowerCase();

    // Get sender metrics to find unsubscribe method
    const metricsResult = await query(
      `SELECT unsubscribe_url, unsubscribe_email
       FROM sender_engagement_metrics
       WHERE user_id = $1 AND sender_email = $2`,
      [userId, normalizedEmail]
    );

    if (metricsResult.rows.length === 0) {
      return {
        senderEmail: normalizedEmail,
        success: false,
        method: 'none',
        error: 'Sender not found'
      };
    }

    const { unsubscribe_url, unsubscribe_email } = metricsResult.rows[0];

    let success = false;
    let method: 'url' | 'email' | 'none' = 'none';
    let error: string | undefined;

    // Try URL method first (preferred - one-click unsubscribe)
    if (unsubscribe_url) {
      try {
        // Make a POST request to the unsubscribe URL
        // Many List-Unsubscribe URLs support one-click via POST
        await axios.post(unsubscribe_url, {}, {
          timeout: 10000,
          headers: {
            'User-Agent': 'NEMI-Unsubscribe/1.0',
            'List-Unsubscribe': 'One-Click'
          },
          validateStatus: (status) => status < 500 // Accept any non-server-error
        });

        success = true;
        method = 'url';
        logger.info(`Successfully unsubscribed from ${normalizedEmail} via URL`);
      } catch (urlError: any) {
        logger.warn(`URL unsubscribe failed for ${normalizedEmail}: ${urlError.message}`);
        // Fall through to try email method
      }
    }

    // If URL failed or not available, we can't auto-unsubscribe via email
    // (would need to send an email, which requires more setup)
    if (!success && unsubscribe_email) {
      // For now, just mark that email unsubscribe is available
      // User would need to manually send an email or we'd need email sending capability
      method = 'email';
      error = 'Email unsubscribe requires manual action. Send an email to: ' + unsubscribe_email;
    }

    if (!success && !unsubscribe_url && !unsubscribe_email) {
      error = 'No unsubscribe method available';
    }

    // Update sender metrics and recommendation status
    if (success) {
      await query(
        `UPDATE sender_engagement_metrics
         SET is_unsubscribed = TRUE, unsubscribed_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND sender_email = $2`,
        [userId, normalizedEmail]
      );

      await query(
        `UPDATE unsubscribe_recommendations
         SET status = 'unsubscribed', unsubscribed_at = NOW()
         WHERE user_id = $1 AND sender_email = $2`,
        [userId, normalizedEmail]
      );
    }

    return {
      senderEmail: normalizedEmail,
      success,
      method,
      error
    };
  }

  /**
   * Bulk unsubscribe from multiple senders
   */
  async bulkUnsubscribe(userId: string, senderEmails: string[]): Promise<UnsubscribeResult[]> {
    const results: UnsubscribeResult[] = [];

    for (const senderEmail of senderEmails) {
      const result = await this.unsubscribe(userId, senderEmail);
      results.push(result);
    }

    return results;
  }

  /**
   * Get all sender metrics for a user
   */
  async getSenderMetrics(userId: string, limit: number = 50, offset: number = 0): Promise<SenderMetrics[]> {
    const result = await query(
      `SELECT * FROM sender_engagement_metrics
       WHERE user_id = $1
       ORDER BY total_emails DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(this.formatSenderMetrics);
  }

  /**
   * Get low-engagement senders (for preview/analysis)
   */
  async getLowEngagementSenders(userId: string): Promise<SenderMetrics[]> {
    const settings = await this.getSettings(userId);

    const result = await query(
      `SELECT * FROM sender_engagement_metrics
       WHERE user_id = $1
         AND total_emails >= $2
         AND open_rate <= $3
         AND is_unsubscribed = FALSE
         AND has_unsubscribe_option = TRUE
       ORDER BY open_rate ASC, total_emails DESC
       LIMIT 20`,
      [userId, settings.minEmailsThreshold, settings.maxOpenRateThreshold]
    );

    return result.rows.map(this.formatSenderMetrics);
  }

  /**
   * Record when user opens an email (updates sender metrics)
   */
  async recordEmailOpen(userId: string, emailId: string, durationSeconds: number = 0): Promise<void> {
    // Use the database function
    await query(
      `SELECT record_sender_email_open($1, $2, $3)`,
      [userId, emailId, durationSeconds]
    );
  }

  /**
   * Update sender metrics when a new email is synced
   * Note: This is also handled by a database trigger, but can be called explicitly
   */
  async updateSenderMetricsFromEmail(
    userId: string,
    senderEmail: string,
    senderName: string | null,
    companyName: string | null,
    emailDate: Date,
    unsubscribeUrl: string | null,
    unsubscribeEmail: string | null
  ): Promise<void> {
    const normalizedEmail = senderEmail.toLowerCase();
    const hasUnsubscribe = !!(unsubscribeUrl || unsubscribeEmail);

    await query(
      `INSERT INTO sender_engagement_metrics (
        user_id, sender_email, sender_name, company_name,
        total_emails, first_email_at, last_email_at,
        has_unsubscribe_option, unsubscribe_url, unsubscribe_email
      ) VALUES ($1, $2, $3, $4, 1, $5, $5, $6, $7, $8)
       ON CONFLICT (user_id, sender_email) DO UPDATE SET
        total_emails = sender_engagement_metrics.total_emails + 1,
        sender_name = COALESCE(EXCLUDED.sender_name, sender_engagement_metrics.sender_name),
        company_name = COALESCE(EXCLUDED.company_name, sender_engagement_metrics.company_name),
        last_email_at = GREATEST(sender_engagement_metrics.last_email_at, EXCLUDED.last_email_at),
        first_email_at = LEAST(sender_engagement_metrics.first_email_at, EXCLUDED.first_email_at),
        has_unsubscribe_option = EXCLUDED.has_unsubscribe_option OR sender_engagement_metrics.has_unsubscribe_option,
        unsubscribe_url = COALESCE(EXCLUDED.unsubscribe_url, sender_engagement_metrics.unsubscribe_url),
        unsubscribe_email = COALESCE(EXCLUDED.unsubscribe_email, sender_engagement_metrics.unsubscribe_email),
        open_rate = CASE
          WHEN sender_engagement_metrics.total_emails + 1 > 0
          THEN sender_engagement_metrics.emails_opened::DECIMAL / (sender_engagement_metrics.total_emails + 1)
          ELSE 0
        END,
        updated_at = NOW()`,
      [userId, normalizedEmail, senderName, companyName, emailDate, hasUnsubscribe, unsubscribeUrl, unsubscribeEmail]
    );
  }

  // Format helpers
  private formatRecommendation(row: any): UnsubscribeRecommendation {
    return {
      id: row.id,
      senderEmail: row.sender_email,
      senderName: row.sender_name,
      companyName: row.company_name,
      companyLogoUrl: row.company_logo_url || null,
      totalEmails: row.total_emails,
      emailsOpened: row.emails_opened,
      openRate: parseFloat(row.open_rate || '0'),
      daysSinceLastOpen: row.days_since_last_open,
      recommendationScore: parseFloat(row.recommendation_score || '0'),
      unsubscribeUrl: row.unsubscribe_url,
      unsubscribeEmail: row.unsubscribe_email,
      status: row.status,
      createdAt: row.created_at
    };
  }

  private formatSenderMetrics(row: any): SenderMetrics {
    return {
      id: row.id,
      senderEmail: row.sender_email,
      senderName: row.sender_name,
      companyName: row.company_name,
      totalEmails: row.total_emails,
      emailsOpened: row.emails_opened,
      openRate: parseFloat(row.open_rate || '0'),
      avgTimeSpentSeconds: parseFloat(row.avg_time_spent_seconds || '0'),
      engagementScore: parseFloat(row.engagement_score || '0'),
      firstEmailAt: row.first_email_at,
      lastEmailAt: row.last_email_at,
      lastOpenedAt: row.last_opened_at,
      hasUnsubscribeOption: row.has_unsubscribe_option,
      unsubscribeUrl: row.unsubscribe_url,
      unsubscribeEmail: row.unsubscribe_email,
      isUnsubscribed: row.is_unsubscribed
    };
  }
}

export const unsubscribeService = new UnsubscribeService();
