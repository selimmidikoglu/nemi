import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { OutlookPushService, OutlookNotification } from '../services/outlook-push.service';

export class OutlookWebhookController {
  /**
   * Handle webhook validation and notifications from Microsoft Graph
   *
   * Microsoft sends two types of requests:
   * 1. Validation: GET/POST with ?validationToken=xxx - Must respond with the token as plain text
   * 2. Notification: POST with body containing change notifications
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check for validation token (Microsoft sends this to verify the endpoint)
      const validationToken = req.query.validationToken as string;

      if (validationToken) {
        // Microsoft Graph subscription validation
        // MUST respond with the token as plain text within 10 seconds
        logger.info('Outlook webhook validation request received');
        res.status(200).contentType('text/plain').send(validationToken);
        return;
      }

      // Process notifications
      const body = req.body;

      if (!body || !body.value || !Array.isArray(body.value)) {
        logger.warn('Outlook webhook received invalid body:', body);
        res.status(200).json({ received: true });
        return;
      }

      const notifications: OutlookNotification[] = body.value;

      logger.info(`Outlook webhook received ${notifications.length} notification(s)`);

      // Acknowledge immediately - Microsoft expects response within 3 seconds
      res.status(200).json({ received: true });

      // Process each notification asynchronously in background
      for (const notification of notifications) {
        // Validate notification has required fields
        if (!notification.subscriptionId || !notification.clientState) {
          logger.warn('Outlook notification missing required fields:', notification);
          continue;
        }

        // Process asynchronously - don't await
        OutlookPushService.processNotification(notification).catch((error) => {
          logger.error('Error processing Outlook notification:', error);
        });
      }
    } catch (error) {
      logger.error('Outlook webhook error:', error);
      // Still return 200 to prevent Microsoft from retrying
      res.status(200).json({ error: 'Internal error but acknowledged' });
    }
  };

  /**
   * Health check endpoint
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'ok',
      service: 'outlook-webhook',
      timestamp: new Date().toISOString()
    });
  };
}
