import { Pool } from 'pg';
import { encrypt, decrypt } from '../utils/encryption';
import { getProviderConfig } from '../config/email-providers';
import { ImapService, ImapConfig } from './imap.service';

export interface EmailAccount {
  id: string;
  userId: string;
  emailAddress: string;
  accountName: string | null;
  provider: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  isActive: boolean;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  syncEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailAccountData {
  userId: string;
  emailAddress: string;
  accountName?: string;
  provider: string;
  password: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
}

export class UserEmailAccountService {
  constructor(private pool: Pool) {}

  /**
   * Add a new email account for a user
   */
  async addEmailAccount(data: CreateEmailAccountData): Promise<EmailAccount> {
    // Get provider config
    let imapHost = data.imapHost;
    let imapPort = data.imapPort || 993;
    let imapSecure = data.imapSecure !== undefined ? data.imapSecure : true;

    if (!imapHost && data.provider !== 'custom') {
      const providerConfig = getProviderConfig(data.provider);
      if (!providerConfig) {
        throw new Error(`Unknown email provider: ${data.provider}`);
      }
      imapHost = providerConfig.imapHost;
      imapPort = providerConfig.imapPort;
      imapSecure = providerConfig.imapSecure;
    }

    if (!imapHost) {
      throw new Error('IMAP host is required for custom provider');
    }

    // Test IMAP connection before saving
    const testConfig: ImapConfig = {
      user: data.emailAddress,
      password: data.password,
      host: imapHost,
      port: imapPort,
      tls: imapSecure
    };

    const isValid = await ImapService.testConnection(testConfig);
    if (!isValid) {
      throw new Error('Failed to connect to email server. Please check your credentials and settings.');
    }

    // Encrypt password
    const encryptedPassword = encrypt(data.password);

    // Insert into database
    const query = `
      INSERT INTO email_accounts (
        user_id, email_address, account_name, provider,
        imap_host, imap_port, imap_secure, encrypted_password,
        is_active, sync_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true)
      RETURNING *
    `;

    const values = [
      data.userId,
      data.emailAddress,
      data.accountName || null,
      data.provider,
      imapHost,
      imapPort,
      imapSecure,
      encryptedPassword
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToEmailAccount(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('This email account is already connected');
      }
      throw error;
    }
  }

  /**
   * Get all email accounts for a user
   */
  async getUserEmailAccounts(userId: string): Promise<EmailAccount[]> {
    const query = `
      SELECT * FROM email_accounts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => this.mapRowToEmailAccount(row));
  }

  /**
   * Get a specific email account
   */
  async getEmailAccount(accountId: string, userId: string): Promise<EmailAccount | null> {
    const query = `
      SELECT * FROM email_accounts
      WHERE id = $1 AND user_id = $2
    `;

    const result = await this.pool.query(query, [accountId, userId]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEmailAccount(result.rows[0]);
  }

  /**
   * Get IMAP config for an email account (with decrypted password)
   */
  async getImapConfig(accountId: string, userId: string): Promise<ImapConfig | null> {
    const query = `
      SELECT email_address, encrypted_password, imap_host, imap_port, imap_secure
      FROM email_accounts
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `;

    const result = await this.pool.query(query, [accountId, userId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const password = decrypt(row.encrypted_password);

    return {
      user: row.email_address,
      password,
      host: row.imap_host,
      port: row.imap_port,
      tls: row.imap_secure
    };
  }

  /**
   * Get all active email accounts that need syncing
   */
  async getAccountsForSync(): Promise<Array<{
    id: string;
    userId: string;
    emailAddress: string;
    provider: string;
    imapConfig: ImapConfig;
    oauthTokens?: {
      accessToken: string;
      refreshToken: string;
    };
  }>> {
    const query = `
      SELECT id, user_id, email_address, provider, encrypted_password,
             imap_host, imap_port, imap_secure, access_token, refresh_token
      FROM email_accounts
      WHERE is_active = true AND sync_enabled = true
    `;

    const result = await this.pool.query(query);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      emailAddress: row.email_address,
      provider: row.provider,
      imapConfig: {
        user: row.email_address,
        // Skip decryption for OAuth accounts (password field contains 'oauth' placeholder)
        password: row.access_token ? '' : decrypt(row.encrypted_password),
        host: row.imap_host,
        port: row.imap_port,
        tls: row.imap_secure
      },
      oauthTokens: row.access_token ? {
        accessToken: row.access_token,
        refreshToken: row.refresh_token
      } : undefined
    }));
  }

  /**
   * Update email account sync status
   */
  async updateSyncStatus(accountId: string, lastSyncAt: Date, error: string | null = null): Promise<void> {
    const query = `
      UPDATE email_accounts
      SET last_sync_at = $1, last_sync_error = $2, updated_at = NOW()
      WHERE id = $3
    `;

    await this.pool.query(query, [lastSyncAt, error, accountId]);
  }

  /**
   * Update email account settings
   */
  async updateEmailAccount(
    accountId: string,
    userId: string,
    updates: Partial<Pick<EmailAccount, 'accountName' | 'syncEnabled' | 'isActive'>>
  ): Promise<EmailAccount | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.accountName !== undefined) {
      setClauses.push(`account_name = $${paramIndex++}`);
      values.push(updates.accountName);
    }

    if (updates.syncEnabled !== undefined) {
      setClauses.push(`sync_enabled = $${paramIndex++}`);
      values.push(updates.syncEnabled);
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (setClauses.length === 0) {
      return this.getEmailAccount(accountId, userId);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(accountId, userId);

    const query = `
      UPDATE email_accounts
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEmailAccount(result.rows[0]);
  }

  /**
   * Delete an email account and all associated data (emails, badges, contacts)
   */
  async deleteEmailAccount(accountId: string, userId: string): Promise<{ deleted: boolean; emailsDeleted: number }> {
    // Start a transaction to ensure all deletions succeed or fail together
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // First, delete email_badges for emails in this account
      await client.query(`
        DELETE FROM email_badges
        WHERE email_id IN (
          SELECT id FROM emails WHERE email_account_id = $1 AND user_id = $2
        )
      `, [accountId, userId]);

      // Delete all emails for this account
      const emailDeleteResult = await client.query(`
        DELETE FROM emails
        WHERE email_account_id = $1 AND user_id = $2
      `, [accountId, userId]);

      const emailsDeleted = emailDeleteResult.rowCount || 0;

      // Delete contacts associated with this account (if contacts table exists)
      try {
        await client.query(`
          DELETE FROM contacts WHERE email_account_id = $1
        `, [accountId]);
      } catch (e) {
        // Contacts table might not exist, ignore
      }

      // Finally, delete the email account
      const accountDeleteResult = await client.query(`
        DELETE FROM email_accounts
        WHERE id = $1 AND user_id = $2
      `, [accountId, userId]);

      await client.query('COMMIT');

      return {
        deleted: accountDeleteResult.rowCount ? accountDeleteResult.rowCount > 0 : false,
        emailsDeleted
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get sync status for all user accounts (for initial sync indicator)
   */
  async getSyncStatus(userId: string): Promise<{
    accounts: Array<{
      id: string;
      emailAddress: string;
      initialSyncComplete: boolean;
      lastSyncAt: Date | null;
      emailCount: number;
    }>;
    hasAccountsSyncing: boolean;
  }> {
    const query = `
      SELECT
        ea.id,
        ea.email_address,
        ea.initial_sync_complete,
        ea.last_sync_at,
        COALESCE(ec.email_count, 0) as email_count
      FROM email_accounts ea
      LEFT JOIN (
        SELECT email_account_id, COUNT(*) as email_count
        FROM emails
        GROUP BY email_account_id
      ) ec ON ec.email_account_id = ea.id
      WHERE ea.user_id = $1 AND ea.is_active = true
    `;

    const result = await this.pool.query(query, [userId]);

    const accounts = result.rows.map(row => ({
      id: row.id,
      emailAddress: row.email_address,
      initialSyncComplete: row.initial_sync_complete === true,
      lastSyncAt: row.last_sync_at,
      emailCount: parseInt(row.email_count) || 0
    }));

    const hasAccountsSyncing = accounts.some(a => !a.initialSyncComplete);

    return { accounts, hasAccountsSyncing };
  }

  /**
   * Get email statistics for an account
   */
  async getAccountStats(accountId: string, userId: string) {
    const query = `
      SELECT
        COUNT(*) as total_emails,
        COUNT(CASE WHEN ai_analyzed_at IS NOT NULL THEN 1 END) as analyzed_emails,
        COUNT(CASE WHEN ai_analyzed_at IS NULL THEN 1 END) as pending_emails,
        COUNT(CASE WHEN ai_raw_response::text LIKE '%error%' THEN 1 END) as failed_emails
      FROM emails
      WHERE user_id = $1 AND email_account_id = $2
    `;

    const result = await this.pool.query(query, [userId, accountId]);
    const row = result.rows[0];

    return {
      total_emails: parseInt(row.total_emails) || 0,
      analyzed_emails: parseInt(row.analyzed_emails) || 0,
      pending_emails: parseInt(row.pending_emails) || 0,
      failed_emails: parseInt(row.failed_emails) || 0
    };
  }

  /**
   * Map database row to EmailAccount object
   */
  private mapRowToEmailAccount(row: any): EmailAccount {
    return {
      id: row.id,
      userId: row.user_id,
      emailAddress: row.email_address,
      accountName: row.account_name,
      provider: row.provider,
      imapHost: row.imap_host,
      imapPort: row.imap_port,
      imapSecure: row.imap_secure,
      isActive: row.is_active,
      lastSyncAt: row.last_sync_at,
      lastSyncError: row.last_sync_error,
      syncEnabled: row.sync_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
