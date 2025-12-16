import { create } from 'zustand'
import type { User, Email, EmailAccount, Session } from '@/types'
import { apiService } from './api'

// Helper to get token from either storage
const getToken = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key) || sessionStorage.getItem(key)
}

// Helper to get the appropriate storage based on rememberMe setting
const getStorage = (rememberMe: boolean): Storage => {
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
  return rememberMe ? localStorage : sessionStorage
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

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  rememberMe: boolean
  sessionId: string | null
  sessions: Session[]
  sessionsLoading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (email: string, password: string, name?: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  // Session management
  fetchSessions: () => Promise<void>
  revokeSession: (sessionId: string) => Promise<void>
  revokeAllSessions: () => Promise<void>
}

type ViewMode = 'compact' | 'detailed' | 'minimal'

interface BadgeStat {
  name: string
  color: string
  icon: string
  category: string
  count: number
}

interface EmailState {
  emails: Email[]
  selectedEmail: Email | null
  isLoading: boolean
  error: string | null
  page: number
  totalPages: number
  totalEmails: number
  allEmailsCount: number // Total count of ALL emails (ignores filters) - for "All" badge
  viewMode: ViewMode
  searchQuery: string
  refreshKey: number // Incremented when emails are fetched to trigger filter refresh
  searchBadgeStats: BadgeStat[] | null // Badge stats for search results (null when not searching)
  filters: {
    isRead?: boolean
    isStarred?: boolean
    category?: string
    importance?: string
    isMeRelated?: boolean
    badgeName?: string
    specialFolder?: 'starred' | 'snoozed' | 'archived' | 'deleted' | 'sent' | 'spam'
    emailAccountId?: number
    // Advanced search filters
    advancedSearch?: {
      from?: string
      to?: string
      subject?: string
      hasWords?: string
      doesntHave?: string
      hasAttachment?: boolean
      dateWithin?: number
      dateFrom?: string
      dateTo?: string
    }
  }
  fetchEmails: () => Promise<void>
  selectEmail: (email: Email | null) => void
  markAsRead: (id: string, isRead: boolean) => Promise<void>
  toggleStar: (id: string, isStarred: boolean) => Promise<void>
  deleteEmail: (id: string) => Promise<void>
  deleteEmails: (ids: string[]) => Promise<void>
  archiveEmail: (id: string) => void  // Optimistically remove from local state
  snoozeEmail: (id: string) => void   // Optimistically remove from local state
  setFilters: (filters: EmailState['filters']) => void
  setPage: (page: number) => void
  setViewMode: (mode: ViewMode) => void
  setSearchQuery: (query: string) => void
  syncEmails: () => Promise<void>
  addPushedEmails: (newEmails: Email[]) => void
}

interface EmailAccountState {
  accounts: EmailAccount[]
  isLoading: boolean
  fetchAccounts: () => Promise<void>
  addAccount: (data: any) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  syncAccount: (id: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  rememberMe: false,
  sessionId: null,
  sessions: [],
  sessionsLoading: false,

  login: async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await apiService.login({ email, password, rememberMe })

      // Store in appropriate storage based on rememberMe
      const storage = getStorage(rememberMe)
      storage.setItem('accessToken', response.accessToken)
      storage.setItem('refreshToken', response.refreshToken)
      storage.setItem('user', JSON.stringify(response.user))
      storage.setItem('rememberMe', String(rememberMe))
      if (response.sessionId) {
        storage.setItem('sessionId', response.sessionId)
      }

      set({
        user: response.user,
        isAuthenticated: true,
        rememberMe,
        sessionId: response.sessionId || null,
      })
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  },

  register: async (email: string, password: string, name?: string, rememberMe: boolean = true) => {
    try {
      const response = await apiService.register({ email, password, name, rememberMe })

      // Store in appropriate storage based on rememberMe
      const storage = getStorage(rememberMe)
      storage.setItem('accessToken', response.accessToken)
      storage.setItem('refreshToken', response.refreshToken)
      storage.setItem('user', JSON.stringify(response.user))
      storage.setItem('rememberMe', String(rememberMe))
      if (response.sessionId) {
        storage.setItem('sessionId', response.sessionId)
      }

      set({
        user: response.user,
        isAuthenticated: true,
        rememberMe,
        sessionId: response.sessionId || null,
      })
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  },

  logout: async () => {
    try {
      await apiService.logout()
      clearAuthData()
      set({
        user: null,
        isAuthenticated: false,
        rememberMe: false,
        sessionId: null,
        sessions: [],
      })
    } catch (error) {
      console.error('Logout failed:', error)
      clearAuthData()
      set({
        user: null,
        isAuthenticated: false,
        rememberMe: false,
        sessionId: null,
        sessions: [],
      })
    }
  },

  checkAuth: async () => {
    try {
      // Check both storages for token
      const token = getToken('accessToken')
      const userJson = getToken('user')
      const storedRememberMe = getToken('rememberMe') === 'true'
      const storedSessionId = getToken('sessionId')

      if (!token) {
        set({ isLoading: false, isAuthenticated: false })
        return
      }

      // If we have a token and user data, use it
      if (userJson) {
        try {
          const user = JSON.parse(userJson)
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            rememberMe: storedRememberMe,
            sessionId: storedSessionId,
          })
          return
        } catch (e) {
          // Invalid JSON, fall through to error handling
        }
      }

      // No user data, clear auth
      clearAuthData()
      set({ user: null, isAuthenticated: false, isLoading: false })
    } catch (error) {
      console.error('Auth check failed:', error)
      clearAuthData()
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  // Session management
  fetchSessions: async () => {
    set({ sessionsLoading: true })
    try {
      const sessions = await apiService.getSessions()
      set({ sessions, sessionsLoading: false })
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      set({ sessionsLoading: false })
    }
  },

  revokeSession: async (sessionId: string) => {
    try {
      await apiService.revokeSession(sessionId)
      // If revoking current session, logout
      if (sessionId === get().sessionId) {
        await get().logout()
      } else {
        // Remove from local state
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }))
      }
    } catch (error) {
      console.error('Failed to revoke session:', error)
      throw error
    }
  },

  revokeAllSessions: async () => {
    try {
      await apiService.revokeAllSessions()
      clearAuthData()
      set({
        user: null,
        isAuthenticated: false,
        rememberMe: false,
        sessionId: null,
        sessions: [],
      })
    } catch (error) {
      console.error('Failed to revoke all sessions:', error)
      throw error
    }
  },
}))

export const useEmailStore = create<EmailState>((set, get) => ({
  emails: [],
  selectedEmail: null,
  isLoading: false,
  error: null,
  page: 1,
  totalPages: 1,
  totalEmails: 0,
  allEmailsCount: 0,
  viewMode: (typeof window !== 'undefined' && localStorage.getItem('emailViewMode') as ViewMode) || 'compact',
  searchQuery: '',
  refreshKey: 0,
  searchBadgeStats: null,
  filters: {},

  fetchEmails: async () => {
    set({ isLoading: true, error: null })
    try {
      const { page, filters, searchQuery, allEmailsCount } = get()
      const limit = 20
      const offset = (page - 1) * limit

      // Handle special folders with separate endpoints or filters
      if (filters.specialFolder === 'starred') {
        // Starred emails use the regular endpoint with isStarred filter
        const response = await apiService.getEmails({
          limit,
          offset,
          isStarred: true,
          ...(filters.emailAccountId && { emailAccountId: filters.emailAccountId }),
          ...(searchQuery && { search: searchQuery })
        })
        set({
          emails: response.data,
          totalPages: response.pagination.totalPages,
          totalEmails: response.pagination.total,
          isLoading: false,
        })
        return
      }

      if (filters.specialFolder === 'sent') {
        // TODO: Implement sent emails endpoint when available
        // For now, return empty with a message flag
        set({
          emails: [],
          totalPages: 1,
          totalEmails: 0,
          isLoading: false,
        })
        return
      }

      if (filters.specialFolder === 'spam') {
        // TODO: Implement spam emails endpoint when available
        // For now, return empty
        set({
          emails: [],
          totalPages: 1,
          totalEmails: 0,
          isLoading: false,
        })
        return
      }

      if (filters.specialFolder === 'snoozed') {
        const emails = await apiService.getSnoozedEmails()
        set({
          emails,
          totalPages: 1,
          totalEmails: emails.length,
          isLoading: false,
        })
        return
      }

      if (filters.specialFolder === 'archived') {
        const emails = await apiService.getArchivedEmails(limit, offset)
        set({
          emails,
          totalPages: 1,
          totalEmails: emails.length,
          isLoading: false,
        })
        return
      }

      if (filters.specialFolder === 'deleted') {
        const emails = await apiService.getDeletedEmails(limit, offset)
        set({
          emails,
          totalPages: 1,
          totalEmails: emails.length,
          isLoading: false,
        })
        return
      }

      // Regular email fetch - exclude specialFolder and advancedSearch from params
      const { specialFolder, advancedSearch, ...regularFilters } = filters

      // If we have advanced search filters, use the search endpoint
      if (advancedSearch && Object.keys(advancedSearch).length > 0) {
        const response = await apiService.advancedSearch({
          ...advancedSearch,
          page,
          limit
        })
        set((state) => ({
          emails: response.emails,
          totalPages: response.totalPages,
          totalEmails: response.total,
          searchBadgeStats: response.badgeStats || null,
          isLoading: false,
          refreshKey: state.refreshKey + 1,
        }))
        return
      }

      const response = await apiService.getEmails({
        limit,
        offset,
        ...regularFilters,
        ...(searchQuery && { search: searchQuery })
      })

      // Check if we're fetching without filters (for "All" count)
      const hasFilters = Object.keys(regularFilters).length > 0 || searchQuery

      set((state) => ({
        emails: response.data,
        totalPages: response.pagination.totalPages,
        totalEmails: response.pagination.total,
        // Only update allEmailsCount when there are no filters, or if it's never been set
        allEmailsCount: !hasFilters ? response.pagination.total : (allEmailsCount || response.pagination.total),
        isLoading: false,
        refreshKey: state.refreshKey + 1, // Increment to trigger filter refresh
        searchBadgeStats: null, // Clear search badge stats when not doing advanced search
      }))
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      set({ error: 'Failed to load emails', isLoading: false })
    }
  },

  selectEmail: (email: Email | null) => {
    set({ selectedEmail: email })
    if (email && !email.isRead) {
      get().markAsRead(email.id, true)
    }
  },

  markAsRead: async (id: string, isRead: boolean) => {
    try {
      await apiService.markEmailAsRead(id, isRead)
      set((state) => ({
        emails: state.emails.map((email) =>
          email.id === id ? { ...email, isRead } : email
        ),
        selectedEmail:
          state.selectedEmail?.id === id
            ? { ...state.selectedEmail, isRead }
            : state.selectedEmail,
      }))
    } catch (error) {
      console.error('Failed to mark email as read:', error)
    }
  },

  toggleStar: async (id: string, isStarred: boolean) => {
    try {
      await apiService.toggleEmailStar(id, isStarred)
      set((state) => ({
        emails: state.emails.map((email) =>
          email.id === id ? { ...email, isStarred } : email
        ),
        selectedEmail:
          state.selectedEmail?.id === id
            ? { ...state.selectedEmail, isStarred }
            : state.selectedEmail,
      }))
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  },

  deleteEmail: async (id: string) => {
    try {
      await apiService.deleteEmail(id)
      set((state) => ({
        emails: state.emails.filter((email) => email.id !== id),
        selectedEmail: state.selectedEmail?.id === id ? null : state.selectedEmail,
      }))
    } catch (error) {
      console.error('Failed to delete email:', error)
    }
  },

  deleteEmails: async (ids: string[]) => {
    try {
      await apiService.deleteEmails(ids)
      set((state) => ({
        emails: state.emails.filter((email) => !ids.includes(email.id)),
        selectedEmail: state.selectedEmail && ids.includes(state.selectedEmail.id) ? null : state.selectedEmail,
      }))
    } catch (error) {
      console.error('Failed to delete emails:', error)
      throw error
    }
  },

  archiveEmail: (id: string) => {
    // Optimistically remove email from local state (API call handled separately)
    set((state) => ({
      emails: state.emails.filter((email) => email.id !== id),
      selectedEmail: state.selectedEmail?.id === id ? null : state.selectedEmail,
    }))
  },

  snoozeEmail: (id: string) => {
    // Optimistically remove email from local state (API call handled separately)
    set((state) => ({
      emails: state.emails.filter((email) => email.id !== id),
      selectedEmail: state.selectedEmail?.id === id ? null : state.selectedEmail,
    }))
  },

  setFilters: (filters) => {
    set({ filters, page: 1 })
    get().fetchEmails()
  },

  setPage: (page) => {
    set({ page })
    get().fetchEmails()
  },

  setViewMode: (mode: ViewMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('emailViewMode', mode)
    }
    set({ viewMode: mode })
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query, page: 1 })
    get().fetchEmails()
  },

  syncEmails: async () => {
    set({ isLoading: true })
    try {
      await apiService.syncEmails()
      await get().fetchEmails()
    } catch (error) {
      console.error('Failed to sync emails:', error)
      set({ error: 'Failed to sync emails', isLoading: false })
    }
  },

  addPushedEmails: (newEmails: Email[]) => {
    if (newEmails.length === 0) return

    set((state) => {
      // Filter out any emails that already exist (by id)
      const existingIds = new Set(state.emails.map(e => e.id))
      const uniqueNewEmails = newEmails.filter(e => !existingIds.has(e.id))

      if (uniqueNewEmails.length === 0) return state

      // Prepend new emails to the list (newest first)
      return {
        emails: [...uniqueNewEmails, ...state.emails],
        totalEmails: state.totalEmails + uniqueNewEmails.length,
        allEmailsCount: state.allEmailsCount + uniqueNewEmails.length,
      }
    })
  },
}))

export const useEmailAccountStore = create<EmailAccountState>((set) => ({
  accounts: [],
  isLoading: false,

  fetchAccounts: async () => {
    set({ isLoading: true })
    try {
      const accounts = await apiService.getEmailAccounts()
      set({ accounts, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      set({ isLoading: false })
    }
  },

  addAccount: async (data) => {
    try {
      const account = await apiService.addEmailAccount(data)
      set((state) => ({ accounts: [...state.accounts, account] }))
    } catch (error) {
      console.error('Failed to add account:', error)
      throw error
    }
  },

  removeAccount: async (id: string) => {
    try {
      await apiService.removeEmailAccount(id)
      set((state) => ({
        accounts: state.accounts.filter((account) => account.id !== id),
      }))
    } catch (error) {
      console.error('Failed to remove account:', error)
      throw error
    }
  },

  syncAccount: async (id: string) => {
    try {
      await apiService.syncEmailAccount(id)
    } catch (error) {
      console.error('Failed to sync account:', error)
      throw error
    }
  },
}))
