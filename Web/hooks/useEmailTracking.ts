'use client'

import { useRef, useCallback, useEffect } from 'react'
import { apiService } from '@/lib/api'

// Minimum time (in seconds) before a view session is considered valid
const MIN_VIEW_DURATION_SECONDS = 3

interface ViewSession {
  sessionId: string
  emailId: string
  openedAt: Date
  linkClicksCount: number
}

interface TrackingSettings {
  enabled: boolean
}

// Generate a unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// Get tracking settings from localStorage
function getTrackingSettings(): TrackingSettings {
  if (typeof window === 'undefined') return { enabled: true }

  try {
    const settings = localStorage.getItem('trackingSettings')
    if (settings) {
      return JSON.parse(settings)
    }
  } catch (error) {
    console.error('Failed to parse tracking settings:', error)
  }

  // Default: tracking enabled
  return { enabled: true }
}

/**
 * Hook to track email viewing sessions and engagement events.
 *
 * Features:
 * - Tracks when emails are opened and closed
 * - Records time spent reading emails (minimum 3 seconds threshold)
 * - Counts link clicks within emails
 * - Respects user privacy settings
 *
 * @param emailId - The ID of the currently viewed email (null if none selected)
 * @returns Object with trackLinkClick function to record link clicks
 */
export function useEmailTracking(emailId: string | null) {
  const sessionRef = useRef<ViewSession | null>(null)
  const isEndingSession = useRef(false)

  // End the current session and save to backend
  const endSession = useCallback(async () => {
    const settings = getTrackingSettings()
    if (!settings.enabled) return

    if (!sessionRef.current || isEndingSession.current) return

    isEndingSession.current = true
    const session = sessionRef.current
    const closedAt = new Date()
    const durationSeconds = Math.floor((closedAt.getTime() - session.openedAt.getTime()) / 1000)

    // Only save sessions that meet the minimum duration threshold
    if (durationSeconds >= MIN_VIEW_DURATION_SECONDS) {
      try {
        await apiService.saveViewSession({
          session_id: session.sessionId,
          email_id: session.emailId,
          opened_at: session.openedAt.toISOString(),
          closed_at: closedAt.toISOString(),
          duration_seconds: durationSeconds,
          link_clicks_count: session.linkClicksCount,
        })

        // Also record the closed event
        await apiService.recordEngagementEvent({
          event_type: 'closed',
          email_id: session.emailId,
          event_data: {
            session_id: session.sessionId,
            duration_seconds: durationSeconds,
            link_clicks_count: session.linkClicksCount,
          }
        })
      } catch (error) {
        console.error('Failed to save view session:', error)
      }
    }

    sessionRef.current = null
    isEndingSession.current = false
  }, [])

  // Start a new session when email changes
  const startSession = useCallback(async (newEmailId: string) => {
    const settings = getTrackingSettings()
    if (!settings.enabled) return

    const session: ViewSession = {
      sessionId: generateSessionId(),
      emailId: newEmailId,
      openedAt: new Date(),
      linkClicksCount: 0,
    }

    sessionRef.current = session

    // Record the opened event
    try {
      await apiService.recordEngagementEvent({
        event_type: 'opened',
        email_id: newEmailId,
        event_data: {
          session_id: session.sessionId,
        }
      })
    } catch (error) {
      console.error('Failed to record open event:', error)
    }
  }, [])

  // Track link clicks within the current email
  const trackLinkClick = useCallback(async (url?: string) => {
    const settings = getTrackingSettings()
    if (!settings.enabled) return

    if (sessionRef.current) {
      sessionRef.current.linkClicksCount++

      // Record the link click event
      try {
        await apiService.recordEngagementEvent({
          event_type: 'link_clicked',
          email_id: sessionRef.current.emailId,
          event_data: {
            session_id: sessionRef.current.sessionId,
            url: url,
            click_number: sessionRef.current.linkClicksCount,
          }
        })
      } catch (error) {
        console.error('Failed to record link click:', error)
      }
    }
  }, [])

  // Handle email ID changes
  useEffect(() => {
    const handleEmailChange = async () => {
      // End previous session if exists
      if (sessionRef.current) {
        await endSession()
      }

      // Start new session if email is selected
      if (emailId) {
        await startSession(emailId)
      }
    }

    handleEmailChange()

    // Cleanup on unmount or email change
    return () => {
      if (sessionRef.current) {
        // Don't await here, just fire and forget on cleanup
        endSession()
      }
    }
  }, [emailId, endSession, startSession])

  // Handle page unload (user closes tab/window)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionRef.current) {
        const settings = getTrackingSettings()
        if (!settings.enabled) return

        const session = sessionRef.current
        const closedAt = new Date()
        const durationSeconds = Math.floor((closedAt.getTime() - session.openedAt.getTime()) / 1000)

        // Only save if meets minimum threshold
        if (durationSeconds >= MIN_VIEW_DURATION_SECONDS) {
          // Use sendBeacon for reliable delivery on page unload
          const payload = JSON.stringify({
            session_id: session.sessionId,
            email_id: session.emailId,
            opened_at: session.openedAt.toISOString(),
            closed_at: closedAt.toISOString(),
            duration_seconds: durationSeconds,
            link_clicks_count: session.linkClicksCount,
          })

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
          const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')

          // Use sendBeacon with a Blob to include headers
          const blob = new Blob([payload], { type: 'application/json' })
          navigator.sendBeacon(`${apiUrl}/api/analytics/view-sessions?token=${token}`, blob)
        }
      }
    }

    // Handle visibility change (tab becomes hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && sessionRef.current) {
        // Tab is hidden, save the session but don't end it
        // The session will continue when the tab becomes visible again
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return {
    trackLinkClick,
    isTracking: sessionRef.current !== null,
  }
}

// Export utility function to update tracking settings
export function setTrackingEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return

  const settings: TrackingSettings = { enabled }
  localStorage.setItem('trackingSettings', JSON.stringify(settings))
}

// Export utility function to check if tracking is enabled
export function isTrackingEnabled(): boolean {
  return getTrackingSettings().enabled
}
