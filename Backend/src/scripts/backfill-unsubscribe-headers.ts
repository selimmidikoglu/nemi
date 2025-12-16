/**
 * Script to backfill List-Unsubscribe headers from Gmail for existing emails
 * Run with: npx ts-node src/scripts/backfill-unsubscribe-headers.ts
 */

import { query, getClient } from '../config/database';
import { logger } from '../config/logger';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

interface EmailToUpdate {
  id: string;
  userId: string;
  providerEmailId: string;
  fromEmail: string;
}

interface UserTokens {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

async function getGmailClient(tokens: UserTokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  // Try to refresh the token
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    // Update the token in the database
    if (credentials.access_token) {
      await query(`
        UPDATE email_accounts
        SET access_token = $1, updated_at = NOW()
        WHERE user_id = $2 AND provider = 'gmail'
      `, [credentials.access_token, tokens.userId]);
      logger.info('Refreshed access token for user ' + tokens.userId);
    }
  } catch (err: any) {
    logger.warn('Could not refresh token, trying with existing: ' + err.message);
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function extractUnsubscribeInfo(headers: any[]): { url?: string; email?: string } {
  const unsubHeader = headers.find((h: any) => h.name.toLowerCase() === 'list-unsubscribe');
  if (!unsubHeader) return {};

  const value = unsubHeader.value;

  // Extract URL (https:// or http://)
  const urlMatch = value.match(/<(https?:\/\/[^>]+)>/);

  // Extract mailto: address
  const emailMatch = value.match(/<mailto:([^>?]+)/);

  return {
    url: urlMatch?.[1],
    email: emailMatch?.[1]
  };
}

async function backfillUnsubscribeHeaders() {
  logger.info('Starting unsubscribe header backfill...');

  // Get all users with Gmail tokens
  const usersResult = await query(`
    SELECT DISTINCT u.id as user_id, ea.access_token, ea.refresh_token
    FROM users u
    JOIN email_accounts ea ON ea.user_id = u.id
    WHERE ea.provider = 'gmail' AND ea.access_token IS NOT NULL
  `);

  if (usersResult.rows.length === 0) {
    logger.info('No users with Gmail accounts found');
    return;
  }

  for (const userTokens of usersResult.rows) {
    logger.info(`Processing user ${userTokens.user_id}...`);

    try {
      const gmail = await getGmailClient({
        userId: userTokens.user_id,
        accessToken: userTokens.access_token,
        refreshToken: userTokens.refresh_token,
      });

      // Get emails for this user that need unsubscribe data
      const emailsResult = await query(`
        SELECT id, user_id, provider_email_id, from_email
        FROM emails
        WHERE user_id = $1
          AND provider_email_id IS NOT NULL
          AND provider_email_id <> ''
          AND unsubscribe_url IS NULL
          AND unsubscribe_email IS NULL
        ORDER BY date DESC
        LIMIT 500
      `, [userTokens.user_id]);

      logger.info(`Found ${emailsResult.rows.length} emails to process for user ${userTokens.user_id}`);

      let updated = 0;
      let errors = 0;

      for (const email of emailsResult.rows) {
        try {
          // Fetch just the headers from Gmail
          const response = await gmail.users.messages.get({
            userId: 'me',
            id: email.provider_email_id,
            format: 'metadata',
            metadataHeaders: ['List-Unsubscribe', 'List-Unsubscribe-Post'],
          });

          const headers = response.data.payload?.headers || [];
          const unsubInfo = extractUnsubscribeInfo(headers);

          if (unsubInfo.url || unsubInfo.email) {
            // Update the email record
            await query(`
              UPDATE emails
              SET unsubscribe_url = $1, unsubscribe_email = $2
              WHERE id = $3
            `, [unsubInfo.url || null, unsubInfo.email || null, email.id]);

            // Also update sender_engagement_metrics
            await query(`
              UPDATE sender_engagement_metrics
              SET
                unsubscribe_url = COALESCE($1, unsubscribe_url),
                unsubscribe_email = COALESCE($2, unsubscribe_email),
                has_unsubscribe_option = TRUE,
                updated_at = NOW()
              WHERE user_id = $3 AND LOWER(sender_email) = LOWER($4)
            `, [unsubInfo.url || null, unsubInfo.email || null, email.user_id, email.from_email]);

            updated++;
            logger.debug(`Updated ${email.from_email}: url=${unsubInfo.url}, email=${unsubInfo.email}`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err: any) {
          errors++;
          if (err.code === 404) {
            logger.debug(`Email ${email.provider_email_id} not found in Gmail (probably deleted)`);
          } else {
            logger.error(`Error fetching email ${email.provider_email_id}: ${err.message}`);
          }
        }
      }

      logger.info(`User ${userTokens.user_id}: Updated ${updated} emails, ${errors} errors`);
    } catch (err: any) {
      logger.error(`Error processing user ${userTokens.user_id}: ${err.message}`);
    }
  }

  // Now update unsubscribe_recommendations with the new data
  logger.info('Updating unsubscribe recommendations with new unsubscribe data...');
  await query(`
    UPDATE unsubscribe_recommendations ur
    SET
      unsubscribe_url = sem.unsubscribe_url,
      unsubscribe_email = sem.unsubscribe_email
    FROM sender_engagement_metrics sem
    WHERE ur.user_id = sem.user_id
      AND LOWER(ur.sender_email) = LOWER(sem.sender_email)
      AND (sem.unsubscribe_url IS NOT NULL OR sem.unsubscribe_email IS NOT NULL)
  `);

  logger.info('Backfill complete!');
}

// Run the script
backfillUnsubscribeHeaders()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Backfill failed:', err);
    process.exit(1);
  });
