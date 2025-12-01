import { Request, Response } from 'express';
import { Pool } from 'pg';
import { UserEmailAccountService } from '../services/user-email-account.service';
import { getAllProviders } from '../config/email-providers';

export class EmailAccountController {
  private userEmailAccountService: UserEmailAccountService;

  constructor(pool: Pool) {
    this.userEmailAccountService = new UserEmailAccountService(pool);
  }

  /**
   * GET /api/email-accounts/providers
   * Get list of supported email providers
   */
  getProviders = async (req: Request, res: Response): Promise<void> => {
    try {
      const providers = getAllProviders();
      res.json({ providers });
    } catch (error) {
      console.error('Get providers error:', error);
      res.status(500).json({ error: 'Failed to get providers' });
    }
  };

  /**
   * POST /api/email-accounts
   * Add a new email account
   */
  addEmailAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const {
        email_address,
        account_name,
        provider,
        password,
        imap_host,
        imap_port,
        imap_secure
      } = req.body;

      // Validation
      if (!email_address || !provider || !password) {
        res.status(400).json({ error: 'email_address, provider, and password are required' });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email_address)) {
        res.status(400).json({ error: 'Invalid email address format' });
        return;
      }

      const account = await this.userEmailAccountService.addEmailAccount({
        userId,
        emailAddress: email_address,
        accountName: account_name,
        provider,
        password,
        imapHost: imap_host,
        imapPort: imap_port,
        imapSecure: imap_secure
      });

      res.status(201).json({
        email_account: {
          id: account.id,
          email_address: account.emailAddress,
          account_name: account.accountName,
          provider: account.provider,
          imap_host: account.imapHost,
          imap_port: account.imapPort,
          imap_secure: account.imapSecure,
          is_active: account.isActive,
          sync_enabled: account.syncEnabled,
          last_sync_at: account.lastSyncAt,
          last_sync_error: account.lastSyncError,
          created_at: account.createdAt,
          updated_at: account.updatedAt
        }
      });
    } catch (error: any) {
      console.error('Add email account error:', error);

      if (error.message.includes('already connected')) {
        res.status(409).json({ error: error.message });
        return;
      }

      if (error.message.includes('Failed to connect')) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Failed to add email account' });
    }
  };

  /**
   * GET /api/email-accounts
   * Get all email accounts for the current user
   */
  getEmailAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;

      const accounts = await this.userEmailAccountService.getUserEmailAccounts(userId);

      res.json({
        email_accounts: accounts.map(account => ({
          id: account.id,
          email_address: account.emailAddress,
          account_name: account.accountName,
          provider: account.provider,
          imap_host: account.imapHost,
          imap_port: account.imapPort,
          imap_secure: account.imapSecure,
          is_active: account.isActive,
          sync_enabled: account.syncEnabled,
          last_sync_at: account.lastSyncAt,
          last_sync_error: account.lastSyncError,
          created_at: account.createdAt,
          updated_at: account.updatedAt
        }))
      });
    } catch (error) {
      console.error('Get email accounts error:', error);
      res.status(500).json({ error: 'Failed to get email accounts' });
    }
  };

  /**
   * GET /api/email-accounts/:id
   * Get a specific email account
   */
  getEmailAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const account = await this.userEmailAccountService.getEmailAccount(id, userId);

      if (!account) {
        res.status(404).json({ error: 'Email account not found' });
        return;
      }

      res.json({
        email_account: {
          id: account.id,
          email_address: account.emailAddress,
          account_name: account.accountName,
          provider: account.provider,
          imap_host: account.imapHost,
          imap_port: account.imapPort,
          imap_secure: account.imapSecure,
          is_active: account.isActive,
          sync_enabled: account.syncEnabled,
          last_sync_at: account.lastSyncAt,
          last_sync_error: account.lastSyncError,
          created_at: account.createdAt,
          updated_at: account.updatedAt
        }
      });
    } catch (error) {
      console.error('Get email account error:', error);
      res.status(500).json({ error: 'Failed to get email account' });
    }
  };

  /**
   * PATCH /api/email-accounts/:id
   * Update email account settings
   */
  updateEmailAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { account_name, sync_enabled, is_active } = req.body;

      const updates: any = {};
      if (account_name !== undefined) updates.accountName = account_name;
      if (sync_enabled !== undefined) updates.syncEnabled = sync_enabled;
      if (is_active !== undefined) updates.isActive = is_active;

      const account = await this.userEmailAccountService.updateEmailAccount(id, userId, updates);

      if (!account) {
        res.status(404).json({ error: 'Email account not found' });
        return;
      }

      res.json({
        email_account: {
          id: account.id,
          email_address: account.emailAddress,
          account_name: account.accountName,
          provider: account.provider,
          imap_host: account.imapHost,
          imap_port: account.imapPort,
          imap_secure: account.imapSecure,
          is_active: account.isActive,
          sync_enabled: account.syncEnabled,
          last_sync_at: account.lastSyncAt,
          last_sync_error: account.lastSyncError,
          created_at: account.createdAt,
          updated_at: account.updatedAt
        }
      });
    } catch (error) {
      console.error('Update email account error:', error);
      res.status(500).json({ error: 'Failed to update email account' });
    }
  };

  /**
   * DELETE /api/email-accounts/:id
   * Delete an email account
   */
  deleteEmailAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const success = await this.userEmailAccountService.deleteEmailAccount(id, userId);

      if (!success) {
        res.status(404).json({ error: 'Email account not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete email account error:', error);
      res.status(500).json({ error: 'Failed to delete email account' });
    }
  };

  /**
   * GET /api/email-accounts/:id/stats
   * Get email statistics for an account (total, analyzed, pending, failed)
   */
  getAccountStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      // Verify account belongs to user
      const account = await this.userEmailAccountService.getEmailAccount(id, userId);
      if (!account) {
        res.status(404).json({ error: 'Email account not found' });
        return;
      }

      // Get email statistics
      const stats = await this.userEmailAccountService.getAccountStats(id, userId);

      res.json({ stats });
    } catch (error) {
      console.error('Get account stats error:', error);
      res.status(500).json({ error: 'Failed to get account statistics' });
    }
  };
}
