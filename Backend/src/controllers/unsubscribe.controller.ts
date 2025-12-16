import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { unsubscribeService } from '../services/unsubscribe.service';
import { logger } from '../config/logger';

class UnsubscribeController {
  /**
   * Get user's unsubscribe settings
   */
  getSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const settings = await unsubscribeService.getSettings(userId);
      res.json(settings);
    } catch (error) {
      logger.error('Get unsubscribe settings error:', error);
      next(error);
    }
  };

  /**
   * Update user's unsubscribe settings
   */
  updateSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const settings = req.body;

      await unsubscribeService.updateSettings(userId, settings);
      const updated = await unsubscribeService.getSettings(userId);

      res.json(updated);
    } catch (error) {
      logger.error('Update unsubscribe settings error:', error);
      next(error);
    }
  };

  /**
   * Get pending unsubscribe recommendations
   */
  getRecommendations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const recommendations = await unsubscribeService.getPendingRecommendations(userId);
      res.json({ recommendations });
    } catch (error) {
      logger.error('Get recommendations error:', error);
      next(error);
    }
  };

  /**
   * Get count of pending recommendations (for notification badge)
   */
  getRecommendationCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const count = await unsubscribeService.getRecommendationCount(userId);
      res.json({ count });
    } catch (error) {
      logger.error('Get recommendation count error:', error);
      next(error);
    }
  };

  /**
   * Generate/refresh recommendations
   */
  generateRecommendations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const count = await unsubscribeService.generateRecommendations(userId);
      res.json({ message: `Generated ${count} recommendations`, count });
    } catch (error) {
      logger.error('Generate recommendations error:', error);
      next(error);
    }
  };

  /**
   * Dismiss a recommendation
   */
  dismissRecommendation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { senderEmail } = req.body;

      if (!senderEmail) {
        res.status(400).json({ error: 'senderEmail is required' });
        return;
      }

      await unsubscribeService.dismissRecommendation(userId, senderEmail);
      res.json({ message: 'Recommendation dismissed' });
    } catch (error) {
      logger.error('Dismiss recommendation error:', error);
      next(error);
    }
  };

  /**
   * Unsubscribe from multiple senders
   */
  bulkUnsubscribe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { senderEmails } = req.body;

      if (!senderEmails || !Array.isArray(senderEmails) || senderEmails.length === 0) {
        res.status(400).json({ error: 'senderEmails array is required' });
        return;
      }

      const results = await unsubscribeService.bulkUnsubscribe(userId, senderEmails);

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        message: `Unsubscribed from ${successful} senders, ${failed} failed`,
        results
      });
    } catch (error) {
      logger.error('Bulk unsubscribe error:', error);
      next(error);
    }
  };

  /**
   * Get sender engagement metrics
   */
  getSenderMetrics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { limit = 50, offset = 0 } = req.query;

      const senders = await unsubscribeService.getSenderMetrics(
        userId,
        Number(limit),
        Number(offset)
      );

      res.json({ senders });
    } catch (error) {
      logger.error('Get sender metrics error:', error);
      next(error);
    }
  };

  /**
   * Get low-engagement senders (preview)
   */
  getLowEngagementSenders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const senders = await unsubscribeService.getLowEngagementSenders(userId);
      res.json({ senders });
    } catch (error) {
      logger.error('Get low engagement senders error:', error);
      next(error);
    }
  };
}

export const unsubscribeController = new UnsubscribeController();
