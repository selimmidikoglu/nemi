import { Router } from 'express';
import { OutlookWebhookController } from '../controllers/outlook-webhook.controller';

const router = Router();
const controller = new OutlookWebhookController();

// Microsoft Graph webhook endpoints
// NOTE: No authentication - these are called directly by Microsoft Graph
// The clientState parameter is used for validation instead

// POST - Receive notifications from Microsoft Graph
router.post('/', controller.handleWebhook);

// GET - For validation token (Microsoft sends this during subscription creation)
router.get('/', controller.handleWebhook);

// Health check
router.get('/health', controller.healthCheck);

export default router;
