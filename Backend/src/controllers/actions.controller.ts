import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';

/**
 * Get all actions for a user (deadlines, reminders, tasks)
 */
export const getActions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      status = 'pending',
      calendarType,
      actionType,
      limit = 50,
      offset = 0
    } = req.query;

    let queryText = `
      SELECT
        ea.*,
        e.subject as email_subject,
        e.from_email,
        e.from_name
      FROM email_actions ea
      LEFT JOIN emails e ON e.id = ea.email_id
      WHERE ea.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    // Filter by status
    if (status && status !== 'all') {
      queryText += ` AND ea.status = $${paramIndex++}`;
      params.push(status);
    }

    // Filter by calendar type (your_life or reminder)
    if (calendarType) {
      queryText += ` AND ea.calendar_type = $${paramIndex++}`;
      params.push(calendarType);
    }

    // Filter by action type (deadline, reminder, task)
    if (actionType) {
      queryText += ` AND ea.action_type = $${paramIndex++}`;
      params.push(actionType);
    }

    // Order by due date (nulls last for reminders), then by created_at
    queryText += ` ORDER BY
      CASE WHEN ea.due_date IS NULL THEN 1 ELSE 0 END,
      ea.due_date ASC,
      ea.priority DESC,
      ea.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get counts for each type
    const countsResult = await query(`
      SELECT
        calendar_type,
        status,
        COUNT(*) as count
      FROM email_actions
      WHERE user_id = $1
      GROUP BY calendar_type, status
    `, [userId]);

    const counts = {
      your_life: { pending: 0, completed: 0, dismissed: 0 },
      reminder: { pending: 0, completed: 0, dismissed: 0 }
    };

    countsResult.rows.forEach(row => {
      const type = row.calendar_type as 'your_life' | 'reminder';
      const status = row.status as 'pending' | 'completed' | 'dismissed';
      if (counts[type] && counts[type][status] !== undefined) {
        counts[type][status] = parseInt(row.count);
      }
    });

    res.json({
      success: true,
      data: {
        actions: result.rows.map(formatAction),
        counts,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: result.rows.length
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get actions:', error);
    res.status(500).json({ success: false, error: 'Failed to get actions' });
  }
};

/**
 * Get deadlines (Your Life calendar items)
 */
export const getDeadlines = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    const result = await query(`
      SELECT
        ea.*,
        e.subject as email_subject,
        e.from_email,
        e.from_name
      FROM email_actions ea
      LEFT JOIN emails e ON e.id = ea.email_id
      WHERE ea.user_id = $1
        AND ea.calendar_type = 'your_life'
        AND ea.status = 'pending'
        AND (ea.due_date IS NULL OR ea.due_date <= NOW() + INTERVAL '${parseInt(days as string)} days')
      ORDER BY ea.due_date ASC NULLS LAST, ea.priority DESC
      LIMIT 50
    `, [userId]);

    res.json({
      success: true,
      data: result.rows.map(formatAction)
    });
  } catch (error) {
    logger.error('Failed to get deadlines:', error);
    res.status(500).json({ success: false, error: 'Failed to get deadlines' });
  }
};

/**
 * Get reminders (soft tasks without specific dates)
 */
export const getReminders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const result = await query(`
      SELECT
        ea.*,
        e.subject as email_subject,
        e.from_email,
        e.from_name
      FROM email_actions ea
      LEFT JOIN emails e ON e.id = ea.email_id
      WHERE ea.user_id = $1
        AND ea.calendar_type = 'reminder'
        AND ea.status = 'pending'
      ORDER BY ea.priority DESC, ea.created_at DESC
      LIMIT 50
    `, [userId]);

    res.json({
      success: true,
      data: result.rows.map(formatAction)
    });
  } catch (error) {
    logger.error('Failed to get reminders:', error);
    res.status(500).json({ success: false, error: 'Failed to get reminders' });
  }
};

/**
 * Create a new action manually
 */
export const createAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const {
      emailId,
      actionType,
      title,
      description,
      dueDate,
      priority = 'medium',
      calendarType = 'reminder'
    } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: 'Title is required' });
      return;
    }

    const result = await query(`
      INSERT INTO email_actions (
        email_id, user_id, action_type, title, description,
        due_date, priority, calendar_type, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `, [
      emailId || null,
      userId,
      actionType || 'task',
      title,
      description || null,
      dueDate || null,
      priority,
      calendarType
    ]);

    res.json({
      success: true,
      data: formatAction(result.rows[0])
    });
  } catch (error) {
    logger.error('Failed to create action:', error);
    res.status(500).json({ success: false, error: 'Failed to create action' });
  }
};

/**
 * Update an action
 */
export const updateAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { title, description, dueDate, priority, calendarType } = req.body;

    const result = await query(`
      UPDATE email_actions
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        priority = COALESCE($4, priority),
        calendar_type = COALESCE($5, calendar_type),
        updated_at = NOW()
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [title, description, dueDate, priority, calendarType, id, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }

    res.json({
      success: true,
      data: formatAction(result.rows[0])
    });
  } catch (error) {
    logger.error('Failed to update action:', error);
    res.status(500).json({ success: false, error: 'Failed to update action' });
  }
};

/**
 * Mark action as completed
 */
export const completeAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const result = await query(`
      UPDATE email_actions
      SET status = 'completed', completed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }

    res.json({
      success: true,
      data: formatAction(result.rows[0])
    });
  } catch (error) {
    logger.error('Failed to complete action:', error);
    res.status(500).json({ success: false, error: 'Failed to complete action' });
  }
};

/**
 * Dismiss an action (user doesn't want to see it)
 */
export const dismissAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const result = await query(`
      UPDATE email_actions
      SET status = 'dismissed', updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }

    res.json({
      success: true,
      data: formatAction(result.rows[0])
    });
  } catch (error) {
    logger.error('Failed to dismiss action:', error);
    res.status(500).json({ success: false, error: 'Failed to dismiss action' });
  }
};

/**
 * Reopen a completed/dismissed action
 */
export const reopenAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const result = await query(`
      UPDATE email_actions
      SET status = 'pending', completed_at = NULL, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }

    res.json({
      success: true,
      data: formatAction(result.rows[0])
    });
  } catch (error) {
    logger.error('Failed to reopen action:', error);
    res.status(500).json({ success: false, error: 'Failed to reopen action' });
  }
};

/**
 * Delete an action
 */
export const deleteAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const result = await query(`
      DELETE FROM email_actions
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Action deleted'
    });
  } catch (error) {
    logger.error('Failed to delete action:', error);
    res.status(500).json({ success: false, error: 'Failed to delete action' });
  }
};

/**
 * Get calendar events (meetings extracted from emails)
 */
export const getCalendarEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    // Get meetings from emails (stored in ai_raw_response)
    const result = await query(`
      SELECT
        e.id,
        e.subject,
        e.from_email,
        e.from_name,
        e.date as email_date,
        e.email_account_id,
        e.ai_raw_response->'metadata'->>'meeting_time' as meeting_time,
        e.ai_raw_response->'metadata'->>'meeting_url' as meeting_url,
        e.ai_raw_response->'metadata'->>'meeting_platform' as meeting_platform,
        ea.email_address as account_email
      FROM emails e
      LEFT JOIN email_accounts ea ON ea.id = e.email_account_id
      WHERE e.user_id = $1
        AND (e.ai_raw_response->'metadata'->>'has_meeting')::boolean = true
        AND e.ai_raw_response->'metadata'->>'meeting_time' IS NOT NULL
        AND (e.ai_raw_response->'metadata'->>'meeting_time')::timestamp > NOW() - INTERVAL '1 day'
        AND (e.ai_raw_response->'metadata'->>'meeting_time')::timestamp < NOW() + INTERVAL '${parseInt(days as string)} days'
      ORDER BY (e.ai_raw_response->'metadata'->>'meeting_time')::timestamp ASC
      LIMIT 50
    `, [userId]);

    // Also get deadline actions that have dates (as calendar events)
    const deadlinesResult = await query(`
      SELECT
        ea.id,
        ea.title,
        ea.due_date,
        ea.priority,
        ea.email_id,
        e.subject as email_subject,
        e.from_name,
        eacc.email_address as account_email
      FROM email_actions ea
      LEFT JOIN emails e ON e.id = ea.email_id
      LEFT JOIN email_accounts eacc ON eacc.id = e.email_account_id
      WHERE ea.user_id = $1
        AND ea.calendar_type = 'your_life'
        AND ea.status = 'pending'
        AND ea.due_date IS NOT NULL
        AND ea.due_date > NOW() - INTERVAL '1 day'
        AND ea.due_date < NOW() + INTERVAL '${parseInt(days as string)} days'
      ORDER BY ea.due_date ASC
      LIMIT 50
    `, [userId]);

    const events = [];

    // Add meetings
    for (const row of result.rows) {
      events.push({
        id: `meeting-${row.id}`,
        type: 'meeting',
        title: row.subject,
        time: row.meeting_time,
        url: row.meeting_url,
        platform: row.meeting_platform,
        fromEmail: row.from_email,
        fromName: row.from_name,
        emailId: row.id,
        accountEmail: row.account_email
      });
    }

    // Add deadlines as events
    for (const row of deadlinesResult.rows) {
      events.push({
        id: `deadline-${row.id}`,
        type: 'deadline',
        title: row.title,
        time: row.due_date,
        priority: row.priority,
        emailId: row.email_id,
        emailSubject: row.email_subject,
        fromName: row.from_name,
        accountEmail: row.account_email
      });
    }

    // Sort all events by time
    events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    logger.error('Failed to get calendar events:', error);
    res.status(500).json({ success: false, error: 'Failed to get calendar events' });
  }
};

/**
 * Get action counts for sidebar badges
 */
export const getActionCounts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const result = await query(`
      SELECT
        calendar_type,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_date < NOW()) as overdue_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days') as upcoming_count
      FROM email_actions
      WHERE user_id = $1
      GROUP BY calendar_type
    `, [userId]);

    const counts = {
      your_life: { pending: 0, overdue: 0, upcoming: 0 },
      reminder: { pending: 0, overdue: 0, upcoming: 0 },
      total: { pending: 0, overdue: 0, upcoming: 0 }
    };

    result.rows.forEach(row => {
      const type = row.calendar_type as 'your_life' | 'reminder';
      if (counts[type]) {
        counts[type].pending = parseInt(row.pending_count) || 0;
        counts[type].overdue = parseInt(row.overdue_count) || 0;
        counts[type].upcoming = parseInt(row.upcoming_count) || 0;
        counts.total.pending += counts[type].pending;
        counts.total.overdue += counts[type].overdue;
        counts.total.upcoming += counts[type].upcoming;
      }
    });

    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    logger.error('Failed to get action counts:', error);
    res.status(500).json({ success: false, error: 'Failed to get action counts' });
  }
};

/**
 * Format action for API response
 */
function formatAction(row: any) {
  return {
    id: row.id,
    emailId: row.email_id,
    userId: row.user_id,
    actionType: row.action_type,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    calendarType: row.calendar_type,
    sourceText: row.source_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    // Email info if joined
    emailSubject: row.email_subject,
    fromEmail: row.from_email,
    fromName: row.from_name,
    // Google Calendar sync
    googleCalendarEventId: row.google_calendar_event_id,
    syncedToCalendar: row.synced_to_calendar
  };
}
