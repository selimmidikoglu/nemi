import { Router } from 'express';
import { body, param } from 'express-validator';
import { BadgeController } from '../controllers/badge.controller';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const badgeController = new BadgeController();

// All badge routes require authentication
router.use(authMiddleware);

/**
 * GET /api/badges
 * Get user's badge definitions with engagement metrics
 */
router.get('/', badgeController.getUserBadges);

/**
 * GET /api/badges/user-definitions
 * Alias for getUserBadges - returns user badge definitions
 */
router.get('/user-definitions', badgeController.getUserBadges);

/**
 * PUT /api/badges/order
 * Update badge display order
 */
router.put(
  '/order',
  [
    body('badge_order')
      .isArray()
      .withMessage('badge_order must be an array'),
    body('badge_order.*.badge_name')
      .isString()
      .notEmpty()
      .withMessage('Each item must have badge_name'),
    body('badge_order.*.order')
      .isInt({ min: 0 })
      .withMessage('Each item must have order as non-negative integer'),
    validateRequest
  ],
  badgeController.updateBadgeOrder
);

/**
 * PUT /api/badges/display-mode
 * Update user's badge display mode (horizontal or bottom)
 */
router.put(
  '/display-mode',
  [
    body('display_mode')
      .isIn(['horizontal', 'bottom'])
      .withMessage('display_mode must be "horizontal" or "bottom"'),
    validateRequest
  ],
  badgeController.updateBadgeDisplayMode
);

/**
 * GET /api/badges/categories
 * Get unique badge categories for user
 */
router.get('/categories', badgeController.getBadgeCategories);

/**
 * POST /api/badges
 * Create or update a badge definition
 */
router.post(
  '/',
  [
    body('badge_name').isString().notEmpty(),
    body('badge_color').optional().isString(),
    body('badge_icon').optional().isString(),
    body('category').optional().isString(),
    validateRequest
  ],
  badgeController.upsertBadge
);

/**
 * DELETE /api/badges/:badge_name
 * Delete a badge definition (removes from all emails)
 */
router.delete(
  '/:badge_name',
  [
    param('badge_name').isString().notEmpty(),
    validateRequest
  ],
  badgeController.deleteBadge
);

/**
 * GET /api/badges/:badge_name/analytics
 * Get analytics for a specific badge with optional date range
 */
router.get(
  '/:badge_name/analytics',
  [
    param('badge_name').isString().notEmpty(),
    validateRequest
  ],
  badgeController.getBadgeAnalytics
);

/**
 * POST /api/badges/reset-order
 * Reset badge order to default (sorted by email count)
 */
router.post('/reset-order', badgeController.resetBadgeOrder);

export default router;
