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

  // NEW: AI-powered reply assistance (2025-11-15)
  isAnswerable?: boolean         // True if email expects/requires a reply
  suggestedReplies?: {           // Pre-generated reply options from AI
    quick: string                // Brief 1-sentence response (10-15 words)
    standard: string             // Professional 2-3 sentence reply (30-50 words)
    detailed: string             // Comprehensive response (60-100 words)
  } | null

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
