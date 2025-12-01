/**
 * Shared User model definition
 * Used by both frontend and backend
 */

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: Date | string;
  lastLoginAt?: Date | string;

  emailProvider: EmailProvider;
  emailProviderConnected: boolean;

  preferences: UserPreferences;
}

export enum EmailProvider {
  GMAIL = 'Gmail',
  OUTLOOK = 'Outlook',
  ICLOUD = 'iCloud',
  YAHOO = 'Yahoo',
  OTHER = 'Other'
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  notifyMeRelated: boolean;
  notifyWork: boolean;
  notifyPersonal: boolean;
  aiSummaryEnabled: boolean;
  autoCategorizationEnabled: boolean;
  theme: AppTheme;
}

export enum AppTheme {
  LIGHT = 'Light',
  DARK = 'Dark',
  SYSTEM = 'System'
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
