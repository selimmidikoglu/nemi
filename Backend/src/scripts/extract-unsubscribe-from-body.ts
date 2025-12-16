/**
 * Script to extract unsubscribe links from email body HTML
 * Run with: npx ts-node src/scripts/extract-unsubscribe-from-body.ts
 */

import { query } from '../config/database';
import { logger } from '../config/logger';
import dotenv from 'dotenv';

dotenv.config();

// Common unsubscribe patterns in email HTML
const UNSUBSCRIBE_URL_PATTERNS = [
  // Direct unsubscribe links
  /href=["']([^"']*unsubscribe[^"']*)["']/gi,
  /href=["']([^"']*optout[^"']*)["']/gi,
  /href=["']([^"']*opt-out[^"']*)["']/gi,
  /href=["']([^"']*remove[^"']*list[^"']*)["']/gi,
  /href=["']([^"']*email[^"']*preferences[^"']*)["']/gi,
  /href=["']([^"']*manage[^"']*subscription[^"']*)["']/gi,
  /href=["']([^"']*subscription[^"']*center[^"']*)["']/gi,
];

function extractUnsubscribeUrlFromBody(body: string): string | null {
  if (!body) return null;

  // Look for unsubscribe links
  for (const pattern of UNSUBSCRIBE_URL_PATTERNS) {
    const matches = body.matchAll(pattern);
    for (const match of matches) {
      const url = match[1];
      // Skip mailto links, we want HTTP links
      if (url && url.startsWith('http') && !url.includes('mailto:')) {
        // Clean up common HTML entities
        const cleanUrl = url
          .replace(/&amp;/g, '&')
          .replace(/&#x3D;/g, '=')
          .replace(/&#61;/g, '=');
        return cleanUrl;
      }
    }
  }

  return null;
}

async function extractUnsubscribeLinks() {
  logger.info('Starting unsubscribe link extraction from email bodies...');

  // Get emails that don't have unsubscribe URLs - prefer html_body, fallback to body
  const emailsResult = await query(`
    SELECT e.id, e.user_id, e.from_email, COALESCE(e.html_body, e.body) as body
    FROM emails e
    WHERE e.unsubscribe_url IS NULL
      AND (e.html_body IS NOT NULL OR e.body IS NOT NULL)
    ORDER BY e.date DESC
  `);

  logger.info(`Found ${emailsResult.rows.length} emails to scan`);

  let updated = 0;
  const senderUrls: Map<string, string> = new Map();

  for (const email of emailsResult.rows) {
    const url = extractUnsubscribeUrlFromBody(email.body);

    if (url) {
      const senderKey = `${email.user_id}:${email.from_email.toLowerCase()}`;

      // Store the URL for this sender (use the latest one)
      if (!senderUrls.has(senderKey)) {
        senderUrls.set(senderKey, url);
      }

      // Update the email record
      await query(`
        UPDATE emails
        SET unsubscribe_url = $1
        WHERE id = $2
      `, [url, email.id]);

      updated++;
    }
  }

  logger.info(`Updated ${updated} emails with unsubscribe URLs`);
  logger.info(`Found unique sender URLs: ${senderUrls.size}`);

  // Now update sender_engagement_metrics with the found URLs
  for (const [senderKey, url] of senderUrls) {
    const [userId, senderEmail] = senderKey.split(':');

    await query(`
      UPDATE sender_engagement_metrics
      SET
        unsubscribe_url = COALESCE(unsubscribe_url, $1),
        has_unsubscribe_option = TRUE,
        updated_at = NOW()
      WHERE user_id = $2 AND LOWER(sender_email) = LOWER($3)
    `, [url, userId, senderEmail]);
  }

  // Update unsubscribe_recommendations with the new URLs
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

  logger.info('Extraction complete!');

  // Show summary
  const summaryResult = await query(`
    SELECT
      COUNT(*) as total_recs,
      COUNT(unsubscribe_url) as with_url,
      COUNT(unsubscribe_email) as with_email
    FROM unsubscribe_recommendations
    WHERE status = 'pending'
  `);

  const summary = summaryResult.rows[0];
  logger.info(`Recommendations summary: ${summary.total_recs} total, ${summary.with_url} with URL, ${summary.with_email} with email`);
}

// Run the script
extractUnsubscribeLinks()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Extraction failed:', err);
    process.exit(1);
  });
