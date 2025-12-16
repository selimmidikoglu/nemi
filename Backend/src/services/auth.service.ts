import { query } from '../config/database';
import { logger } from '../config/logger';

export interface User {
  id: string;
  email: string;
  password: string;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  emailProvider: string;
  emailProviderConnected: boolean;
  emailVerified: boolean;
}

export class AuthService {
  /**
   * Create a new user
   */
  async createUser(data: {
    email: string;
    password: string;
    displayName: string | null;
  }): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, password, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name as "displayName", photo_url as "photoUrl",
                 created_at as "createdAt", last_login_at as "lastLoginAt",
                 email_provider as "emailProvider",
                 email_provider_connected as "emailProviderConnected",
                 email_verified as "emailVerified"`,
      [data.email, data.password, data.displayName]
    );

    return result.rows[0];
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, password, display_name as "displayName",
              photo_url as "photoUrl", created_at as "createdAt",
              last_login_at as "lastLoginAt", email_provider as "emailProvider",
              email_provider_connected as "emailProviderConnected",
              email_verified as "emailVerified"
       FROM users
       WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, password, display_name as "displayName",
              photo_url as "photoUrl", created_at as "createdAt",
              last_login_at as "lastLoginAt", email_provider as "emailProvider",
              email_provider_connected as "emailProviderConnected",
              email_verified as "emailVerified"
       FROM users
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  /**
   * Save refresh token
   */
  async saveRefreshToken(userId: string, token: string): Promise<void> {
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '7 days'`,
      [userId, token]
    );
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(userId: string, token: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM refresh_tokens
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW()`,
      [userId, token]
    );

    return result.rows.length > 0;
  }

  /**
   * Invalidate refresh token
   */
  async invalidateRefreshToken(token: string): Promise<void> {
    await query(
      `DELETE FROM refresh_tokens WHERE token = $1`,
      [token]
    );
  }
}
