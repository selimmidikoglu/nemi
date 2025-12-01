import { Router } from 'express';
import { body } from 'express-validator';
import { PushController } from '../controllers/push.controller';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const pushController = new PushController();

// All push routes require authentication
router.use(authMiddleware);

/**
 * POST /api/push/register
 * Register device token for push notifications
 */
router.post(
  '/register',
  [
    body('deviceToken').notEmpty().isString(),
    body('userId').notEmpty().isString(),
    validateRequest
  ],
  pushController.registerDevice
);

/**
 * POST /api/push/send
 * Send push notification (for testing or admin use)
 */
router.post(
  '/send',
  [
    body('userId').notEmpty().isString(),
    body('title').notEmpty().isString(),
    body('body').notEmpty().isString(),
    body('data').optional().isObject(),
    validateRequest
  ],
  pushController.sendNotification
);

/**
 * DELETE /api/push/unregister
 * Unregister device token
 */
router.delete(
  '/unregister',
  [
    body('deviceToken').notEmpty().isString(),
    validateRequest
  ],
  pushController.unregisterDevice
);

export default router;
