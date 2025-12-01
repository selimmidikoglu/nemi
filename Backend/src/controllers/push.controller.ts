import { Request, Response, NextFunction } from 'express';
import { PushService } from '../services/push.service';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';

export class PushController {
  private pushService: PushService;

  constructor() {
    this.pushService = new PushService();
  }

  /**
   * Register device token for push notifications
   */
  registerDevice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { deviceToken, userId } = req.body;

      // Verify user matches authenticated user
      if (userId !== req.userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Cannot register device for another user'
        });
        return;
      }

      await this.pushService.registerDevice(userId, deviceToken);

      logger.info(`Device registered for user ${userId}`);

      res.json({ message: 'Device registered successfully' });
    } catch (error) {
      logger.error('Register device error:', error);
      next(error);
    }
  };

  /**
   * Send push notification
   */
  sendNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, title, body, data } = req.body;

      // Get user's device tokens
      const devices = await this.pushService.getUserDevices(userId);

      if (devices.length === 0) {
        res.status(404).json({
          error: 'No devices',
          message: 'User has no registered devices'
        });
        return;
      }

      // Send notification to all devices
      const results = await this.pushService.sendToDevices(devices, {
        title,
        body,
        data: data || {}
      });

      logger.info(`Notification sent to ${results.success} devices for user ${userId}`);

      res.json({
        message: 'Notification sent',
        success: results.success,
        failed: results.failed
      });
    } catch (error) {
      logger.error('Send notification error:', error);
      next(error);
    }
  };

  /**
   * Unregister device token
   */
  unregisterDevice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { deviceToken } = req.body;

      await this.pushService.unregisterDevice(userId, deviceToken);

      logger.info(`Device unregistered for user ${userId}`);

      res.json({ message: 'Device unregistered successfully' });
    } catch (error) {
      logger.error('Unregister device error:', error);
      next(error);
    }
  };
}
