import { Request, Response, NextFunction } from 'express';
import { BadgeService } from '../services/badge.service';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';

export class BadgeController {
  private badgeService: BadgeService;

  constructor() {
    this.badgeService = new BadgeService();
  }

  /**
   * Get user's badge definitions with engagement metrics and custom order flag
   */
  getUserBadges = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      logger.info(`Getting badges for user ${userId}`);

      const { badges, hasCustomOrder } = await this.badgeService.getUserBadges(userId);

      res.json({
        userId,
        badges,
        hasCustomOrder
      });
    } catch (error) {
      logger.error('Get user badges error:', error);
      next(error);
    }
  };

  /**
   * Update badge display order
   */
  updateBadgeOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { badge_order } = req.body;

      // Validate badge_order is an array of {badge_name, order}
      if (!Array.isArray(badge_order)) {
        res.status(400).json({ error: 'badge_order must be an array' });
        return;
      }

      for (const item of badge_order) {
        if (!item.badge_name || typeof item.order !== 'number') {
          res.status(400).json({ error: 'Each item must have badge_name and order' });
          return;
        }
      }

      logger.info(`Updating badge order for user ${userId}, ${badge_order.length} badges`);

      await this.badgeService.updateBadgeOrder(userId, badge_order);

      res.json({
        success: true,
        message: 'Badge order updated successfully'
      });
    } catch (error) {
      logger.error('Update badge order error:', error);
      next(error);
    }
  };

  /**
   * Update user's badge display mode (horizontal or bottom)
   */
  updateBadgeDisplayMode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { display_mode } = req.body;

      // Validate display_mode
      if (!['horizontal', 'bottom'].includes(display_mode)) {
        res.status(400).json({ error: 'display_mode must be "horizontal" or "bottom"' });
        return;
      }

      logger.info(`Updating badge display mode for user ${userId} to ${display_mode}`);

      await this.badgeService.updateBadgeDisplayMode(userId, display_mode);

      res.json({
        success: true,
        message: 'Badge display mode updated successfully',
        display_mode
      });
    } catch (error) {
      logger.error('Update badge display mode error:', error);
      next(error);
    }
  };

  /**
   * Get unique badge categories for a user
   */
  getBadgeCategories = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      logger.info(`Getting badge categories for user ${userId}`);

      const categories = await this.badgeService.getBadgeCategories(userId);

      res.json({
        userId,
        categories
      });
    } catch (error) {
      logger.error('Get badge categories error:', error);
      next(error);
    }
  };

  /**
   * Delete a badge definition (and remove from all emails)
   */
  deleteBadge = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { badge_name } = req.params;

      logger.info(`Deleting badge ${badge_name} for user ${userId}`);

      await this.badgeService.deleteBadge(userId, badge_name);

      res.json({
        success: true,
        message: `Badge "${badge_name}" deleted successfully`
      });
    } catch (error) {
      logger.error('Delete badge error:', error);
      next(error);
    }
  };

  /**
   * Manually create or update a badge definition
   */
  upsertBadge = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { badge_name, badge_color, badge_icon, category } = req.body;

      // Validate required fields
      if (!badge_name) {
        res.status(400).json({ error: 'badge_name is required' });
        return;
      }

      logger.info(`Upserting badge ${badge_name} for user ${userId}`);

      await this.badgeService.upsertBadge(userId, {
        badgeName: badge_name,
        badgeColor: badge_color || '#007AFF',
        badgeIcon: badge_icon || 'tag.fill',
        category: category || 'Other'
      });

      res.json({
        success: true,
        message: `Badge "${badge_name}" saved successfully`
      });
    } catch (error) {
      logger.error('Upsert badge error:', error);
      next(error);
    }
  };

  /**
   * Get analytics for a specific badge
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

      const analytics = await this.badgeService.getBadgeAnalytics(
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
   * Reset badge order to default (sorted by email count)
   */
  resetBadgeOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      logger.info(`Resetting badge order to default for user ${userId}`);

      await this.badgeService.resetBadgeOrder(userId);

      // Return updated badges with flag
      const { badges, hasCustomOrder } = await this.badgeService.getUserBadges(userId);

      res.json({
        success: true,
        message: 'Badge order reset to default (sorted by email count)',
        badges,
        hasCustomOrder
      });
    } catch (error) {
      logger.error('Reset badge order error:', error);
      next(error);
    }
  };
}
