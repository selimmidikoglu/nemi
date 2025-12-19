import { Application } from 'express';
import authRoutes from './auth.routes';
import emailRoutes from './email.routes';
import pushRoutes from './push.routes';
import emailAccountRoutes from './email-account.routes';
import analyticsRoutes from './analytics.routes';
import badgeRoutes from './badge.routes';
import gmailWebhookRoutes from './gmail-webhook.routes';
import outlookWebhookRoutes from './outlook-webhook.routes';
import unsubscribeRoutes from './unsubscribe.routes';
import contactsRoutes from './contacts.routes';
import searchRoutes from './search.routes';
import actionsRoutes from './actions.routes';

export const setupRoutes = (app: Application): void => {
  const API_PREFIX = '/api';

  // Mount routes
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/emails`, emailRoutes);
  app.use(`${API_PREFIX}/push`, pushRoutes);
  app.use(`${API_PREFIX}/email-accounts`, emailAccountRoutes);
  app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
  app.use(`${API_PREFIX}/badges`, badgeRoutes);
  app.use(`${API_PREFIX}/gmail/webhook`, gmailWebhookRoutes);
  app.use(`${API_PREFIX}/outlook/webhook`, outlookWebhookRoutes);
  app.use(`${API_PREFIX}/unsubscribe`, unsubscribeRoutes);
  app.use(`${API_PREFIX}/contacts`, contactsRoutes);
  app.use(`${API_PREFIX}/search`, searchRoutes);
  app.use(`${API_PREFIX}/actions`, actionsRoutes);
};
