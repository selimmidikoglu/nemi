import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import axios from 'axios';
import { google } from 'googleapis';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { emailVerificationService } from '../services/email-verification.service';
import { logger } from '../config/logger';
import { pool } from '../config/database';
import { GmailPushService } from '../services/gmail-push.service';
import { OutlookPushService } from '../services/outlook-push.service';

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

      // Generate and save verification token
      const verificationToken = emailVerificationService.generateToken();
      const tokenExpiry = emailVerificationService.generateTokenExpiry();
      await emailVerificationService.saveVerificationToken(user.id, verificationToken, tokenExpiry);

      // Send verification email (don't block signup if it fails)
      emailVerificationService.sendVerificationEmail(email, verificationToken, displayName).catch(err => {
        logger.error('Failed to send verification email:', err);
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
        user: this.sanitizeUser(user),
        email_verification_sent: true
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
          email_verified: user.emailVerified || false,
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
      'https://www.googleapis.com/auth/contacts.readonly', // For contacts autocomplete
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
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const scopes = [
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/User.Read',
      'offline_access' // Required for refresh token
    ];

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', process.env.OUTLOOK_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.OUTLOOK_REDIRECT_URI!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', userId); // Pass userId in state
    authUrl.searchParams.set('response_mode', 'query');

    res.redirect(authUrl.toString());
  };

  /**
   * Handle Outlook OAuth callback
   */
  handleOutlookCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, state: userId, error, error_description } = req.query;

      if (error) {
        logger.error(`Outlook OAuth error: ${error} - ${error_description}`);
        res.redirect(`http://localhost:3001/settings?outlook=error&message=${encodeURIComponent(error_description as string || error as string)}`);
        return;
      }

      if (!code || !userId) {
        res.status(400).json({ error: 'Missing authorization code or user ID' });
        return;
      }

      logger.info(`Outlook OAuth callback received for user: ${userId}`);

      // Exchange code for tokens
      const tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: process.env.OUTLOOK_CLIENT_ID!,
          client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
          code: code as string,
          redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
          grant_type: 'authorization_code',
          scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access'
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      logger.info('Successfully exchanged Outlook code for tokens');

      // Get user's email from Microsoft Graph API
      const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      // Microsoft returns email in 'mail' or 'userPrincipalName'
      const outlookEmail = userResponse.data.mail || userResponse.data.userPrincipalName;
      const displayName = userResponse.data.displayName;

      logger.info(`Outlook connected: ${outlookEmail}`);

      // Check if this email account already exists for this user
      const existingAccount = await pool.query(
        'SELECT id FROM email_accounts WHERE user_id = $1 AND email_address = $2',
        [userId, outlookEmail]
      );

      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      if (existingAccount.rows.length > 0) {
        // Update existing account with new tokens
        await pool.query(
          `UPDATE email_accounts
           SET access_token = $1, refresh_token = $2, token_expires_at = $3,
               last_sync_error = NULL, updated_at = NOW()
           WHERE user_id = $4 AND email_address = $5`,
          [access_token, refresh_token, tokenExpiresAt, userId, outlookEmail]
        );
        logger.info(`Updated Outlook tokens for ${outlookEmail}`);
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
            outlookEmail,
            displayName ? `Outlook - ${displayName}` : `Outlook - ${outlookEmail}`,
            'outlook',
            'outlook.office365.com', // Not used for OAuth but required field
            993,
            true,
            'oauth', // Placeholder for password field
            access_token,
            refresh_token,
            tokenExpiresAt,
            true,
            true
          ]
        );
        logger.info(`Created new Outlook account for ${outlookEmail}`);
      }

      // Get the account ID for this email
      const accountIdQuery = await pool.query(
        'SELECT id FROM email_accounts WHERE user_id = $1 AND email_address = $2',
        [userId, outlookEmail]
      );

      if (accountIdQuery.rows.length > 0 && access_token && refresh_token) {
        const emailAccountId = accountIdQuery.rows[0].id;

        // Set up Outlook push notifications (Microsoft Graph subscription)
        const webhookBaseUrl = process.env.OUTLOOK_WEBHOOK_BASE_URL ||
          `https://${process.env.NGROK_DOMAIN}`;
        const webhookUrl = `${webhookBaseUrl}/api/outlook/webhook`;

        OutlookPushService.createSubscription(
          {
            accessToken: access_token,
            refreshToken: refresh_token,
            clientId: process.env.OUTLOOK_CLIENT_ID || '',
            clientSecret: process.env.OUTLOOK_CLIENT_SECRET || ''
          },
          emailAccountId,
          webhookUrl
        ).then(() => {
          logger.info(`Outlook push subscription created for ${outlookEmail}`);
        }).catch((error) => {
          logger.error(`Failed to create Outlook push subscription for ${outlookEmail}:`, error.response?.data || error.message);
        });
      }

      // Redirect to frontend success page
      res.redirect(`http://localhost:3001/settings?outlook=connected&email=${encodeURIComponent(outlookEmail as string)}`);
    } catch (error: any) {
      logger.error('Outlook OAuth error:', error.response?.data || error.message);
      res.redirect(`http://localhost:3001/settings?outlook=error&message=${encodeURIComponent(error.response?.data?.error_description || error.message)}`);
    }
  };

  /**
   * Verify email with token
   * GET /api/auth/verify-email?token=xxx
   */
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Verification token is required' });
        return;
      }

      const result = await emailVerificationService.verifyEmail(token);

      if (result.success) {
        // Redirect to frontend success page
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?status=success`);
      } else {
        // Redirect to frontend error page
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?status=error&message=${encodeURIComponent(result.message)}`);
      }
    } catch (error) {
      logger.error('Verify email error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?status=error&message=${encodeURIComponent('An error occurred')}`);
    }
  };

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  resendVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await emailVerificationService.resendVerificationEmail(userId);

      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      logger.error('Resend verification error:', error);
      res.status(500).json({ error: 'Failed to resend verification email' });
    }
  };

  /**
   * Check verification status
   * GET /api/auth/verification-status
   */
  getVerificationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const isVerified = await emailVerificationService.isEmailVerified(userId);

      res.json({ email_verified: isVerified });
    } catch (error) {
      logger.error('Get verification status error:', error);
      res.status(500).json({ error: 'Failed to get verification status' });
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
