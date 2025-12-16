import { Router } from 'express';
import { unsubscribeController } from '../controllers/unsubscribe.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Settings
router.get('/settings', unsubscribeController.getSettings);
router.patch('/settings', unsubscribeController.updateSettings);

// Recommendations
router.get('/recommendations', unsubscribeController.getRecommendations);
router.get('/recommendations/count', unsubscribeController.getRecommendationCount);
router.post('/recommendations/generate', unsubscribeController.generateRecommendations);
router.post('/recommendations/dismiss', unsubscribeController.dismissRecommendation);

// Unsubscribe actions
router.post('/unsubscribe', unsubscribeController.bulkUnsubscribe);

// Sender metrics
router.get('/senders', unsubscribeController.getSenderMetrics);
router.get('/senders/low-engagement', unsubscribeController.getLowEngagementSenders);

export default router;
