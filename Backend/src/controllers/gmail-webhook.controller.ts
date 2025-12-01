import { Request, Response, NextFunction } from 'express';
import { GmailPushService } from '../services/gmail-push.service';
import { logger } from '../config/logger';

export class GmailWebhookController {
  /**
   * Handle Gmail push notification from Google Pub/Sub
   * POST /api/gmail/webhook
   */
  handlePushNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info('=== GMAIL WEBHOOK POST RECEIVED ===');
      logger.info('Request body:', JSON.stringify(req.body));

      // Google Pub/Sub sends data in a specific format
      const { message } = req.body;

      if (!message || !message.data) {
        logger.warn('Invalid push notification received: missing message or data');
        res.status(400).json({ error: 'Invalid notification format' });
        return;
      }

      // Decode the base64 data
      const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
      const notificationData = JSON.parse(decodedData);

      logger.info('Received Gmail push notification:', notificationData);

      const { emailAddress, historyId } = notificationData;

      if (!emailAddress || !historyId) {
        logger.warn('Push notification missing emailAddress or historyId');
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Process the notification asynchronously
      // Acknowledge immediately to avoid timeout
      res.status(200).json({ received: true });

      // Process in background
      GmailPushService.processPushNotification({ emailAddress, historyId })
        .catch(error => {
          logger.error('Error processing push notification:', error);
        });

    } catch (error) {
      logger.error('Error handling Gmail webhook:', error);
      // Still return 200 to acknowledge receipt
      // Otherwise Google will retry and we'll get duplicate notifications
      res.status(200).json({ received: true, error: 'Processing error' });
    }
  };

  /**
   * Verify webhook endpoint (for setup testing)
   * GET /api/gmail/webhook
   */
  verifyWebhook = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'ok',
      message: 'Gmail webhook endpoint is active',
      timestamp: new Date().toISOString()
    });
  };
}
