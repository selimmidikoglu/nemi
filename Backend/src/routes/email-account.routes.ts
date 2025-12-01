import { Router } from 'express';
import { pool } from '../config/database';
import { EmailAccountController } from '../controllers/email-account.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new EmailAccountController(pool);

// All routes require authentication
router.use(authMiddleware);

// Get supported email providers
router.get('/providers', controller.getProviders);

// Email account CRUD
router.post('/', controller.addEmailAccount);
router.get('/', controller.getEmailAccounts);
router.get('/:id', controller.getEmailAccount);
router.get('/:id/stats', controller.getAccountStats);
router.patch('/:id', controller.updateEmailAccount);
router.delete('/:id', controller.deleteEmailAccount);

export default router;
