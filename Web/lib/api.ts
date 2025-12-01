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
        to: toField,
        htmlBody: email.html_body || email.htmlBody,
        textBody: email.text_body || email.textBody,
        isRead: email.is_read !== undefined ? email.is_read : email.isRead,
        isStarred: email.is_starred !== undefined ? email.is_starred : email.isStarred,
        hasAttachment: email.has_attachment !== undefined ? email.has_attachment : email.hasAttachment,
        companyName: email.company_name !== undefined ? email.company_name : email.companyName,
        companyLogoUrl: email.company_logo_url !== undefined ? email.company_logo_url : email.companyLogoUrl,
        emailAccountId: email.email_account_id !== undefined ? email.email_account_id : email.emailAccountId,
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

  async getEmailById(id: number): Promise<Email> {
    const response = await this.api.get<Email>(`/api/emails/${id}`)
    return response.data
  }

  async markEmailAsRead(id: number, isRead: boolean): Promise<Email> {
    const response = await this.api.patch<Email>(`/api/emails/${id}/read`, { isRead })
    return response.data
  }

  async toggleEmailStar(id: number, isStarred: boolean): Promise<Email> {
    const response = await this.api.patch<Email>(`/api/emails/${id}/star`, { isStarred })
    return response.data
  }

  async deleteEmail(id: number): Promise<void> {
    await this.api.delete(`/api/emails/${id}`)
  }

  async deleteEmails(ids: number[]): Promise<void> {
    await this.api.post('/api/emails/bulk-delete', { emailIds: ids })
  }

  async syncEmails(provider: string = 'Gmail'): Promise<ApiResponse<any>> {
    const response = await this.api.post<ApiResponse<any>>('/api/emails/fetch', { provider })
    return response.data
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

  async removeEmailAccount(id: number): Promise<void> {
    await this.api.delete(`/api/email-accounts/${id}`)
  }

  async syncEmailAccount(id: number): Promise<ApiResponse<any>> {
    // Note: Backend doesn't have a direct sync endpoint per account
    // Sync happens through background jobs
    // For now, we'll just fetch emails using the fetch endpoint
    return this.syncEmails()
  }

  // Badge endpoints
  async getBadgeStats(): Promise<any> {
    const response = await this.api.get('/api/emails/badges/stats')
    return response.data
  }

  async getCategoryStats(): Promise<any> {
    const response = await this.api.get('/api/emails/categories/stats')
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
}

export const apiService = new ApiService()
