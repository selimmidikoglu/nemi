import { Request, Response } from 'express';
import { contactsService } from '../services/contacts.service';
import { logger } from '../config/logger';
import { query } from '../config/database';

/**
 * Get contacts for autocomplete
 * GET /api/contacts/autocomplete?q=searchTerm&limit=10
 */
export const getContactsAutocomplete = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const searchQuery = req.query.q as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const contacts = await contactsService.getContactsForAutocomplete(
      userId,
      searchQuery,
      limit
    );

    return res.json({ contacts });
  } catch (error) {
    logger.error('Failed to get contacts autocomplete:', error);
    return res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

/**
 * Get recent contacts (for initial suggestions)
 * GET /api/contacts/recent?limit=5
 */
export const getRecentContacts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

    const contacts = await contactsService.getRecentContacts(userId, limit);

    return res.json({ contacts });
  } catch (error) {
    logger.error('Failed to get recent contacts:', error);
    return res.status(500).json({ error: 'Failed to fetch recent contacts' });
  }
};

/**
 * Get frequently contacted (for suggested section)
 * GET /api/contacts/frequent?limit=10
 */
export const getFrequentContacts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const contacts = await contactsService.getFrequentContacts(userId, limit);

    return res.json({ contacts });
  } catch (error) {
    logger.error('Failed to get frequent contacts:', error);
    return res.status(500).json({ error: 'Failed to fetch frequent contacts' });
  }
};

/**
 * Get combined contacts from Google + email history
 * GET /api/contacts/search?q=searchTerm&limit=10&emailAccountId=xxx
 */
export const searchContacts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const searchQuery = req.query.q as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const emailAccountId = req.query.emailAccountId as string;

    if (!emailAccountId) {
      // Fallback to email history only
      const contacts = await contactsService.getContactsForAutocomplete(userId, searchQuery, limit);
      return res.json({ contacts });
    }

    // Get email account tokens
    const accountResult = await query(
      'SELECT access_token, refresh_token FROM email_accounts WHERE id = $1 AND user_id = $2',
      [emailAccountId, userId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    const { access_token, refresh_token } = accountResult.rows[0];

    // Get combined contacts from Google + email history
    const contacts = await contactsService.getCombinedContacts(
      userId,
      emailAccountId,
      access_token,
      refresh_token,
      searchQuery,
      limit
    );

    return res.json({ contacts });
  } catch (error) {
    logger.error('Failed to search contacts:', error);
    return res.status(500).json({ error: 'Failed to search contacts' });
  }
};
