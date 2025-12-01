import { Router } from 'express';
import { GmailWebhookController } from '../controllers/gmail-webhook.controller';

const router = Router();
const gmailWebhookController = new GmailWebhookController();

// NOTE: These routes do NOT require authentication
// They are called directly by Google Cloud Pub/Sub

/**
 * GET /api/gmail/webhook
 * Verify webhook endpoint is active
 */
router.get('/', gmailWebhookController.verifyWebhook);

/**
 * POST /api/gmail/webhook
 * Receive push notifications from Google Pub/Sub
 */
router.post('/', gmailWebhookController.handlePushNotification);

export default router;
