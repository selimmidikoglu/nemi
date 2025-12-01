/**
 * Shared API types and interfaces
 */

import { Email, EmailCategory, ImportanceLevel } from '../models/Email';
import { User } from '../models/User';

// Authentication
export interface SignUpRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Emails
export interface FetchEmailsRequest {
  provider: string;
}

export interface FetchEmailsResponse {
  count: number;
  emails: Email[];
}

export interface GetEmailsQuery {
  category?: string;
  limit?: number;
  offset?: number;
  isRead?: boolean;
  isStarred?: boolean;
  isPersonallyRelevant?: boolean;
}

export interface ClassifyEmailsRequest {
  emailIds: string[];
}

export interface ClassifyEmailsResponse {
  classified: number;
  results: EmailClassification[];
}

export interface EmailClassification {
  emailId: string;
  category: EmailCategory;
  importance: ImportanceLevel;
  isPersonallyRelevant: boolean;
}

// Push Notifications
export interface RegisterDeviceRequest {
  deviceToken: string;
  userId: string;
}

export interface SendNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Generic responses
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

export interface SuccessResponse {
  message: string;
}

export interface CategoryStats {
  category: string;
  count: number;
}
