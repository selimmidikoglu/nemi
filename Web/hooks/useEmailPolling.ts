import { useEffect, useRef, useState, useCallback } from 'react'
import { useNotifications } from './useNotifications'

interface Email {
  id: string
  subject: string
  from: string
  preview: string
  badges: string[]
  date: string
  receivedAt: string
}

interface UseEmailPollingOptions {
  enabled?: boolean
  interval?: number // milliseconds
  onNewEmails?: (emails: Email[]) => void
}

// Play notification sound
const playNotificationSound = () => {
  try {
    // Create a simple notification beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 880 // A5 note
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.log('Could not play notification sound:', error)
  }
}

export function useEmailPolling(options: UseEmailPollingOptions = {}) {
  const {
    enabled = true,
    interval = 30000, // 30 seconds default
    onNewEmails
  } = options

  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [newEmailCount, setNewEmailCount] = useState(0)
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { showNotification, isEnabled: notificationsEnabled } = useNotifications()

  const checkForNewEmails = useCallback(async () => {
    if (!enabled || isPolling) return

    setIsPolling(true)

    try {
      const accessToken = localStorage.getItem('accessToken')
      if (!accessToken) {
        console.log('No access token, skipping email check')
        return
      }

      // Build query params
      const params = new URLSearchParams({
        limit: '10',
        offset: '0',
        sort_by: 'date',
        sort_order: 'desc'
      })

      // If we have a last checked time, only get emails after that
      if (lastChecked) {
        params.append('after', lastChecked.toISOString())
      }

      const response = await fetch(`http://localhost:3000/api/emails?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        console.error('Failed to check for new emails:', response.status)
        return
      }

      const data = await response.json()
      const emails = data.emails || []

      // Filter for truly new emails (received after last check)
      const newEmails = lastChecked
        ? emails.filter((email: Email) => new Date(email.receivedAt) > lastChecked)
        : []

      if (newEmails.length > 0) {
        console.log(`Found ${newEmails.length} new email(s)`)
        setNewEmailCount(prev => prev + newEmails.length)

        // Play notification sound
        playNotificationSound()

        // Show notifications for new emails
        if (notificationsEnabled) {
          newEmails.forEach((email: Email) => {
            showNotification({
              id: email.id,
              subject: email.subject,
              from: email.from,
              preview: email.preview,
              badges: email.badges
            })
          })
        }

        // Callback
        if (onNewEmails) {
          onNewEmails(newEmails)
        }
      }

      setLastChecked(new Date())
    } catch (error) {
      console.error('Error checking for new emails:', error)
    } finally {
      setIsPolling(false)
    }
  }, [enabled, isPolling, lastChecked, notificationsEnabled, showNotification, onNewEmails])

  const resetCount = useCallback(() => {
    setNewEmailCount(0)
  }, [])

  const forceCheck = useCallback(async () => {
    await checkForNewEmails()
  }, [checkForNewEmails])

  // Set up polling interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial check
    if (!lastChecked) {
      setLastChecked(new Date())
    }

    // Set up interval
    intervalRef.current = setInterval(checkForNewEmails, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval, checkForNewEmails, lastChecked])

  return {
    newEmailCount,
    isPolling,
    lastChecked,
    resetCount,
    forceCheck
  }
}
