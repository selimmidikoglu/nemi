import { query } from '../config/database';
import { logger } from '../config/logger';

/**
 * Process and send scheduled emails
 * This job runs every 5 seconds and sends emails that are due
 */
export async function processScheduledEmails(): Promise<void> {
  try {
    // Get all pending emails that are due to be sent
    const result = await query(
      `SELECT se.*, ea.email_address, ea.account_name, ea.provider,
              ea.access_token, ea.refresh_token, ea.encrypted_password,
              ea.imap_host
       FROM scheduled_emails se
       JOIN email_accounts ea ON ea.id = se.email_account_id
       WHERE se.status = 'pending'
         AND se.scheduled_for <= NOW()
       ORDER BY se.scheduled_for ASC
       LIMIT 10`,
      []
    );

    if (result.rows.length === 0) {
      return;
    }

    logger.info(`Processing ${result.rows.length} scheduled emails`);

    for (const scheduledEmail of result.rows) {
      try {
        // Mark as processing to prevent duplicate sends
        await query(
          `UPDATE scheduled_emails SET status = 'processing', updated_at = NOW() WHERE id = $1`,
          [scheduledEmail.id]
        );

        // Parse recipients
        const to = JSON.parse(scheduledEmail.to_recipients);
        const cc = scheduledEmail.cc_recipients ? JSON.parse(scheduledEmail.cc_recipients) : undefined;
        const bcc = scheduledEmail.bcc_recipients ? JSON.parse(scheduledEmail.bcc_recipients) : undefined;

        // Send the email based on provider
        if (scheduledEmail.provider === 'gmail' && scheduledEmail.access_token) {
          await sendViaGmail(scheduledEmail, to, cc, bcc);
        } else {
          await sendViaSmtp(scheduledEmail, to, cc, bcc);
        }

        // Mark as sent
        await query(
          `UPDATE scheduled_emails SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [scheduledEmail.id]
        );

        logger.info(`Scheduled email ${scheduledEmail.id} sent successfully`);
      } catch (error: any) {
        logger.error(`Failed to send scheduled email ${scheduledEmail.id}:`, error);

        // Mark as failed
        await query(
          `UPDATE scheduled_emails SET status = 'failed', error_message = $2, updated_at = NOW() WHERE id = $1`,
          [scheduledEmail.id, error.message || 'Unknown error']
        );
      }
    }
  } catch (error) {
    logger.error('Error processing scheduled emails:', error);
  }
}

/**
 * Send email via Gmail API
 */
async function sendViaGmail(
  scheduledEmail: any,
  to: Array<{ email: string; name?: string }>,
  cc?: Array<{ email: string; name?: string }>,
  bcc?: Array<{ email: string; name?: string }>
): Promise<void> {
  // Build the email in RFC 2822 format
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2)}`;
  const toHeader = to.map(t => t.name ? `${t.name} <${t.email}>` : t.email).join(', ');
  const ccHeader = cc && cc.length > 0 ? cc.map(c => c.name ? `${c.name} <${c.email}>` : c.email).join(', ') : '';
  const bccHeader = bcc && bcc.length > 0 ? bcc.map(b => b.name ? `${b.name} <${b.email}>` : b.email).join(', ') : '';

  let emailContent = '';
  emailContent += `From: ${scheduledEmail.account_name ? `${scheduledEmail.account_name} <${scheduledEmail.email_address}>` : scheduledEmail.email_address}\r\n`;
  emailContent += `To: ${toHeader}\r\n`;
  if (ccHeader) emailContent += `Cc: ${ccHeader}\r\n`;
  if (bccHeader) emailContent += `Bcc: ${bccHeader}\r\n`;
  emailContent += `Subject: ${scheduledEmail.subject}\r\n`;
  emailContent += `MIME-Version: 1.0\r\n`;

  if (scheduledEmail.in_reply_to) {
    emailContent += `In-Reply-To: <${scheduledEmail.in_reply_to}>\r\n`;
    emailContent += `References: <${scheduledEmail.in_reply_to}>\r\n`;
  }

  if (scheduledEmail.html_body) {
    emailContent += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
    emailContent += `--${boundary}\r\n`;
    emailContent += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
    emailContent += `${scheduledEmail.text_body || ''}\r\n`;
    emailContent += `--${boundary}\r\n`;
    emailContent += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
    emailContent += `${scheduledEmail.html_body}\r\n`;
    emailContent += `--${boundary}--`;
  } else {
    emailContent += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
    emailContent += scheduledEmail.text_body || '';
  }

  // Base64 URL-safe encode the email
  const encodedEmail = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send via Gmail API
  let accessToken = scheduledEmail.access_token;
  let response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedEmail })
  });

  // If token expired, try to refresh
  if (response.status === 401 && scheduledEmail.refresh_token) {
    logger.info('Refreshing Gmail token for scheduled email...');
    accessToken = await refreshGmailAccessToken(scheduledEmail.refresh_token);

    // Update token in database
    await query(
      `UPDATE email_accounts SET access_token = $1, updated_at = NOW() WHERE id = $2`,
      [accessToken, scheduledEmail.email_account_id]
    );

    // Retry with new token
    response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    });
  }

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to send via Gmail API');
  }
}

/**
 * Send email via SMTP
 */
async function sendViaSmtp(
  scheduledEmail: any,
  to: Array<{ email: string; name?: string }>,
  cc?: Array<{ email: string; name?: string }>,
  bcc?: Array<{ email: string; name?: string }>
): Promise<void> {
  const { SmtpService } = await import('../services/smtp.service');
  const { decrypt } = await import('../utils/encryption');

  if (!scheduledEmail.encrypted_password) {
    throw new Error('No password configured for this account');
  }

  const decryptedPassword = decrypt(scheduledEmail.encrypted_password);

  const smtpConfig = SmtpService.getSmtpConfig(
    scheduledEmail.provider,
    scheduledEmail.email_address,
    decryptedPassword,
    scheduledEmail.imap_host
  );

  const smtpService = new SmtpService(smtpConfig);
  await smtpService.connect();

  await smtpService.sendEmail({
    from: {
      email: scheduledEmail.email_address,
      name: scheduledEmail.account_name || undefined
    },
    to,
    cc,
    bcc,
    subject: scheduledEmail.subject,
    text: scheduledEmail.text_body,
    html: scheduledEmail.html_body,
    inReplyTo: scheduledEmail.in_reply_to ? `<${scheduledEmail.in_reply_to}>` : undefined
  });

  await smtpService.disconnect();
}

/**
 * Refresh Gmail OAuth access token
 */
async function refreshGmailAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Gmail OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json() as { error_description?: string };
    throw new Error(error.error_description || 'Failed to refresh access token');
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

// Start the scheduled email processor
let scheduledEmailInterval: NodeJS.Timeout | null = null;

export function startScheduledEmailProcessor(): void {
  if (scheduledEmailInterval) {
    return;
  }

  logger.info('Starting scheduled email processor (every 5 seconds)');

  // Run immediately, then every 5 seconds
  processScheduledEmails();
  scheduledEmailInterval = setInterval(processScheduledEmails, 5000);
}

export function stopScheduledEmailProcessor(): void {
  if (scheduledEmailInterval) {
    clearInterval(scheduledEmailInterval);
    scheduledEmailInterval = null;
    logger.info('Stopped scheduled email processor');
  }
}
