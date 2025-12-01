import apn from 'apn';
import { query } from '../config/database';
import { logger } from '../config/logger';

export class PushService {
  private apnProvider: apn.Provider | null = null;

  constructor() {
    this.initializeAPNProvider();
  }

  /**
   * Initialize Apple Push Notification provider
   */
  private initializeAPNProvider(): void {
    try {
      if (process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID) {
        const options: apn.ProviderOptions = {
          token: {
            key: process.env.APNS_PRIVATE_KEY_PATH || '',
            keyId: process.env.APNS_KEY_ID,
            teamId: process.env.APNS_TEAM_ID
          },
          production: process.env.APNS_PRODUCTION === 'true'
        };

        this.apnProvider = new apn.Provider(options);
        logger.info('APNs provider initialized');
      } else {
        logger.warn('APNs credentials not configured');
      }
    } catch (error) {
      logger.error('Failed to initialize APNs provider:', error);
    }
  }

  /**
   * Register device token
   */
  async registerDevice(userId: string, deviceToken: string): Promise<void> {
    await query(
      `INSERT INTO device_tokens (user_id, token, platform, created_at)
       VALUES ($1, $2, 'ios', NOW())
       ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()`,
      [userId, deviceToken]
    );

    logger.info(`Device token registered for user ${userId}`);
  }

  /**
   * Unregister device token
   */
  async unregisterDevice(userId: string, deviceToken: string): Promise<void> {
    await query(
      `DELETE FROM device_tokens WHERE user_id = $1 AND token = $2`,
      [userId, deviceToken]
    );

    logger.info(`Device token unregistered for user ${userId}`);
  }

  /**
   * Get user's device tokens
   */
  async getUserDevices(userId: string): Promise<string[]> {
    const result = await query(
      `SELECT token FROM device_tokens WHERE user_id = $1 AND platform = 'ios'`,
      [userId]
    );

    return result.rows.map((row: any) => row.token);
  }

  /**
   * Send notification to devices
   */
  async sendToDevices(
    deviceTokens: string[],
    notification: { title: string; body: string; data?: any }
  ): Promise<{ success: number; failed: number }> {
    if (!this.apnProvider) {
      throw new Error('APNs provider not initialized');
    }

    let success = 0;
    let failed = 0;

    for (const deviceToken of deviceTokens) {
      try {
        const apnNotification = new apn.Notification();
        apnNotification.alert = {
          title: notification.title,
          body: notification.body
        };
        apnNotification.badge = 1;
        apnNotification.sound = 'default';
        apnNotification.topic = process.env.APNS_BUNDLE_ID || 'com.nemi.inbox';

        if (notification.data) {
          apnNotification.payload = notification.data;
        }

        const result = await this.apnProvider.send(apnNotification, deviceToken);

        if (result.failed.length > 0) {
          logger.error(`Failed to send notification to ${deviceToken}:`, result.failed[0].response);
          failed++;

          // Remove invalid tokens
          if (result.failed[0].status === '410') {
            await this.removeInvalidToken(deviceToken);
          }
        } else {
          success++;
        }
      } catch (error) {
        logger.error(`Error sending notification to ${deviceToken}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Send notification for new email
   */
  async sendEmailNotification(
    userId: string,
    email: {
      id: string;
      from: string;
      subject: string;
      summary?: string;
      category: string;
      isPersonallyRelevant: boolean;
    }
  ): Promise<void> {
    // Get user preferences
    const preferences = await this.getUserNotificationPreferences(userId);

    // Check if user wants notifications for this category
    if (!this.shouldNotify(preferences, email)) {
      return;
    }

    const devices = await this.getUserDevices(userId);

    if (devices.length === 0) {
      return;
    }

    const notification = {
      title: email.from,
      body: email.summary || email.subject,
      data: {
        emailId: email.id,
        category: email.category,
        isPersonallyRelevant: email.isPersonallyRelevant
      }
    };

    await this.sendToDevices(devices, notification);
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<any> {
    const result = await query(
      `SELECT preferences FROM users WHERE id = $1`,
      [userId]
    );

    return result.rows[0]?.preferences || {
      notificationsEnabled: true,
      notifyMeRelated: true,
      notifyWork: true,
      notifyPersonal: false
    };
  }

  /**
   * Determine if notification should be sent based on preferences
   */
  private shouldNotify(preferences: any, email: any): boolean {
    if (!preferences.notificationsEnabled) {
      return false;
    }

    if (email.isPersonallyRelevant && preferences.notifyMeRelated) {
      return true;
    }

    if (email.category === 'Work' && preferences.notifyWork) {
      return true;
    }

    if (email.category === 'Personal' && preferences.notifyPersonal) {
      return true;
    }

    return false;
  }

  /**
   * Remove invalid device token
   */
  private async removeInvalidToken(token: string): Promise<void> {
    await query(
      `DELETE FROM device_tokens WHERE token = $1`,
      [token]
    );

    logger.info(`Removed invalid device token: ${token}`);
  }
}
