/**
 * Shared Email model definition
 * Used by both frontend and backend
 */

export interface Email {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  htmlBody?: string;
  snippet: string;
  date: Date | string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments: EmailAttachment[];

  // AI-generated fields
  aiSummary?: string;
  category: EmailCategory;
  importance: ImportanceLevel;
  isPersonallyRelevant: boolean;
  extractedImages?: string[];
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  downloadUrl?: string;
}

export enum EmailCategory {
  WORK = 'Work',
  PERSONAL = 'Personal',
  ME_RELATED = 'Me-related',
  FINANCE = 'Finance',
  SOCIAL = 'Social',
  PROMOTIONS = 'Promotions',
  NEWSLETTERS = 'Newsletters',
  OTHER = 'Other'
}

export enum ImportanceLevel {
  CRITICAL = 'Critical',
  HIGH = 'High',
  NORMAL = 'Normal',
  LOW = 'Low'
}
