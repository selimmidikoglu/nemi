import { Request, Response, NextFunction } from 'express';
import { EngagementService } from '../services/engagement.service';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';

export class AnalyticsController {
  private engagementService: EngagementService;

  constructor() {
    this.engagementService = new EngagementService();
  }

  /**
   * Record a user engagement event (opened, closed, link_clicked, badge_filtered)
   */
  recordEngagementEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { email_id, event_type, event_data } = req.body;

      logger.info(`Recording engagement event: ${event_type} for user ${userId}`);

      await this.engagementService.recordEvent({
        userId,
        emailId: email_id || null,
        eventType: event_type,
        eventData: event_data || {}
      });

      res.status(201).json({
        success: true,
        message: 'Event recorded successfully'
      });
    } catch (error) {
      logger.error('Record engagement event error:', error);
      next(error);
    }
  };

  /**
   * Save an email view session (when user closes an email)
   */
  saveViewSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const {
        session_id,
        email_id,
        opened_at,
        closed_at,
        duration_seconds,
        link_clicks_count
      } = req.body;

      logger.info(`Saving view session ${session_id} for user ${userId}, duration: ${duration_seconds}s`);

      await this.engagementService.saveViewSession({
        sessionId: session_id,
        userId,
        emailId: email_id,
        openedAt: new Date(opened_at),
        closedAt: new Date(closed_at),
        durationSeconds: duration_seconds,
        linkClicksCount: link_clicks_count
      });

      res.status(201).json({
        success: true,
        message: 'View session saved successfully'
      });
    } catch (error) {
      logger.error('Save view session error:', error);
      next(error);
    }
  };

  /**
   * Get badge engagement metrics for a user
   */
  getBadgeEngagementMetrics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.userId!;

      // Ensure user can only access their own metrics
      if (userId !== req.userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      logger.info(`Getting badge engagement metrics for user ${userId}`);

      const metrics = await this.engagementService.getBadgeEngagementMetrics(userId);

      res.json({
        userId,
        metrics
      });
    } catch (error) {
      logger.error('Get badge engagement metrics error:', error);
      next(error);
    }
  };

  /**
   * Get top engaged badges for a user
   */
  getTopEngagedBadges = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const limit = Number(req.query.limit) || 10;

      logger.info(`Getting top ${limit} engaged badges for user ${userId}`);

      const topBadges = await this.engagementService.getTopEngagedBadges(userId, limit);

      res.json({
        userId,
        topBadges
      });
    } catch (error) {
      logger.error('Get top engaged badges error:', error);
      next(error);
    }
  };

  /**
   * Manually trigger badge engagement metrics refresh for a user
   */
  refreshBadgeMetrics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { badge_name } = req.body;

      logger.info(`Refreshing badge metrics for user ${userId}${badge_name ? `, badge: ${badge_name}` : ''}`);

      await this.engagementService.refreshBadgeMetrics(userId, badge_name);

      res.json({
        success: true,
        message: badge_name
          ? `Metrics refreshed for badge: ${badge_name}`
          : 'All badge metrics refreshed'
      });
    } catch (error) {
      logger.error('Refresh badge metrics error:', error);
      next(error);
    }
  };

  /**
   * Get user's reading statistics
   */
  getUserReadingStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      logger.info(`Getting reading stats for user ${userId}`);

      const stats = await this.engagementService.getUserReadingStats(userId);

      res.json({
        userId,
        stats
      });
    } catch (error) {
      logger.error('Get user reading stats error:', error);
      next(error);
    }
  };

  /**
   * Get analytics for a specific badge
   * GET /api/badges/:badge_name/analytics?range=30d
   */
  getBadgeAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { badge_name } = req.params;
      const { range } = req.query;

      // Validate range parameter
      const validRanges = ['7d', '30d', '90d', 'all'];
      const dateRange = (range as string) || '30d';

      if (!validRanges.includes(dateRange)) {
        res.status(400).json({ error: 'Invalid range. Must be one of: 7d, 30d, 90d, all' });
        return;
      }

      logger.info(`Getting analytics for badge ${badge_name}, user ${userId}, range ${dateRange}`);

      const analytics = await this.engagementService.getBadgeAnalytics(
        userId,
        decodeURIComponent(badge_name),
        dateRange as '7d' | '30d' | '90d' | 'all'
      );

      if (!analytics) {
        res.status(404).json({ error: 'Badge not found' });
        return;
      }

      res.json(analytics);
    } catch (error) {
      logger.error('Get badge analytics error:', error);
      next(error);
    }
  };

  /**
   * Get analytics overview across all badges
   * GET /api/analytics/overview
   */
  getAnalyticsOverview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      logger.info(`Getting analytics overview for user ${userId}`);

      const overview = await this.engagementService.getAnalyticsOverview(userId);

      res.json(overview);
    } catch (error) {
      logger.error('Get analytics overview error:', error);
      next(error);
    }
  };
}
