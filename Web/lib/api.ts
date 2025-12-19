import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  User,
  Email,
  EmailAccount,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse,
  PaginatedResponse,
  EmailQueryParams,
  Session,
  EmailAction,
  ActionsResponse,
  ActionCounts,
  CalendarEvent,
} from '@/types'

// Helper to get the appropriate storage based on rememberMe setting
const getStorage = (): Storage => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    } as Storage
  }
  // Check if we have a rememberMe preference stored
  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  return rememberMe ? localStorage : sessionStorage
}

// Helper to get token from either storage
const getToken = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key) || sessionStorage.getItem(key)
}

// Helper to clear all auth data from both storages
const clearAuthData = () => {
  if (typeof window === 'undefined') return
  const keys = ['accessToken', 'refreshToken', 'user', 'sessionId', 'rememberMe']
  keys.forEach(key => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = getToken('accessToken')
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = getToken('refreshToken')
            if (refreshToken) {
              const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
                { refreshToken }
              )
              // Backend returns access_token and refresh_token (token rotation)
              const accessToken = response.data.access_token || response.data.accessToken
              const newRefreshToken = response.data.refresh_token || response.data.refreshToken

              // Store in appropriate storage based on rememberMe
              const storage = getStorage()
              storage.setItem('accessToken', accessToken)
              if (newRefreshToken) {
                storage.setItem('refreshToken', newRefreshToken)
              }

              originalRequest.headers.Authorization = `Bearer ${accessToken}`
              return this.api(originalRequest)
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            if (typeof window !== 'undefined') {
              clearAuthData()
              window.location.href = '/login'
            }
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Collect device info for session tracking
    const deviceInfo = this.collectDeviceInfo()

    const response = await this.api.post<any>('/api/auth/login', {
      ...credentials,
      rememberMe: credentials.rememberMe ?? false,
      ...deviceInfo,
    })

    // Backend returns snake_case, convert to camelCase
    return {
      user: response.data.user,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      sessionId: response.data.session_id,
    }
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Collect device info for session tracking
    const deviceInfo = this.collectDeviceInfo()

    const response = await this.api.post<any>('/api/auth/signup', {
      ...data,
      rememberMe: data.rememberMe ?? true, // Default to true for new users
      ...deviceInfo,
    })

    // Backend returns snake_case, convert to camelCase
    return {
      user: response.data.user,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      sessionId: response.data.session_id,
    }
  }

  async logout(): Promise<void> {
    const refreshToken = getToken('refreshToken')
    if (refreshToken) {
      try {
        await this.api.post('/api/auth/logout', { refreshToken })
      } catch (error) {
        // Logout even if API call fails
        console.error('Logout API call failed:', error)
      }
    }
    clearAuthData()
  }

  // Session management endpoints
  async getSessions(): Promise<Session[]> {
    const response = await this.api.get<any>('/api/auth/sessions')
    const currentSessionId = getToken('sessionId')

    // Map snake_case to camelCase and mark current session
    return (response.data.sessions || []).map((session: any) => ({
      id: session.id,
      userId: session.userId || session.user_id,
      deviceName: session.deviceName || session.device_name,
      deviceType: session.deviceType || session.device_type,
      userAgent: session.userAgent || session.user_agent,
      ipAddress: session.ipAddress || session.ip_address,
      rememberMe: session.rememberMe ?? session.remember_me,
      createdAt: session.createdAt || session.created_at,
      lastActivityAt: session.lastActivityAt || session.last_activity_at,
      expiresAt: session.expiresAt || session.expires_at,
      isActive: session.isActive ?? session.is_active,
      isCurrent: session.id === currentSessionId,
    }))
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.api.delete(`/api/auth/sessions/${sessionId}`)
  }

  async revokeAllSessions(): Promise<void> {
    await this.api.delete('/api/auth/sessions')
    clearAuthData()
  }

  async resendVerificationEmail(): Promise<void> {
    await this.api.post('/api/auth/resend-verification')
  }

  // Collect device information for session tracking
  private collectDeviceInfo(): { userAgent?: string; deviceType?: string } {
    if (typeof window === 'undefined') return {}

    const userAgent = navigator.userAgent
    let deviceType = 'web'

    // Simple device type detection
    if (/Mobile|Android|iPhone/i.test(userAgent)) {
      deviceType = 'mobile'
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tablet'
    }

    return { userAgent, deviceType }
  }

  // Email endpoints
  async getEmails(params?: EmailQueryParams): Promise<PaginatedResponse<Email>> {
    const response = await this.api.get<any>('/api/emails', { params })
    // Backend returns { emails, total, page, limit }
    // Convert to our expected format and map snake_case to camelCase
    const emails = (response.data.emails || []).map((email: any) => {
      // Handle to_emails array -> to string conversion
      let toField = 'Unknown';

      // Check both to_emails and to fields
      const toData = email.to_emails || email.to;

      if (Array.isArray(toData) && toData.length > 0) {
        const firstRecipient = toData[0];
        if (typeof firstRecipient === 'object' && firstRecipient !== null) {
          toField = firstRecipient.name || firstRecipient.email || 'Unknown';
        } else if (typeof firstRecipient === 'string') {
          toField = firstRecipient;
        }
      } else if (typeof toData === 'string') {
        toField = toData;
      }

      return {
        ...email,
        // Sender info
        from: email.from_name || email.from_email || email.from || 'Unknown',
        fromName: email.from_name || email.fromName,
        fromEmail: email.from_email || email.fromEmail,
        // Recipient info
        to: toField,
        // Email content
        htmlBody: email.html_body || email.htmlBody,
        textBody: email.text_body || email.textBody || email.body,
        htmlSnippet: email.html_snippet || email.htmlSnippet,
        renderAsHtml: email.render_as_html !== undefined ? email.render_as_html : email.renderAsHtml,
        aiSummary: email.ai_summary || email.aiSummary,
        // Status flags
        isRead: email.is_read !== undefined ? email.is_read : email.isRead,
        isStarred: email.is_starred !== undefined ? email.is_starred : email.isStarred,
        isArchived: email.is_archived !== undefined ? email.is_archived : email.isArchived,
        isDeleted: email.is_deleted !== undefined ? email.is_deleted : email.isDeleted,
        hasAttachments: email.has_attachments !== undefined ? email.has_attachments : email.hasAttachments,
        // Company/sender info
        companyName: email.company_name !== undefined ? email.company_name : email.companyName,
        companyLogoUrl: email.company_logo_url !== undefined ? email.company_logo_url : email.companyLogoUrl,
        companyDomain: email.company_domain !== undefined ? email.company_domain : email.companyDomain,
        // Account info
        emailAccountId: email.email_account_id !== undefined ? email.email_account_id : email.emailAccountId,
        // AI analysis
        category: email.category,
        importance: email.importance,
        masterImportanceScore: email.master_importance_score !== undefined ? email.master_importance_score : email.masterImportanceScore,
        isPersonallyRelevant: email.is_personally_relevant !== undefined ? email.is_personally_relevant : email.isPersonallyRelevant,
        isAboutMe: email.is_about_me !== undefined ? email.is_about_me : email.isAboutMe,
        mentionContext: email.mention_context || email.mentionContext,
        // Unsubscribe
        unsubscribeUrl: email.unsubscribe_url || email.unsubscribeUrl,
        unsubscribeEmail: email.unsubscribe_email || email.unsubscribeEmail,
      }
    })

    return {
      data: emails,
      pagination: {
        page: response.data.page || 1,
        limit: response.data.limit || 50,
        total: response.data.total || 0,
        totalPages: Math.ceil((response.data.total || 0) / (response.data.limit || 50)),
      },
    }
  }

  async getEmailById(id: string): Promise<Email> {
    const response = await this.api.get<any>(`/api/emails/${id}`)
    const email = response.data.data || response.data
    return {
      id: email.id,
      messageId: email.message_id || email.messageId,
      threadId: email.thread_id || email.threadId,
      subject: email.subject,
      from: email.from_email || email.from,
      to: email.to_email || email.to,
      cc: email.cc,
      bcc: email.bcc,
      replyTo: email.reply_to || email.replyTo,
      date: email.date,
      body: email.body,
      htmlBody: email.html_body || email.htmlBody,
      textBody: email.text_body || email.textBody,
      summary: email.summary,
      isRead: email.is_read ?? email.isRead ?? false,
      isStarred: email.is_starred ?? email.isStarred ?? false,
      importance: email.importance,
      category: email.category,
      isMeRelated: email.is_me_related || email.isMeRelated,
      hasAttachment: email.has_attachment || email.hasAttachment,
      tags: email.tags || [],
      badges: email.badges || [],
      companyName: email.company_name || email.companyName,
      companyDomain: email.company_domain || email.companyDomain,
      companyLogoUrl: email.company_logo_url || email.companyLogoUrl,
      senderProfilePhotoUrl: email.sender_profile_photo_url || email.senderProfilePhotoUrl,
      emailAccountId: email.email_account_id || email.emailAccountId,
      createdAt: email.created_at || email.createdAt,
      updatedAt: email.updated_at || email.updatedAt,
      isAboutMe: email.is_about_me || email.isAboutMe,
      mentionContext: email.mention_context || email.mentionContext,
      htmlSnippet: email.html_snippet || email.htmlSnippet,
      renderAsHtml: email.render_as_html || email.renderAsHtml,
      isAnswerable: email.is_answerable || email.isAnswerable,
      responseUrgency: email.response_urgency || email.responseUrgency,
      suggestedReplies: email.suggested_replies || email.suggestedReplies,
      extractedActions: email.extracted_actions || email.extractedActions,
      snoozedUntil: email.snoozed_until || email.snoozedUntil,
      isArchived: email.is_archived || email.isArchived,
    }
  }

  async markEmailAsRead(id: string, isRead: boolean): Promise<Email> {
    const response = await this.api.patch<Email>(`/api/emails/${id}/read`, { isRead })
    return response.data
  }

  async toggleEmailStar(id: string, isStarred: boolean): Promise<Email> {
    const response = await this.api.patch<Email>(`/api/emails/${id}/star`, { isStarred })
    return response.data
  }

  async deleteEmail(id: string): Promise<void> {
    await this.api.delete(`/api/emails/${id}`)
  }

  async deleteEmails(ids: string[]): Promise<void> {
    await this.api.post('/api/emails/bulk-delete', { emailIds: ids })
  }

  async syncEmails(provider: string = 'Gmail'): Promise<ApiResponse<any>> {
    const response = await this.api.post<ApiResponse<any>>('/api/emails/fetch', { provider })
    return response.data
  }

  // Advanced search with Elasticsearch
  async advancedSearch(params: {
    from?: string
    to?: string
    subject?: string
    hasWords?: string
    doesntHave?: string
    hasAttachment?: boolean
    dateWithin?: number
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
  }): Promise<{ emails: Email[]; total: number; totalPages: number }> {
    const queryParams: any = {}
    if (params.from) queryParams.from = params.from
    if (params.to) queryParams.to = params.to
    if (params.subject) queryParams.subject = params.subject
    if (params.hasWords) queryParams.hasWords = params.hasWords
    if (params.doesntHave) queryParams.doesntHave = params.doesntHave
    if (params.hasAttachment !== undefined) queryParams.hasAttachment = params.hasAttachment
    if (params.dateWithin) queryParams.dateWithin = params.dateWithin
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom
    if (params.dateTo) queryParams.dateTo = params.dateTo
    if (params.page) queryParams.page = params.page
    if (params.limit) queryParams.limit = params.limit

    const response = await this.api.get<any>('/api/search', { params: queryParams })

    // Map the response to our Email format (snake_case -> camelCase)
    const emails = (response.data.emails || []).map((email: any) => {
      let toField = 'Unknown';
      const toData = email.to_emails || email.to;
      if (Array.isArray(toData) && toData.length > 0) {
        const firstRecipient = toData[0];
        if (typeof firstRecipient === 'object' && firstRecipient !== null) {
          toField = firstRecipient.name || firstRecipient.email || 'Unknown';
        } else if (typeof firstRecipient === 'string') {
          toField = firstRecipient;
        }
      } else if (typeof toData === 'string') {
        toField = toData;
      }

      return {
        ...email,
        // Sender info
        from: email.from_name || email.from_email || email.from || 'Unknown',
        fromName: email.from_name || email.fromName,
        fromEmail: email.from_email || email.fromEmail,
        // Recipient info
        to: toField,
        // Email content
        htmlBody: email.html_body || email.htmlBody,
        textBody: email.text_body || email.textBody || email.body,
        htmlSnippet: email.html_snippet || email.htmlSnippet,
        renderAsHtml: email.render_as_html !== undefined ? email.render_as_html : email.renderAsHtml,
        aiSummary: email.ai_summary || email.aiSummary,
        // Status flags
        isRead: email.is_read !== undefined ? email.is_read : email.isRead,
        isStarred: email.is_starred !== undefined ? email.is_starred : email.isStarred,
        isArchived: email.is_archived !== undefined ? email.is_archived : email.isArchived,
        isDeleted: email.is_deleted !== undefined ? email.is_deleted : email.isDeleted,
        hasAttachments: email.has_attachments !== undefined ? email.has_attachments : email.hasAttachments,
        // Company/sender info
        companyName: email.company_name !== undefined ? email.company_name : email.companyName,
        companyLogoUrl: email.company_logo_url !== undefined ? email.company_logo_url : email.companyLogoUrl,
        companyDomain: email.company_domain !== undefined ? email.company_domain : email.companyDomain,
        // Account info
        emailAccountId: email.email_account_id !== undefined ? email.email_account_id : email.emailAccountId,
        // AI analysis
        category: email.category,
        importance: email.importance,
        masterImportanceScore: email.master_importance_score !== undefined ? email.master_importance_score : email.masterImportanceScore,
        isPersonallyRelevant: email.is_personally_relevant !== undefined ? email.is_personally_relevant : email.isPersonallyRelevant,
        isAboutMe: email.is_about_me !== undefined ? email.is_about_me : email.isAboutMe,
        mentionContext: email.mention_context || email.mentionContext,
        // Unsubscribe
        unsubscribeUrl: email.unsubscribe_url || email.unsubscribeUrl,
        unsubscribeEmail: email.unsubscribe_email || email.unsubscribeEmail,
      }
    })

    return {
      emails,
      total: response.data.total || 0,
      totalPages: response.data.totalPages || 1,
      badgeStats: response.data.badgeStats || []
    }
  }

  // Email Account endpoints
  async getEmailAccounts(): Promise<EmailAccount[]> {
    const response = await this.api.get<any>('/api/email-accounts')
    // Backend returns { email_accounts: [...] }, convert snake_case to camelCase
    const accounts = response.data.email_accounts || []
    return accounts.map((account: any) => ({
      id: account.id,
      email: account.email_address,
      provider: account.provider,
      isActive: account.is_active,
      lastSyncAt: account.last_sync_at,
    }))
  }

  async addEmailAccount(data: {
    provider: 'gmail' | 'outlook' | 'imap'
    email: string
    password?: string
    accessToken?: string
    refreshToken?: string
    imapHost?: string
    imapPort?: number
  }): Promise<EmailAccount> {
    // Convert frontend camelCase to backend snake_case
    const payload = {
      provider: data.provider,
      email_address: data.email,
      password: data.password,
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      imap_host: data.imapHost,
      imap_port: data.imapPort,
    }
    const response = await this.api.post<any>('/api/email-accounts', payload)
    // Backend returns { email_account: {...} }, extract and convert to camelCase
    const account = response.data.email_account
    return {
      id: account.id,
      email: account.email_address,
      provider: account.provider,
      isActive: account.is_active,
      lastSyncAt: account.last_sync_at,
    } as EmailAccount
  }

  async removeEmailAccount(id: string): Promise<void> {
    await this.api.delete(`/api/email-accounts/${id}`)
  }

  async syncEmailAccount(id: string): Promise<ApiResponse<any>> {
    // Note: Backend doesn't have a direct sync endpoint per account
    // Sync happens through background jobs
    // For now, we'll just fetch emails using the fetch endpoint
    return this.syncEmails()
  }

  // Badge endpoints
  async getBadgeStats(emailAccountId?: string | null): Promise<any> {
    const params = emailAccountId ? { emailAccountId } : {}
    const response = await this.api.get('/api/emails/badges/stats', { params })
    return response.data
  }

  async getCategoryStats(emailAccountId?: string | null): Promise<any> {
    const params = emailAccountId ? { emailAccountId } : {}
    const response = await this.api.get('/api/emails/categories/stats', { params })
    return response.data
  }

  // Analytics / Engagement endpoints
  async recordEngagementEvent(event: {
    event_type: 'opened' | 'closed' | 'link_clicked' | 'badge_filtered'
    email_id?: string
    event_data?: Record<string, any>
  }): Promise<void> {
    await this.api.post('/api/analytics/events', event)
  }

  async saveViewSession(session: {
    session_id: string
    email_id: string
    opened_at: string
    closed_at: string
    duration_seconds: number
    link_clicks_count: number
  }): Promise<void> {
    await this.api.post('/api/analytics/view-sessions', session)
  }

  async getAnalyticsOverview(): Promise<any> {
    const response = await this.api.get('/api/analytics/overview')
    return response.data
  }

  async getReadingStats(): Promise<any> {
    const response = await this.api.get('/api/analytics/reading-stats')
    return response.data
  }

  async getTopEngagedBadges(limit?: number): Promise<any> {
    const response = await this.api.get('/api/analytics/top-badges', {
      params: limit ? { limit } : undefined
    })
    return response.data
  }

  // Snoozed emails endpoint
  async getSnoozedEmails(): Promise<Email[]> {
    const response = await this.api.get<any>('/api/emails/snoozed')
    return (response.data.emails || []).map((email: any) => ({
      ...email,
      to: this.formatToField(email),
      htmlBody: email.html_body || email.htmlBody,
      textBody: email.text_body || email.textBody,
      isRead: email.is_read ?? email.isRead,
      isStarred: email.is_starred ?? email.isStarred,
      snoozedUntil: email.snoozed_until || email.snoozedUntil,
    }))
  }

  // Archived emails endpoint
  async getArchivedEmails(limit?: number, offset?: number): Promise<Email[]> {
    const response = await this.api.get<any>('/api/emails/archived', {
      params: { limit: limit || 50, offset: offset || 0 }
    })
    return (response.data.emails || []).map((email: any) => ({
      ...email,
      to: this.formatToField(email),
      htmlBody: email.html_body || email.htmlBody,
      textBody: email.text_body || email.textBody,
      isRead: email.is_read ?? email.isRead,
      isStarred: email.is_starred ?? email.isStarred,
      isArchived: email.is_archived ?? email.isArchived,
    }))
  }

  // Deleted/Trash emails endpoint
  async getDeletedEmails(limit?: number, offset?: number): Promise<Email[]> {
    const response = await this.api.get<any>('/api/emails/deleted', {
      params: { limit: limit || 50, offset: offset || 0 }
    })
    return (response.data.emails || []).map((email: any) => ({
      ...email,
      to: this.formatToField(email),
      htmlBody: email.html_body || email.htmlBody,
      textBody: email.text_body || email.textBody,
      isRead: email.is_read ?? email.isRead,
      isStarred: email.is_starred ?? email.isStarred,
      isDeleted: email.is_deleted ?? email.isDeleted,
      deletedAt: email.deleted_at || email.deletedAt,
    }))
  }

  // Soft delete email (move to trash)
  async softDeleteEmail(id: string): Promise<void> {
    await this.api.post(`/api/emails/${id}/trash`)
  }

  // Restore email from trash
  async restoreEmail(id: string): Promise<void> {
    await this.api.delete(`/api/emails/${id}/trash`)
  }

  // Permanently delete email from trash
  async permanentlyDeleteEmail(id: string): Promise<void> {
    await this.api.delete(`/api/emails/${id}`)
  }

  // Helper to format 'to' field
  private formatToField(email: any): string {
    const toData = email.to_emails || email.to
    if (Array.isArray(toData) && toData.length > 0) {
      const firstRecipient = toData[0]
      if (typeof firstRecipient === 'object' && firstRecipient !== null) {
        return firstRecipient.name || firstRecipient.email || 'Unknown'
      } else if (typeof firstRecipient === 'string') {
        return firstRecipient
      }
    } else if (typeof toData === 'string') {
      return toData
    }
    return 'Unknown'
  }

  // ==========================================
  // Unsubscribe Recommendations API
  // ==========================================

  async getUnsubscribeSettings(): Promise<UnsubscribeSettings> {
    const response = await this.api.get<any>('/api/unsubscribe/settings')
    const data = response.data
    return {
      enabled: data.enabled,
      timeRangeDays: data.time_range_days ?? data.timeRangeDays,
      minEmailsThreshold: data.min_emails_threshold ?? data.minEmailsThreshold,
      maxOpenRateThreshold: data.max_open_rate_threshold ?? data.maxOpenRateThreshold,
      showNotificationBadge: data.show_notification_badge ?? data.showNotificationBadge,
      inactiveDaysThreshold: data.inactive_days_threshold ?? data.inactiveDaysThreshold ?? 30,
    }
  }

  async updateUnsubscribeSettings(settings: Partial<UnsubscribeSettings>): Promise<UnsubscribeSettings> {
    const payload = {
      enabled: settings.enabled,
      time_range_days: settings.timeRangeDays,
      min_emails_threshold: settings.minEmailsThreshold,
      max_open_rate_threshold: settings.maxOpenRateThreshold,
      show_notification_badge: settings.showNotificationBadge,
      inactive_days_threshold: settings.inactiveDaysThreshold,
    }
    const response = await this.api.patch<any>('/api/unsubscribe/settings', payload)
    const data = response.data
    return {
      enabled: data.enabled,
      timeRangeDays: data.time_range_days ?? data.timeRangeDays,
      minEmailsThreshold: data.min_emails_threshold ?? data.minEmailsThreshold,
      maxOpenRateThreshold: data.max_open_rate_threshold ?? data.maxOpenRateThreshold,
      showNotificationBadge: data.show_notification_badge ?? data.showNotificationBadge,
      inactiveDaysThreshold: data.inactive_days_threshold ?? data.inactiveDaysThreshold ?? 30,
    }
  }

  async getUnsubscribeRecommendations(): Promise<UnsubscribeRecommendation[]> {
    const response = await this.api.get<any>('/api/unsubscribe/recommendations')
    return (response.data.recommendations || []).map((rec: any) => ({
      id: rec.id,
      senderEmail: rec.sender_email ?? rec.senderEmail,
      senderName: rec.sender_name ?? rec.senderName,
      companyName: rec.company_name ?? rec.companyName,
      companyLogoUrl: rec.company_logo_url ?? rec.companyLogoUrl,
      totalEmails: rec.total_emails ?? rec.totalEmails,
      emailsOpened: rec.emails_opened ?? rec.emailsOpened,
      openRate: parseFloat(rec.open_rate ?? rec.openRate ?? 0),
      daysSinceLastOpen: rec.days_since_last_open ?? rec.daysSinceLastOpen,
      recommendationScore: parseFloat(rec.recommendation_score ?? rec.recommendationScore ?? 0),
      status: rec.status,
      unsubscribeUrl: rec.unsubscribe_url ?? rec.unsubscribeUrl,
      unsubscribeEmail: rec.unsubscribe_email ?? rec.unsubscribeEmail,
      createdAt: rec.created_at ?? rec.createdAt,
    }))
  }

  async getUnsubscribeRecommendationCount(): Promise<number> {
    const response = await this.api.get<any>('/api/unsubscribe/recommendations/count')
    return response.data.count || 0
  }

  async dismissUnsubscribeRecommendation(senderEmail: string): Promise<void> {
    await this.api.post('/api/unsubscribe/recommendations/dismiss', { senderEmail })
  }

  async unsubscribeFromSenders(senderEmails: string[]): Promise<UnsubscribeResult[]> {
    const response = await this.api.post<any>('/api/unsubscribe/unsubscribe', { senderEmails })
    return (response.data.results || []).map((result: any) => ({
      senderEmail: result.sender_email ?? result.senderEmail,
      success: result.success,
      method: result.method,
      error: result.error,
    }))
  }

  async generateUnsubscribeRecommendations(): Promise<{ count: number }> {
    const response = await this.api.post<any>('/api/unsubscribe/recommendations/generate')
    return { count: response.data.count || 0 }
  }

  async getSenderMetrics(limit?: number, offset?: number): Promise<SenderMetrics[]> {
    const response = await this.api.get<any>('/api/unsubscribe/senders', {
      params: { limit: limit || 50, offset: offset || 0 }
    })
    return (response.data.senders || []).map((sender: any) => ({
      id: sender.id,
      senderEmail: sender.sender_email ?? sender.senderEmail,
      senderName: sender.sender_name ?? sender.senderName,
      companyName: sender.company_name ?? sender.companyName,
      totalEmails: sender.total_emails ?? sender.totalEmails,
      emailsOpened: sender.emails_opened ?? sender.emailsOpened,
      openRate: parseFloat(sender.open_rate ?? sender.openRate ?? 0),
      engagementScore: parseFloat(sender.engagement_score ?? sender.engagementScore ?? 0),
      hasUnsubscribeOption: sender.has_unsubscribe_option ?? sender.hasUnsubscribeOption,
      isUnsubscribed: sender.is_unsubscribed ?? sender.isUnsubscribed,
      lastEmailAt: sender.last_email_at ?? sender.lastEmailAt,
      lastOpenedAt: sender.last_opened_at ?? sender.lastOpenedAt,
    }))
  }

  async getLowEngagementSenders(timeRangeDays?: number): Promise<SenderMetrics[]> {
    const response = await this.api.get<any>('/api/unsubscribe/senders/low-engagement', {
      params: timeRangeDays ? { time_range_days: timeRangeDays } : undefined
    })
    return (response.data.senders || []).map((sender: any) => ({
      id: sender.id,
      senderEmail: sender.sender_email ?? sender.senderEmail,
      senderName: sender.sender_name ?? sender.senderName,
      companyName: sender.company_name ?? sender.companyName,
      totalEmails: sender.total_emails ?? sender.totalEmails,
      emailsOpened: sender.emails_opened ?? sender.emailsOpened,
      openRate: parseFloat(sender.open_rate ?? sender.openRate ?? 0),
      engagementScore: parseFloat(sender.engagement_score ?? sender.engagementScore ?? 0),
      hasUnsubscribeOption: sender.has_unsubscribe_option ?? sender.hasUnsubscribeOption,
      isUnsubscribed: sender.is_unsubscribed ?? sender.isUnsubscribed,
      lastEmailAt: sender.last_email_at ?? sender.lastEmailAt,
      lastOpenedAt: sender.last_opened_at ?? sender.lastOpenedAt,
    }))
  }

  // Contacts endpoints
  async searchContacts(query: string, emailAccountId?: string, limit: number = 10): Promise<Contact[]> {
    const response = await this.api.get('/api/contacts/search', {
      params: { q: query, emailAccountId, limit }
    })
    return response.data.contacts || []
  }

  async getRecentContacts(limit: number = 5): Promise<Contact[]> {
    const response = await this.api.get('/api/contacts/recent', {
      params: { limit }
    })
    return response.data.contacts || []
  }

  async getFrequentContacts(limit: number = 10): Promise<Contact[]> {
    const response = await this.api.get('/api/contacts/frequent', {
      params: { limit }
    })
    return response.data.contacts || []
  }

  // ==========================================
  // Actions API (Deadlines, Reminders, Tasks)
  // ==========================================

  async getActions(params?: {
    status?: 'pending' | 'completed' | 'dismissed' | 'all';
    calendarType?: 'your_life' | 'reminder';
    actionType?: 'deadline' | 'reminder' | 'task';
    limit?: number;
    offset?: number;
  }): Promise<ActionsResponse> {
    const response = await this.api.get<any>('/api/actions', { params })
    return {
      actions: (response.data.data?.actions || []).map(this.formatAction),
      counts: response.data.data?.counts || {
        your_life: { pending: 0, completed: 0, dismissed: 0 },
        reminder: { pending: 0, completed: 0, dismissed: 0 }
      },
      pagination: response.data.data?.pagination
    }
  }

  async getDeadlines(days: number = 30): Promise<EmailAction[]> {
    const response = await this.api.get<any>('/api/actions/deadlines', {
      params: { days }
    })
    return (response.data.data || []).map(this.formatAction)
  }

  async getReminders(): Promise<EmailAction[]> {
    const response = await this.api.get<any>('/api/actions/reminders')
    return (response.data.data || []).map(this.formatAction)
  }

  async getActionCounts(): Promise<ActionCounts> {
    const response = await this.api.get<any>('/api/actions/counts')
    return response.data.data || {
      your_life: { pending: 0, overdue: 0, upcoming: 0 },
      reminder: { pending: 0, overdue: 0, upcoming: 0 },
      total: { pending: 0, overdue: 0, upcoming: 0 }
    }
  }

  async createAction(data: {
    emailId?: string;
    actionType?: 'deadline' | 'reminder' | 'task';
    title: string;
    description?: string;
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    calendarType?: 'your_life' | 'reminder';
  }): Promise<EmailAction> {
    const response = await this.api.post<any>('/api/actions', data)
    return this.formatAction(response.data.data)
  }

  async updateAction(id: string, data: {
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    calendarType?: 'your_life' | 'reminder';
  }): Promise<EmailAction> {
    const response = await this.api.patch<any>(`/api/actions/${id}`, data)
    return this.formatAction(response.data.data)
  }

  async completeAction(id: string): Promise<EmailAction> {
    const response = await this.api.post<any>(`/api/actions/${id}/complete`)
    return this.formatAction(response.data.data)
  }

  async dismissAction(id: string): Promise<EmailAction> {
    const response = await this.api.post<any>(`/api/actions/${id}/dismiss`)
    return this.formatAction(response.data.data)
  }

  async reopenAction(id: string): Promise<EmailAction> {
    const response = await this.api.post<any>(`/api/actions/${id}/reopen`)
    return this.formatAction(response.data.data)
  }

  async deleteAction(id: string): Promise<void> {
    await this.api.delete(`/api/actions/${id}`)
  }

  async getCalendarEvents(days: number = 30): Promise<CalendarEvent[]> {
    const response = await this.api.get<any>('/api/actions/calendar', {
      params: { days }
    })
    return (response.data.data || []).map((event: any) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      time: event.time,
      url: event.url,
      platform: event.platform,
      fromEmail: event.fromEmail,
      fromName: event.fromName,
      priority: event.priority,
      emailSubject: event.emailSubject,
      emailId: event.emailId,
      accountEmail: event.accountEmail,
    }))
  }

  private formatAction(action: any): EmailAction {
    return {
      id: action.id,
      emailId: action.emailId || action.email_id,
      userId: action.userId || action.user_id,
      actionType: action.actionType || action.action_type,
      title: action.title,
      description: action.description,
      dueDate: action.dueDate || action.due_date,
      priority: action.priority,
      status: action.status,
      calendarType: action.calendarType || action.calendar_type,
      sourceText: action.sourceText || action.source_text,
      createdAt: action.createdAt || action.created_at,
      completedAt: action.completedAt || action.completed_at,
      googleCalendarEventId: action.googleCalendarEventId || action.google_calendar_event_id,
      syncedToCalendar: action.syncedToCalendar || action.synced_to_calendar,
      // Additional fields from join
      emailSubject: action.emailSubject || action.email_subject,
      fromEmail: action.fromEmail || action.from_email,
      fromName: action.fromName || action.from_name,
    }
  }

  // ==========================================
  // Scheduled Email / Undo Send API
  // ==========================================

  /**
   * Schedule an email for sending with undo capability
   * @param emailData - Email content and recipients
   * @param undoDelay - Seconds before sending (default 10, for undo feature)
   * @param sendAt - Optional specific time to send (for scheduled send feature)
   */
  async scheduleEmail(emailData: {
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    subject: string;
    text?: string;
    html?: string;
    inReplyTo?: string;
    emailAccountId: string;
  }, undoDelay: number = 10, sendAt?: Date): Promise<ScheduledEmailResponse> {
    const response = await this.api.post<any>('/api/emails/schedule', {
      ...emailData,
      undoDelay,
      sendAt: sendAt?.toISOString()
    })
    return {
      scheduledEmailId: response.data.scheduledEmailId,
      scheduledFor: response.data.scheduledFor,
      canUndoUntil: response.data.canUndoUntil,
      message: response.data.message
    }
  }

  /**
   * Cancel a scheduled email (undo send)
   */
  async cancelScheduledEmail(id: string): Promise<void> {
    await this.api.delete(`/api/emails/scheduled/${id}`)
  }

  /**
   * Get all pending scheduled emails
   */
  async getScheduledEmails(): Promise<ScheduledEmail[]> {
    const response = await this.api.get<any>('/api/emails/scheduled')
    return (response.data.scheduledEmails || []).map((email: any) => ({
      id: email.id,
      emailAccountId: email.emailAccountId,
      to: email.to,
      subject: email.subject,
      scheduledFor: email.scheduledFor,
      status: email.status,
      createdAt: email.createdAt
    }))
  }
}

// Contact type
export interface Contact {
  email: string
  name?: string
  photoUrl?: string
  frequency: number
  lastUsed: string
  source?: 'google' | 'email'
}

// Unsubscribe Types
export interface UnsubscribeSettings {
  enabled: boolean
  timeRangeDays: number
  minEmailsThreshold: number
  maxOpenRateThreshold: number
  showNotificationBadge: boolean
  inactiveDaysThreshold: number
}

export interface UnsubscribeRecommendation {
  id: string
  senderEmail: string
  senderName: string | null
  companyName: string | null
  companyLogoUrl: string | null
  totalEmails: number
  emailsOpened: number
  openRate: number
  daysSinceLastOpen: number | null
  recommendationScore: number
  status: 'pending' | 'dismissed' | 'unsubscribed'
  unsubscribeUrl: string | null
  unsubscribeEmail: string | null
  createdAt: string
}

export interface UnsubscribeResult {
  senderEmail: string
  success: boolean
  method: 'url' | 'email' | null
  error?: string
}

export interface SenderMetrics {
  id: string
  senderEmail: string
  senderName: string | null
  companyName: string | null
  totalEmails: number
  emailsOpened: number
  openRate: number
  engagementScore: number
  hasUnsubscribeOption: boolean
  isUnsubscribed: boolean
  lastEmailAt: string | null
  lastOpenedAt: string | null
}

// Scheduled Email Types (for Undo Send / Send Later)
export interface ScheduledEmailResponse {
  scheduledEmailId: string
  scheduledFor: string
  canUndoUntil: string
  message: string
}

export interface ScheduledEmail {
  id: string
  emailAccountId: string
  to: Array<{ email: string; name?: string }>
  subject: string
  scheduledFor: string
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  createdAt: string
}

export const apiService = new ApiService()
