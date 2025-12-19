// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import * as ngrok from '@ngrok/ngrok';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { EmailSyncJob } from './jobs/email-sync.job';
import { AIAnalysisJob } from './jobs/ai-analysis.job';
import { EngagementCalculationJob } from './jobs/engagement-calculation.job';
import { UnsubscribeRecommendationsJob } from './jobs/unsubscribe-recommendations.job';
import { GmailPushService } from './services/gmail-push.service';
import { OutlookPushService } from './services/outlook-push.service';
import { startScheduledEmailProcessor, stopScheduledEmailProcessor } from './jobs/scheduled-email.job';

// Store the ngrok URL globally so it can be accessed by other services
export let ngrokUrl: string | null = null;

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test endpoint to verify ngrok tunnel is working
app.get('/api/test', (_req: Request, res: Response) => {
  res.json({
    message: 'NEMI Backend is working!',
    ngrokUrl: ngrokUrl,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
setupRoutes(app);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start email sync job
    const emailSyncJob = new EmailSyncJob();
    emailSyncJob.start();

    // Start AI analysis job
    const aiAnalysisJob = new AIAnalysisJob();
    aiAnalysisJob.start();

    // Start engagement calculation job
    const engagementCalcJob = new EngagementCalculationJob();
    engagementCalcJob.start();
    engagementCalcJob.startDailyMaintenance();

    // Start unsubscribe recommendations job
    const unsubscribeJob = new UnsubscribeRecommendationsJob();
    unsubscribeJob.start();

    // Start scheduled email processor (for undo send feature)
    startScheduledEmailProcessor();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server for real-time Gmail push notifications
    GmailPushService.initializeWebSocket(server);
    logger.info('WebSocket server initialized for Gmail push notifications');

    // Start Gmail watch renewal job (every 6 hours)
    setInterval(async () => {
      try {
        await GmailPushService.renewExpiringWatches();
      } catch (error) {
        logger.error('Error renewing Gmail watches:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Start Outlook subscription renewal job (every 2 hours)
    // Outlook subscriptions expire after 3 days max, so renew more frequently
    setInterval(async () => {
      try {
        await OutlookPushService.renewExpiringSubscriptions();
      } catch (error) {
        logger.error('Error renewing Outlook subscriptions:', error);
      }
    }, 2 * 60 * 60 * 1000); // 2 hours

    // Start listening
    server.listen(PORT, async () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`WebSocket: ws://localhost:${PORT}/ws`);

      // Start ngrok tunnel in development mode for Gmail webhooks
      if (process.env.NODE_ENV === 'development' && process.env.NGROK_AUTHTOKEN) {
        try {
          logger.info('Starting ngrok tunnel...');

          // Using @ngrok/ngrok SDK
          const listener = await ngrok.forward({
            addr: PORT,
            authtoken: process.env.NGROK_AUTHTOKEN,
            domain: process.env.NGROK_DOMAIN, // Static domain (optional)
          });

          ngrokUrl = listener.url() || null;
          logger.info(`🚀 Ngrok tunnel established: ${ngrokUrl}`);
          logger.info(`📧 Gmail webhook URL: ${ngrokUrl}/api/gmail/webhook`);
          logger.info(`📧 Outlook webhook URL: ${ngrokUrl}/api/outlook/webhook`);
          logger.info(`💡 Use these URLs for push notification subscriptions`);
        } catch (error: any) {
          logger.error('Failed to start ngrok tunnel:', error?.message || error);
          logger.warn('Gmail push notifications will not work without ngrok in development');

          // Try without custom domain as fallback
          if (process.env.NGROK_DOMAIN) {
            try {
              logger.info('Retrying without custom domain...');
              const listener = await ngrok.forward({
                addr: PORT,
                authtoken: process.env.NGROK_AUTHTOKEN,
              });
              ngrokUrl = listener.url() || null;
              logger.info(`🚀 Ngrok tunnel established (random URL): ${ngrokUrl}`);
              logger.info(`📧 Gmail webhook URL: ${ngrokUrl}/api/gmail/webhook`);
            } catch (retryError: any) {
              logger.error('Ngrok fallback also failed:', retryError?.message || retryError);
            }
          }
        }
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  stopScheduledEmailProcessor();
  if (ngrokUrl) {
    await ngrok.disconnect();
    logger.info('Ngrok tunnel disconnected');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  stopScheduledEmailProcessor();
  if (ngrokUrl) {
    await ngrok.disconnect();
    logger.info('Ngrok tunnel disconnected');
  }
  process.exit(0);
});

startServer();

export default app;
