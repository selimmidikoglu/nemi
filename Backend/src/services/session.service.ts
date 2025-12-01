import { query } from '../config/database';
import { logger } from '../config/logger';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export interface Session {
  id: string;
  userId: string;
  deviceName: string | null;
  deviceType: string;
  userAgent: string | null;
  ipAddress: string | null;
  rememberMe: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface DeviceInfo {
  deviceName?: string;
  deviceType?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Token expiration durations
const REFRESH_TOKEN_EXPIRY_SHORT = '7 days';   // Remember me OFF
const REFRESH_TOKEN_EXPIRY_LONG = '30 days';   // Remember me ON
const BCRYPT_ROUNDS = 10;

export class SessionService {
  /**
   * Hash a refresh token for secure storage
   */
  private async hashToken(token: string): Promise<string> {
    // Use SHA-256 for faster lookups, bcrypt would be too slow for every request
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    refreshToken: string,
    deviceInfo: DeviceInfo,
    rememberMe: boolean
  ): Promise<Session> {
    const tokenHash = await this.hashToken(refreshToken);
    const expiryInterval = rememberMe ? REFRESH_TOKEN_EXPIRY_LONG : REFRESH_TOKEN_EXPIRY_SHORT;

    // Parse user agent to get device name
    const deviceName = this.parseDeviceName(deviceInfo.userAgent);
    const deviceType = deviceInfo.deviceType || this.detectDeviceType(deviceInfo.userAgent);

    const result = await query(
      `INSERT INTO sessions (
        user_id, refresh_token_hash, device_name, device_type,
        user_agent, ip_address, remember_me, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::inet, $7, NOW() + INTERVAL '${expiryInterval}')
      RETURNING
        id, user_id as "userId", device_name as "deviceName",
        device_type as "deviceType", user_agent as "userAgent",
        ip_address as "ipAddress", remember_me as "rememberMe",
        created_at as "createdAt", last_activity_at as "lastActivityAt",
        expires_at as "expiresAt", is_active as "isActive"`,
      [userId, tokenHash, deviceName, deviceType, deviceInfo.userAgent, deviceInfo.ipAddress || null, rememberMe]
    );

    logger.info(`Session created for user ${userId}, device: ${deviceName}, rememberMe: ${rememberMe}`);
    return result.rows[0];
  }

  /**
   * Validate a session by refresh token
   */
  async validateSession(refreshToken: string): Promise<Session | null> {
    const tokenHash = await this.hashToken(refreshToken);

    const result = await query(
      `SELECT
        id, user_id as "userId", device_name as "deviceName",
        device_type as "deviceType", user_agent as "userAgent",
        ip_address as "ipAddress", remember_me as "rememberMe",
        created_at as "createdAt", last_activity_at as "lastActivityAt",
        expires_at as "expiresAt", is_active as "isActive"
      FROM sessions
      WHERE refresh_token_hash = $1
        AND is_active = true
        AND expires_at > NOW()`,
      [tokenHash]
    );

    return result.rows[0] || null;
  }

  /**
   * Refresh a session with a new token (token rotation)
   */
  async refreshSession(
    oldRefreshToken: string,
    newRefreshToken: string
  ): Promise<Session | null> {
    const oldTokenHash = await this.hashToken(oldRefreshToken);
    const newTokenHash = await this.hashToken(newRefreshToken);

    // First, get the session to check rememberMe setting
    const session = await this.validateSession(oldRefreshToken);
    if (!session) {
      return null;
    }

    const expiryInterval = session.rememberMe ? REFRESH_TOKEN_EXPIRY_LONG : REFRESH_TOKEN_EXPIRY_SHORT;

    // Update the session with new token and extend expiration
    const result = await query(
      `UPDATE sessions
       SET refresh_token_hash = $1,
           last_activity_at = NOW(),
           expires_at = NOW() + INTERVAL '${expiryInterval}'
       WHERE refresh_token_hash = $2
         AND is_active = true
         AND expires_at > NOW()
       RETURNING
         id, user_id as "userId", device_name as "deviceName",
         device_type as "deviceType", user_agent as "userAgent",
         ip_address as "ipAddress", remember_me as "rememberMe",
         created_at as "createdAt", last_activity_at as "lastActivityAt",
         expires_at as "expiresAt", is_active as "isActive"`,
      [newTokenHash, oldTokenHash]
    );

    if (result.rows.length > 0) {
      logger.info(`Session refreshed for user ${result.rows[0].userId}`);
    }

    return result.rows[0] || null;
  }

  /**
   * Update last activity timestamp for a session
   */
  async updateLastActivity(refreshToken: string): Promise<void> {
    const tokenHash = await this.hashToken(refreshToken);

    await query(
      `UPDATE sessions SET last_activity_at = NOW()
       WHERE refresh_token_hash = $1 AND is_active = true`,
      [tokenHash]
    );
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await query(
      `UPDATE sessions SET is_active = false
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [sessionId, userId]
    );

    if (result.rows.length > 0) {
      logger.info(`Session ${sessionId} invalidated for user ${userId}`);
      return true;
    }
    return false;
  }

  /**
   * Invalidate a session by refresh token
   */
  async invalidateSessionByToken(refreshToken: string): Promise<boolean> {
    const tokenHash = await this.hashToken(refreshToken);

    const result = await query(
      `UPDATE sessions SET is_active = false
       WHERE refresh_token_hash = $1
       RETURNING id, user_id`,
      [tokenHash]
    );

    if (result.rows.length > 0) {
      logger.info(`Session invalidated for user ${result.rows[0].user_id}`);
      return true;
    }
    return false;
  }

  /**
   * Invalidate all sessions for a user (logout everywhere)
   */
  async invalidateAllUserSessions(userId: string): Promise<number> {
    const result = await query(
      `UPDATE sessions SET is_active = false
       WHERE user_id = $1 AND is_active = true
       RETURNING id`,
      [userId]
    );

    const count = result.rows.length;
    logger.info(`All ${count} sessions invalidated for user ${userId}`);
    return count;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const result = await query(
      `SELECT
        id, user_id as "userId", device_name as "deviceName",
        device_type as "deviceType", user_agent as "userAgent",
        ip_address as "ipAddress", remember_me as "rememberMe",
        created_at as "createdAt", last_activity_at as "lastActivityAt",
        expires_at as "expiresAt", is_active as "isActive"
      FROM sessions
      WHERE user_id = $1
        AND is_active = true
        AND expires_at > NOW()
      ORDER BY last_activity_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string, userId: string): Promise<Session | null> {
    const result = await query(
      `SELECT
        id, user_id as "userId", device_name as "deviceName",
        device_type as "deviceType", user_agent as "userAgent",
        ip_address as "ipAddress", remember_me as "rememberMe",
        created_at as "createdAt", last_activity_at as "lastActivityAt",
        expires_at as "expiresAt", is_active as "isActive"
      FROM sessions
      WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await query(
      `DELETE FROM sessions
       WHERE expires_at < NOW() OR is_active = false
       RETURNING id`
    );

    const count = result.rows.length;
    if (count > 0) {
      logger.info(`Cleaned up ${count} expired sessions`);
    }
    return count;
  }

  /**
   * Parse user agent to get a friendly device name
   */
  private parseDeviceName(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';

    // Browser detection
    let browser = 'Unknown Browser';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      browser = 'Opera';
    }

    // OS detection
    let os = '';
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      os = 'Mac';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    return os ? `${browser} on ${os}` : browser;
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return 'web';

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    return 'web';
  }
}
