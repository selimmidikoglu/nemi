'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import BadgeManagement from '@/components/BadgeManagement'
import NotificationSettings from '@/components/NotificationSettings'
import { ThemeSettings } from '@/components/ThemeToggle'
import { isTrackingEnabled, setTrackingEnabled } from '@/hooks/useEmailTracking'
import { apiService, UnsubscribeSettings } from '@/lib/api'
import { MailX, Loader2 } from 'lucide-react'

type SettingsTab = 'badges' | 'account' | 'security' | 'notifications' | 'appearance' | 'privacy' | 'unsubscribe'

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, checkAuth, logout, user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('badges')

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/feed')}
              className="text-foreground hover:text-foreground/80"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <Link href="/feed" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/Nemi-logo.png"
                alt="NEMI Logo"
                width={32}
                height={32}
                className="rounded"
                priority
              />
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-muted-foreground">
                {typeof user.email === 'string' ? user.email : (user.email as any)?.email || user.name || 'User'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar navigation */}
        <div className="w-64 bg-card border-r border-border p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('badges')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'badges'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Badges
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'account'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'security'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Security
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'notifications'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notifications
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'appearance'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Appearance
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'privacy'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Privacy
            </button>

            <button
              onClick={() => setActiveTab('unsubscribe')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'unsubscribe'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              <MailX className="w-5 h-5" />
              Unsubscribe
            </button>

            {/* Logout button at bottom */}
            <div className="pt-4 mt-4 border-t border-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {activeTab === 'badges' && <BadgesSettings />}
            {activeTab === 'account' && <AccountSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'notifications' && <NotificationsSettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'privacy' && <PrivacySettings />}
            {activeTab === 'unsubscribe' && <UnsubscribeSettingsSection />}
          </div>
        </div>
      </div>
    </div>
  )
}

function BadgesSettings() {
  return <BadgeManagement />
}

function AccountSettings() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Account Settings</h2>
        <p className="text-muted-foreground">
          Manage your account information and preferences.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
          <input
            type="email"
            value={typeof user?.email === 'string' ? user.email : (user?.email as any)?.email || ''}
            disabled
            className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Name</label>
          <input
            type="text"
            value={user?.name || ''}
            disabled
            className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground"
          />
        </div>
      </div>
    </div>
  )
}

function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Notification Preferences</h2>
        <p className="text-muted-foreground">
          Control how and when you receive notifications.
        </p>
      </div>

      <NotificationSettings />
    </div>
  )
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Appearance Settings</h2>
        <p className="text-muted-foreground">
          Customize the look and feel of your application.
        </p>
      </div>

      <ThemeSettings />
    </div>
  )
}

function SecuritySettings() {
  const { sessions, sessionsLoading, fetchSessions, revokeSession, revokeAllSessions, sessionId } = useAuthStore()
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleRevokeSession = async (id: string) => {
    setRevokingSessionId(id)
    try {
      await revokeSession(id)
    } catch (error) {
      console.error('Failed to revoke session:', error)
    } finally {
      setRevokingSessionId(null)
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm('Are you sure you want to sign out from all devices? You will need to sign in again.')) {
      return
    }
    setRevokingAll(true)
    try {
      await revokeAllSessions()
    } catch (error) {
      console.error('Failed to revoke all sessions:', error)
    } finally {
      setRevokingAll(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      case 'tablet':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Security Settings</h2>
        <p className="text-muted-foreground">
          Manage your active sessions and security preferences.
        </p>
      </div>

      {/* Active Sessions */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Active Sessions</h3>
              <p className="text-sm text-muted-foreground mt-1">
                These devices are currently signed in to your account.
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllSessions}
                disabled={revokingAll}
                className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {revokingAll ? 'Signing out...' : 'Sign out everywhere'}
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-border">
          {sessionsLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No active sessions found.
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.id === sessionId
              return (
                <div key={session.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isCurrent ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {session.deviceName || 'Unknown Device'}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                            Current
                          </span>
                        )}
                        {session.rememberMe && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                            Remember me
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {session.ipAddress && <span>{session.ipAddress} • </span>}
                        Last active: {formatDate(session.lastActivityAt)}
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingSessionId === session.id}
                      className="px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {revokingSessionId === session.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">About sessions</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sessions with "Remember me" enabled stay active for 30 days. Other sessions expire after 7 days of inactivity.
              Revoking a session will sign out that device immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrivacySettings() {
  const [trackingEnabled, setTrackingEnabledState] = useState(true)

  useEffect(() => {
    // Load current tracking setting
    setTrackingEnabledState(isTrackingEnabled())
  }, [])

  const handleTrackingChange = (enabled: boolean) => {
    setTrackingEnabledState(enabled)
    setTrackingEnabled(enabled)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Privacy Settings</h2>
        <p className="text-muted-foreground">
          Control how your data is collected and used.
        </p>
      </div>

      {/* Analytics Tracking */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Email Engagement Tracking</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Control whether NEMI tracks your email reading behavior for analytics.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Main tracking toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-foreground">Enable engagement tracking</div>
              <p className="text-sm text-muted-foreground mt-1">
                Track time spent reading emails, link clicks, and badge interactions to power your analytics dashboard.
              </p>
            </div>
            <button
              onClick={() => handleTrackingChange(!trackingEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                trackingEnabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  trackingEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* What we track */}
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-medium text-foreground mb-3">What we track when enabled:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Time spent reading each email (minimum 3 seconds threshold)
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Links clicked within emails
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Badge engagement patterns
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Email open/close events
              </li>
            </ul>
          </div>

          {/* What we don't track */}
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-medium text-foreground mb-3">What we never track:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Email content or text
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Sender or recipient personal information
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Attachment contents
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Privacy Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">Your data stays with you</p>
            <p className="text-sm text-muted-foreground mt-1">
              All analytics data is stored in your personal database and is never shared with third parties.
              You can disable tracking at any time and your historical data will remain intact.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function UnsubscribeSettingsSection() {
  const [settings, setSettings] = useState<UnsubscribeSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timeRangeOptions = [
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
  ]

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiService.getUnsubscribeSettings()
      setSettings(data)
    } catch (err) {
      console.error('Failed to fetch unsubscribe settings:', err)
      setError('Failed to load settings')
      // Set default values if API fails
      setSettings({
        enabled: true,
        timeRangeDays: 30,
        minEmailsThreshold: 5,
        maxOpenRateThreshold: 0.1,
        showNotificationBadge: true,
        inactiveDaysThreshold: 14,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = async (key: keyof UnsubscribeSettings, value: any) => {
    if (!settings) return

    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    setIsSaving(true)
    try {
      await apiService.updateUnsubscribeSettings({ [key]: value })
    } catch (err) {
      console.error('Failed to update setting:', err)
      // Revert on error
      setSettings(settings)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {error || 'Failed to load settings'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Smart Unsubscribe</h2>
        <p className="text-muted-foreground">
          Configure how NEMI recommends unsubscribing from low-engagement senders.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recommendation Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Customize when and how unsubscribe recommendations are generated.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-foreground">Enable smart recommendations</div>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically analyze your email engagement and suggest senders to unsubscribe from.
              </p>
            </div>
            <button
              onClick={() => updateSetting('enabled', !settings.enabled)}
              disabled={isSaving}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50',
                settings.enabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  settings.enabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Show Notification Badge Toggle */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <div className="flex-1">
              <div className="font-medium text-foreground">Show notification badge</div>
              <p className="text-sm text-muted-foreground mt-1">
                Display a badge icon when new unsubscribe recommendations are available.
              </p>
            </div>
            <button
              onClick={() => updateSetting('showNotificationBadge', !settings.showNotificationBadge)}
              disabled={isSaving || !settings.enabled}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50',
                settings.showNotificationBadge ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  settings.showNotificationBadge ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Time Range Selection */}
          <div className="border-t border-border pt-6">
            <div className="font-medium text-foreground mb-2">Analysis time range</div>
            <p className="text-sm text-muted-foreground mb-4">
              Only consider emails received within this time period when calculating engagement.
            </p>
            <div className="flex flex-wrap gap-2">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSetting('timeRangeDays', option.value)}
                  disabled={isSaving || !settings.enabled}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50',
                    settings.timeRangeDays === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-accent'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Minimum Emails Threshold */}
          <div className="border-t border-border pt-6">
            <div className="font-medium text-foreground mb-2">Minimum emails threshold</div>
            <p className="text-sm text-muted-foreground mb-4">
              Only recommend unsubscribing from senders with at least this many emails.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={3}
                max={20}
                value={settings.minEmailsThreshold}
                onChange={(e) => updateSetting('minEmailsThreshold', parseInt(e.target.value))}
                disabled={isSaving || !settings.enabled}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
              <span className="w-12 text-sm font-medium text-foreground text-right">
                {settings.minEmailsThreshold} emails
              </span>
            </div>
          </div>

          {/* Maximum Open Rate Threshold */}
          <div className="border-t border-border pt-6">
            <div className="font-medium text-foreground mb-2">Maximum open rate</div>
            <p className="text-sm text-muted-foreground mb-4">
              Recommend unsubscribing from senders with an open rate below this percentage.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={Math.round(settings.maxOpenRateThreshold * 100)}
                onChange={(e) => updateSetting('maxOpenRateThreshold', parseInt(e.target.value) / 100)}
                disabled={isSaving || !settings.enabled}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
              <span className="w-12 text-sm font-medium text-foreground text-right">
                {Math.round(settings.maxOpenRateThreshold * 100)}%
              </span>
            </div>
          </div>

          {/* Inactive Days Threshold */}
          <div className="border-t border-border pt-6">
            <div className="font-medium text-foreground mb-2">Inactive sender threshold</div>
            <p className="text-sm text-muted-foreground mb-4">
              Suggest unsubscribing from senders you haven't opened any email from in this many days.
              This catches senders you used to read but no longer engage with.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={7}
                max={90}
                step={7}
                value={settings.inactiveDaysThreshold || 14}
                onChange={(e) => updateSetting('inactiveDaysThreshold', parseInt(e.target.value))}
                disabled={isSaving || !settings.enabled}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
              <span className="w-16 text-sm font-medium text-foreground text-right">
                {settings.inactiveDaysThreshold || 14} days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">How smart unsubscribe works</p>
            <p className="text-sm text-muted-foreground mt-1">
              NEMI recommends unsubscribing based on two criteria:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li><strong>Low engagement:</strong> Senders with many emails but very low open rate (you never read them)</li>
              <li><strong>Inactive senders:</strong> Senders you used to read but haven't opened in a while</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Senders you actively read are never recommended for unsubscribe.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
