// User types
export interface User {
  id: number
  email: string
  name?: string
  createdAt: string
}

// Badge type
export interface EmailBadge {
  name: string
  color: string
  icon: string
  importance: number
  category: string
}

// Suggested Reply type (AI-generated response options)
export interface SuggestedReply {
  text: string
  approach: string  // e.g., 'direct_accept', 'conditional', 'defer', 'ask_clarification', 'polite_decline'
}

// Extracted Action type (deadlines, reminders, tasks from emails)
export interface ExtractedAction {
  type: 'deadline' | 'reminder' | 'task'
  title: string
  date: string | null
  priority: 'high' | 'medium' | 'low'
  source_text: string
  calendar_type: 'your_life' | 'reminder'
}

// Email Action (stored in database with status)
export interface EmailAction {
  id: string
  emailId?: string
  userId: string
  actionType: 'deadline' | 'reminder' | 'task'
  title: string
  description?: string
  dueDate: string | null
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'completed' | 'dismissed'
  calendarType: 'your_life' | 'reminder'
  sourceText?: string
  createdAt: string
  completedAt?: string
  // For Google Calendar sync
  googleCalendarEventId?: string
  syncedToCalendar?: boolean
  // Additional fields from email join
  emailSubject?: string
  fromEmail?: string
  fromName?: string
}

// Actions API Response
export interface ActionsResponse {
  actions: EmailAction[]
  counts: {
    your_life: { pending: number; completed: number; dismissed: number }
    reminder: { pending: number; completed: number; dismissed: number }
  }
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}

// Action Counts for sidebar badges
export interface ActionCounts {
  your_life: { pending: number; overdue: number; upcoming: number }
  reminder: { pending: number; overdue: number; upcoming: number }
  total: { pending: number; overdue: number; upcoming: number }
}

// Calendar Event (extracted from emails - meetings + deadlines)
export interface CalendarEvent {
  id: string
  type: 'meeting' | 'deadline'
  title: string
  time: string
  // Meeting-specific fields
  url?: string
  platform?: string
  fromEmail?: string
  fromName?: string
  // Deadline-specific fields
  priority?: 'high' | 'medium' | 'low'
  emailSubject?: string
  // Common fields
  emailId?: string
  accountEmail?: string
}

// Email address type
export interface EmailAddress {
  email: string
  name?: string
}

// Email types
export interface Email {
  id: string
  messageId: string
  threadId?: string | null  // Gmail's native thread ID for conversation grouping
  subject: string
  from: string
  to: string
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  replyTo?: EmailAddress[]
  date: string
  body?: string
  htmlBody?: string
  textBody?: string
  summary?: string
  isRead: boolean
  isStarred: boolean
  importance?: 'critical' | 'high' | 'normal' | 'low'
  category?: string
  isMeRelated?: boolean
  hasAttachment?: boolean
  tags?: string[]
  badges?: EmailBadge[]
  companyName?: string | null
  companyDomain?: string | null
  companyLogoUrl?: string | null
  senderProfilePhotoUrl?: string | null  // Real profile photo from Google People API
  emailAccountId: string
  createdAt: string
  updatedAt: string

  // NEW: Enhanced AI features (2025-11-12)
  isAboutMe?: boolean           // User is @mentioned or directly addressed
  mentionContext?: string | null // HOW user was mentioned ("@username in PR #123")
  htmlSnippet?: string | null    // Beautiful HTML card for special emails
  renderAsHtml?: boolean         // True if should display HTML card instead of summary

  // NEW: AI-powered reply assistance (2025-12-16)
  isAnswerable?: boolean                           // True if email expects/requires a reply
  responseUrgency?: 'immediate' | 'today' | 'this_week' | 'whenever' | 'none'  // How urgently response is needed
  suggestedReplies?: SuggestedReply[]              // 3 different approach options from AI
  extractedActions?: ExtractedAction[]             // Deadlines, reminders, tasks extracted from email

  // Snooze and Archive features
  snoozedUntil?: string | null   // ISO timestamp when snooze expires
  isArchived?: boolean           // Whether email is archived
}

// Email Account types
export interface EmailAccount {
  id: string
  userId: string
  provider: 'gmail' | 'outlook' | 'imap'
  email: string
  isActive: boolean
  lastSyncAt?: string
  createdAt: string
  updatedAt: string
}

// Classification types
export interface EmailClassification {
  id: string
  emailId: string
  category: string
  importance: 'critical' | 'high' | 'normal' | 'low'
  isMeRelated: boolean
  summary: string
  createdAt: string
}

// Session type for multi-device support
export interface Session {
  id: string
  userId: string
  deviceName: string | null
  deviceType: 'web' | 'mobile' | 'tablet'
  userAgent: string | null
  ipAddress: string | null
  rememberMe: boolean
  createdAt: string
  lastActivityAt: string
  expiresAt: string
  isActive: boolean
  isCurrent?: boolean // Client-side flag to indicate current session
}

// Auth types
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
  rememberMe?: boolean
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  sessionId?: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Email query params
export interface EmailQueryParams {
  page?: number
  limit?: number
  offset?: number
  isRead?: boolean
  isStarred?: boolean
  category?: string
  importance?: string
  isMeRelated?: boolean
  search?: string
  badgeName?: string
  emailAccountId?: number
}
