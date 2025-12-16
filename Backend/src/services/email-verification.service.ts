import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { query } from '../config/database';
import { logger } from '../config/logger';

export interface VerificationResult {
  success: boolean;
  message: string;
  userId?: string;
}

export class EmailVerificationService {
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Generate a secure verification token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate token expiry (24 hours from now)
   */
  generateTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    return expiry;
  }

  /**
   * Save verification token for user
   */
  async saveVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await query(
      `UPDATE users
       SET verification_token = $1, verification_token_expires_at = $2
       WHERE id = $3`,
      [token, expiresAt, userId]
    );
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<VerificationResult> {
    try {
      // Find user with this token
      const result = await query(
        `SELECT id, email, verification_token_expires_at, email_verified
         FROM users
         WHERE verification_token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Invalid verification token' };
      }

      const user = result.rows[0];

      // Check if already verified
      if (user.email_verified) {
        return { success: true, message: 'Email already verified', userId: user.id };
      }

      // Check token expiry
      if (new Date() > new Date(user.verification_token_expires_at)) {
        return { success: false, message: 'Verification token has expired. Please request a new one.' };
      }

      // Mark as verified and clear token
      await query(
        `UPDATE users
         SET email_verified = TRUE,
             verification_token = NULL,
             verification_token_expires_at = NULL
         WHERE id = $1`,
        [user.id]
      );

      logger.info(`Email verified for user ${user.id} (${user.email})`);

      return { success: true, message: 'Email verified successfully!', userId: user.id };
    } catch (error) {
      logger.error('Email verification error:', error);
      return { success: false, message: 'Failed to verify email' };
    }
  }

  /**
   * Check if user's email is verified
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    const result = await query(
      `SELECT email_verified FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0]?.email_verified || false;
  }

  /**
   * Create mail transporter
   * Uses Gmail OAuth if available, falls back to SMTP, or dev mode (console)
   */
  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    // Option 1: Use SMTP if configured
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      logger.info('Using SMTP transporter for email verification');
      return this.transporter;
    }

    // Option 2: Use Gmail OAuth with a service account
    if (process.env.NEMI_GMAIL_USER && process.env.GMAIL_CLIENT_ID) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
      );

      if (process.env.NEMI_GMAIL_REFRESH_TOKEN) {
        oauth2Client.setCredentials({
          refresh_token: process.env.NEMI_GMAIL_REFRESH_TOKEN
        });

        const { token } = await oauth2Client.getAccessToken();

        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: process.env.NEMI_GMAIL_USER,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.NEMI_GMAIL_REFRESH_TOKEN,
            accessToken: token || undefined
          }
        });
        logger.info('Using Gmail OAuth transporter for email verification');
        return this.transporter;
      }
    }

    // Option 3: Development mode - use ethereal (fake SMTP)
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('No email transport configured - using console output for development');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true // Outputs email as JSON to console
      });
      return this.transporter;
    }

    throw new Error('No email transport configured. Please set SMTP or Gmail OAuth credentials.');
  }

  /**
   * Send verification email with branded template
   */
  async sendVerificationEmail(email: string, token: string, displayName?: string): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}`;
      const name = displayName || email.split('@')[0];

      const htmlContent = this.generateEmailTemplate(name, verificationUrl);

      const mailOptions = {
        from: `"NEMI" <${process.env.NEMI_GMAIL_USER || process.env.SMTP_USER || 'noreply@nemi.app'}>`,
        to: email,
        subject: 'Verify your NEMI account',
        html: htmlContent,
        text: `
Welcome to NEMI, ${name}!

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with NEMI, you can safely ignore this email.

- The NEMI Team
        `.trim()
      };

      const info = await transporter.sendMail(mailOptions);

      // In dev mode with jsonTransport, log the email
      if (process.env.NODE_ENV !== 'production' && info.message) {
        logger.info('Development mode - Email content:', JSON.parse(info.message));
        logger.info(`Verification URL: ${verificationUrl}`);
      }

      logger.info(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      return false;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get user info
      const result = await query(
        `SELECT email, display_name, email_verified FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = result.rows[0];

      if (user.email_verified) {
        return { success: false, message: 'Email is already verified' };
      }

      // Generate new token
      const token = this.generateToken();
      const expiresAt = this.generateTokenExpiry();

      // Save token
      await this.saveVerificationToken(userId, token, expiresAt);

      // Send email
      const sent = await this.sendVerificationEmail(user.email, token, user.display_name);

      if (!sent) {
        return { success: false, message: 'Failed to send verification email' };
      }

      return { success: true, message: 'Verification email sent' };
    } catch (error) {
      logger.error('Resend verification email error:', error);
      return { success: false, message: 'Failed to resend verification email' };
    }
  }

  /**
   * Generate branded HTML email template
   */
  private generateEmailTemplate(name: string, verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your NEMI account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px;">
              <div style="display: inline-flex; align-items: center; gap: 12px;">
                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 24px; font-weight: bold;">N</span>
                </div>
                <span style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">NEMI</span>
              </div>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td style="padding: 0 20px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(99, 102, 241, 0.2);">
                <!-- Decorative gradient line at top -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);"></td>
                </tr>

                <!-- Welcome message -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                      Welcome to NEMI, ${name}! &#127881;
                    </h1>
                  </td>
                </tr>

                <!-- Body text -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                      Thanks for signing up! We're excited to help you take control of your inbox with AI-powered email management.
                    </p>
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                      Please verify your email address to get started:
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <table role="presentation" style="border-collapse: collapse;">
                      <tr>
                        <td style="border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
                          <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Alternative link -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #71717a;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; line-height: 1.5; word-break: break-all;">
                      <a href="${verificationUrl}" style="color: #8b5cf6; text-decoration: none;">${verificationUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Expiry notice -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <div style="padding: 16px 20px; background: rgba(99, 102, 241, 0.1); border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.2);">
                      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">
                        &#9201; This link will expire in <strong style="color: #ffffff;">24 hours</strong>
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #71717a; text-align: center;">
                If you didn't create an account with NEMI, you can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 13px; color: #52525b; text-align: center;">
                &copy; ${new Date().getFullYear()} NEMI. Your AI-powered email assistant.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}

export const emailVerificationService = new EmailVerificationService();
