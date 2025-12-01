import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validateRequest';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('displayName').optional().isString().trim(),
    validateRequest
  ],
  authController.signUp
);

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('rememberMe').optional().isBoolean(),
    validateRequest
  ],
  authController.login
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty(),
    validateRequest
  ],
  authController.refreshToken
);

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', authController.logout);

/**
 * GET /api/auth/gmail/authorize
 * Initiate Gmail OAuth flow
 */
router.get('/gmail/authorize', authController.initiateGmailOAuth);

/**
 * GET /api/auth/gmail/callback
 * Handle Gmail OAuth callback
 */
router.get('/gmail/callback', authController.handleGmailCallback);

/**
 * GET /api/auth/outlook/authorize
 * Initiate Outlook OAuth flow
 */
router.get('/outlook/authorize', authController.initiateOutlookOAuth);

/**
 * GET /api/auth/outlook/callback
 * Handle Outlook OAuth callback
 */
router.get('/outlook/callback', authController.handleOutlookCallback);

// ============== Session Management Routes (Authenticated) ==============

/**
 * GET /api/auth/sessions
 * Get all active sessions for current user
 */
router.get('/sessions', authMiddleware, authController.getSessions);

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authMiddleware, authController.revokeSession);

/**
 * DELETE /api/auth/sessions
 * Revoke all sessions (logout everywhere)
 */
router.delete('/sessions', authMiddleware, authController.revokeAllSessions);

export default router;
