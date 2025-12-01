import { Router } from 'express';
import { body, query } from 'express-validator';
import { EmailController } from '../controllers/email.controller';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const emailController = new EmailController();

// All email routes require authentication
router.use(authMiddleware);

/**
 * POST /api/emails/fetch
 * Fetch emails from email provider
 */
router.post(
  '/fetch',
  [
    body('provider').isIn(['Gmail', 'Outlook', 'iCloud', 'Yahoo', 'Other']),
    validateRequest
  ],
  emailController.fetchEmails
);

/**
 * GET /api/emails
 * Get user's emails with optional filtering
 */
router.get(
  '/',
  [
    query('category').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('isRead').optional().isBoolean().toBoolean(),
    query('isStarred').optional().isBoolean().toBoolean(),
    query('isPersonallyRelevant').optional().isBoolean().toBoolean(),
    query('search').optional().isString(),
    validateRequest
  ],
  emailController.getEmails
);

/**
 * GET /api/emails/analysis-progress
 * Get AI analysis progress (how many emails analyzed vs total)
 */
router.get('/analysis-progress', emailController.getAnalysisProgress);

/**
 * GET /api/emails/:id
 * Get single email by ID
 */
router.get('/:id', emailController.getEmailById);

/**
 * POST /api/emails/classify
 * Classify emails using AI
 */
router.post(
  '/classify',
  [
    body('emailIds').isArray().notEmpty(),
    body('emailIds.*').isString(),
    validateRequest
  ],
  emailController.classifyEmails
);

/**
 * PATCH /api/emails/:id/read
 * Mark email as read/unread
 */
router.patch(
  '/:id/read',
  [
    body('isRead').isBoolean(),
    validateRequest
  ],
  emailController.updateReadStatus
);

/**
 * PATCH /api/emails/:id/star
 * Star/unstar email
 */
router.patch(
  '/:id/star',
  [
    body('isStarred').isBoolean(),
    validateRequest
  ],
  emailController.updateStarStatus
);

/**
 * DELETE /api/emails/:id
 * Delete email
 */
router.delete('/:id', emailController.deleteEmail);

/**
 * POST /api/emails/bulk-delete
 * Bulk delete emails from database and Gmail
 */
router.post(
  '/bulk-delete',
  [
    body('emailIds').isArray().notEmpty(),
    validateRequest
  ],
  emailController.bulkDeleteEmails
);

/**
 * POST /api/emails/send
 * Send or reply to an email
 */
router.post(
  '/send',
  [
    body('to').isArray().notEmpty(),
    body('to.*.email').isEmail(),
    body('to.*.name').optional().isString(),
    body('cc').optional().isArray(),
    body('cc.*.email').optional().isEmail(),
    body('cc.*.name').optional().isString(),
    body('bcc').optional().isArray(),
    body('bcc.*.email').optional().isEmail(),
    body('bcc.*.name').optional().isString(),
    body('subject').isString().notEmpty(),
    body('text').optional().isString(),
    body('html').optional().isString(),
    body('inReplyTo').optional().isString(),
    body('emailAccountId').isInt(),
    validateRequest
  ],
  emailController.sendEmail
);

/**
 * GET /api/emails/categories/stats
 * Get email count by category
 */
router.get('/categories/stats', emailController.getCategoryStats);

/**
 * GET /api/emails/badges/stats
 * Get badge statistics with usage counts
 * Query params: category (optional) - filter by badge category
 */
router.get(
  '/badges/stats',
  [
    query('category').optional().isString(),
    validateRequest
  ],
  emailController.getBadgeStats
);

/**
 * GET /api/emails/badges/categories/stats
 * Get badge category statistics with email counts per category
 */
router.get('/badges/categories/stats', emailController.getBadgeCategoryStats);

/**
 * POST /api/emails/autocomplete
 * Get AI autocomplete suggestion for reply
 */
router.post(
  '/autocomplete',
  [
    body('currentText').optional().isString(),
    body('emailContext').isObject().notEmpty(),
    body('emailContext.subject').isString().notEmpty(),
    body('emailContext.from').isString().notEmpty(),
    body('emailContext.body').optional().isString(),
    body('emailContext.aiSummary').optional().isString(),
    validateRequest
  ],
  emailController.getAutocompleteSuggestion
);

export default router;
