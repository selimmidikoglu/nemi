import { Router } from 'express';
import { body, query } from 'express-validator';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const analyticsController = new AnalyticsController();

// All analytics routes require authentication
router.use(authMiddleware);

/**
 * POST /api/analytics/events
 * Record a user engagement event (opened, closed, link_clicked, badge_filtered)
 */
router.post(
  '/events',
  [
    body('event_type')
      .isIn(['opened', 'closed', 'link_clicked', 'badge_filtered'])
      .withMessage('event_type must be one of: opened, closed, link_clicked, badge_filtered'),
    body('email_id').optional().isString(),
    body('event_data').optional().isObject(),
    validateRequest
  ],
  analyticsController.recordEngagementEvent
);

/**
 * POST /api/analytics/view-sessions
 * Save an email view session (when user closes an email)
 */
router.post(
  '/view-sessions',
  [
    body('session_id').isString().notEmpty(),
    body('email_id').isString().notEmpty(),
    body('opened_at').isISO8601(),
    body('closed_at').isISO8601(),
    body('duration_seconds').isInt({ min: 0 }),
    body('link_clicks_count').isInt({ min: 0 }),
    validateRequest
  ],
  analyticsController.saveViewSession
);

/**
 * GET /api/analytics/badge-engagement/:userId
 * Get badge engagement metrics for a user
 */
router.get(
  '/badge-engagement/:userId',
  analyticsController.getBadgeEngagementMetrics
);

/**
 * GET /api/analytics/top-badges
 * Get top engaged badges for current user
 */
router.get(
  '/top-badges',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    validateRequest
  ],
  analyticsController.getTopEngagedBadges
);

/**
 * POST /api/analytics/refresh-metrics
 * Manually trigger badge engagement metrics refresh
 */
router.post(
  '/refresh-metrics',
  [
    body('badge_name').optional().isString(),
    validateRequest
  ],
  analyticsController.refreshBadgeMetrics
);

/**
 * GET /api/analytics/reading-stats
 * Get user's reading statistics
 */
router.get('/reading-stats', analyticsController.getUserReadingStats);

/**
 * GET /api/analytics/overview
 * Get analytics overview across all badges
 */
router.get('/overview', analyticsController.getAnalyticsOverview);

export default router;
