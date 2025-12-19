import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getActions,
  getDeadlines,
  getReminders,
  createAction,
  updateAction,
  completeAction,
  dismissAction,
  reopenAction,
  deleteAction,
  getActionCounts,
  getCalendarEvents
} from '../controllers/actions.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all actions with filters
router.get('/', getActions);

// Get deadlines (Your Life calendar)
router.get('/deadlines', getDeadlines);

// Get reminders (soft tasks)
router.get('/reminders', getReminders);

// Get counts for sidebar badges
router.get('/counts', getActionCounts);

// Get calendar events (meetings + deadlines from all email accounts)
router.get('/calendar', getCalendarEvents);

// Create a new action
router.post('/', createAction);

// Update an action
router.patch('/:id', updateAction);

// Mark action as completed
router.post('/:id/complete', completeAction);

// Dismiss an action
router.post('/:id/dismiss', dismissAction);

// Reopen a completed/dismissed action
router.post('/:id/reopen', reopenAction);

// Delete an action
router.delete('/:id', deleteAction);

export default router;
