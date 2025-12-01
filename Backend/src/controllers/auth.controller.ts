import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { google } from 'googleapis';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { logger } from '../config/logger';
import { pool } from '../config/database';
import { GmailPushService } from '../services/gmail-push.service';

export class AuthController {
  private authService: AuthService;
  private sessionService: SessionService;

  constructor() {
    this.authService = new AuthService();
    this.sessionService = new SessionService();
  }

  /**
   * Sign up new user
   */
  signUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, displayName, rememberMe = true } = req.body;

      // Check if user already exists
      const existingUser = await this.authService.findUserByEmail(email);
      if (existingUser) {
        res.status(400).json({
          error: 'User already exists',
          message: 'A user with this email already exists'
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await this.authService.createUser({
        email,
        password: hashedPassword,
        displayName: displayName || null
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id, rememberMe);

      // Create session with device info
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
        deviceType: 'web'
      };
      const session = await this.sessionService.createSession(user.id, refreshToken, deviceInfo, rememberMe);

      logger.info(`New user signed up: ${user.id}`);

      res.status(201).json({
        access_token: accessToken,
        refresh_token: refreshToken,
        session_id: session.id,
        user: this.sanitizeUser(user)
      });
    } catch (error) {
      logger.error('Sign up error:', error);
      next(error);
    }
  };

  /**
   * Login existing user
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, rememberMe = false } = req.body;
      logger.info(`Login attempt for: ${email}, rememberMe: ${rememberMe}`);

      // Find user
      const user = await this.authService.findUserByEmail(email);
      if (!user) {
        logger.warn(`User not found: ${email}`);
        res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
        return;
      }

      logger.info(`User found, verifying password. Hash: ${user.password.substring(0, 20)}...`);

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      logger.info(`Password valid: ${isPasswordValid}`);

      if (!isPasswordValid) {
        logger.warn(`Invalid password for: ${email}`);
        res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
        return;
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id, rememberMe);

      // Create session with device info
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
        deviceType: 'web'
      };
      const session = await this.sessionService.createSession(user.id, refreshToken, deviceInfo, rememberMe);

      // Update last login
      await this.authService.updateLastLogin(user.id);

      logger.info(`User logged in: ${user.id}, session: ${session.id}, rememberMe: ${rememberMe}`);

      res.json({
        access_token: accessToken,
        refresh_token: refreshToken,
        session_id: session.id,
        remember_me: rememberMe,
        user: {
          id: user.id,
          email: user.email,
          name: user.displayName || '',
          email_provider: user.emailProvider?.toLowerCase() || 'gmail',
          preferences: {
            theme: 'system',
            notifications_enabled: true,
            auto_summarize: true,
            smart_categorization: true
          },
          created_at: user.createdAt
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  };

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token JWT
      let decoded: { userId: string };
      try {
        decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET!
        ) as { userId: string };
      } catch (jwtError) {
        res.status(401).json({
          error: 'Invalid token',
          message: 'Refresh token is invalid or expired'
        });
        return;
      }

      // Validate session exists and is active
      const session = await this.sessionService.validateSession(refreshToken);
      if (!session) {
        res.status(401).json({
          error: 'Invalid session',
          message: 'Session is invalid or expired'
        });
        return;
      }

      // Get user
      const user = await this.authService.findUserById(decoded.userId);
      if (!user) {
        res.status(401).json({
          error: 'User not found',
          message: 'User associated with token not found'
        });
        return;
      }

      // Generate new tokens (token rotation)
      const newAccessToken = this.generateAccessToken(user.id);
      const newRefreshToken = this.generateRefreshToken(user.id, session.rememberMe);

      // Update session with new token
      await this.sessionService.refreshSession(refreshToken, newRefreshToken);

      res.json({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        session_id: session.id,
        user: this.sanitizeUser(user)
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(401).json({
        error: 'Invalid token',
        message: 'Failed to refresh token'
      });
    }
  };

  /**
   * Logout user
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Invalidate session by token
        await this.sessionService.invalidateSessionByToken(refreshToken);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  };

  /**
   * Get all active sessions for current user
   */
  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const sessions = await this.sessionService.getUserSessions(userId);

      res.json({
        sessions: sessions.map(session => ({
          id: session.id,
          device_name: session.deviceName,
          device_type: session.deviceType,
          ip_address: session.ipAddress,
          created_at: session.createdAt,
          last_activity_at: session.lastActivityAt,
          is_current: false // Will be set by frontend based on session_id match
        }))
      });
    } catch (error) {
      logger.error('Get sessions error:', error);
      next(error);
    }
  };

  /**
   * Revoke a specific session
   */
  revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const { sessionId } = req.params;

      const success = await this.sessionService.invalidateSession(sessionId, userId);

      if (!success) {
        res.status(404).json({
          error: 'Session not found',
          message: 'Session does not exist or already revoked'
        });
        return;
      }

      res.json({ message: 'Session revoked successfully' });
    } catch (error) {
      logger.error('Revoke session error:', error);
      next(error);
    }
  };

  /**
   * Revoke all sessions except current (logout everywhere)
   */
  revokeAllSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const count = await this.sessionService.invalidateAllUserSessions(userId);

      res.json({
        message: `${count} session(s) revoked successfully`,
        revoked_count: count
      });
    } catch (error) {
      logger.error('Revoke all sessions error:', error);
      next(error);
    }
  };

  /**
   * Initiate Gmail OAuth flow
   */
  initiateGmailOAuth = async (req: Request, res: Response): Promise<void> => {
    // Get user ID from query or session (for now, pass it as query param)
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/contacts.other.readonly' // For sender profile photos
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId // Pass userId in state parameter
    });

    res.redirect(authUrl);
  };

  /**
   * Handle Gmail OAuth callback
   */
  handleGmailCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, state: userId } = req.query;

      if (!code || !userId) {
        res.status(400).json({ error: 'Missing authorization code or user ID' });
        return;
      }

      logger.info(`Gmail OAuth callback received for user: ${userId}`);

      // Exchange code for tokens
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
      );

      const { tokens } = await oauth2Client.getToken(code as string);
      logger.info('Successfully exchanged code for tokens');

      // Get user's email from Gmail
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const gmailAddress = userInfo.data.email;

      logger.info(`Gmail connected: ${gmailAddress}`);

      // Check if this email account already exists for this user
      const existingAccount = await pool.query(
        'SELECT id FROM email_accounts WHERE user_id = $1 AND email_address = $2',
        [userId, gmailAddress]
      );

      if (existingAccount.rows.length > 0) {
        // Update existing account with new tokens
        await pool.query(
          `UPDATE email_accounts
           SET access_token = $1, refresh_token = $2, token_expires_at = $3,
               last_sync_error = NULL, updated_at = NOW()
           WHERE user_id = $4 AND email_address = $5`,
          [
            tokens.access_token,
            tokens.refresh_token,
            tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            userId,
            gmailAddress
          ]
        );
        logger.info(`Updated Gmail tokens for ${gmailAddress}`);
      } else {
        // Create new email account with OAuth tokens
        await pool.query(
          `INSERT INTO email_accounts (
            user_id, email_address, account_name, provider,
            imap_host, imap_port, imap_secure, encrypted_password,
            access_token, refresh_token, token_expires_at,
            is_active, sync_enabled
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            userId,
            gmailAddress,
            `Gmail - ${gmailAddress}`,
            'gmail',
            'imap.gmail.com', // Not used for OAuth but required field
            993,
            true,
            'oauth', // Placeholder for password field
            tokens.access_token,
            tokens.refresh_token,
            tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            true,
            true
          ]
        );
        logger.info(`Created new Gmail account for ${gmailAddress}`);
      }

      // Set up Gmail push notifications (watch)
      // Get the account ID for this email
      const accountIdQuery = await pool.query(
        'SELECT id FROM email_accounts WHERE user_id = $1 AND email_address = $2',
        [userId, gmailAddress]
      );

      if (accountIdQuery.rows.length > 0 && tokens.access_token && tokens.refresh_token) {
        const emailAccountId = accountIdQuery.rows[0].id;

        // Set up Gmail watch in the background (don't block the redirect)
        GmailPushService.setupWatch(
          {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            clientId: process.env.GMAIL_CLIENT_ID || '',
            clientSecret: process.env.GMAIL_CLIENT_SECRET || ''
          },
          emailAccountId
        ).then(() => {
          logger.info(`Gmail push watch set up for ${gmailAddress}`);
        }).catch((error) => {
          logger.error(`Failed to set up Gmail push watch for ${gmailAddress}:`, error);
        });
      }

      // Redirect to frontend success page
      res.redirect(`http://localhost:3001/settings?gmail=connected&email=${encodeURIComponent(gmailAddress as string)}`);
    } catch (error: any) {
      logger.error('Gmail OAuth error:', error);
      // Redirect to frontend with error
      res.redirect(`http://localhost:3001/settings?gmail=error&message=${encodeURIComponent(error.message)}`);
    }
  };

  /**
   * Initiate Outlook OAuth flow
   */
  initiateOutlookOAuth = async (req: Request, res: Response): Promise<void> => {
    // TODO: Implement Outlook OAuth flow
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.OUTLOOK_CLIENT_ID}&redirect_uri=${process.env.OUTLOOK_REDIRECT_URI}&response_type=code&scope=https://outlook.office.com/Mail.Read`;
    res.redirect(authUrl);
  };

  /**
   * Handle Outlook OAuth callback
   */
  handleOutlookCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = req.query;
      // TODO: Exchange code for tokens and save to user account
      logger.info('Outlook OAuth callback received');
      res.json({ message: 'Outlook connected successfully' });
    } catch (error) {
      logger.error('Outlook OAuth error:', error);
      next(error);
    }
  };

  // Helper methods

  private generateAccessToken(userId: string): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    return jwt.sign({ userId }, secret, { expiresIn } as any);
  }

  private generateRefreshToken(userId: string, rememberMe: boolean = false): string {
    const secret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    // Longer expiration for "Remember Me"
    const expiresIn = rememberMe
      ? (process.env.JWT_REFRESH_EXPIRES_LONG || '30d')
      : (process.env.JWT_REFRESH_EXPIRES_IN || '7d');

    return jwt.sign({ userId }, secret, { expiresIn } as any);
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
