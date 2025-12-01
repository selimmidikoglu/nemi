import { useEffect, useRef, useState, useCallback } from 'react'
import { useNotifications } from './useNotifications'

interface PushedEmail {
  id: number
  messageId: string
  threadId?: string | null
  subject: string
  from: { email: string; name?: string }
  fromEmail: string
  fromName?: string | null
  to?: string[]
  body?: string
  htmlBody?: string | null
  snippet?: string
  date: string
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  category: string
  importance: string
  isPersonallyRelevant: boolean
  summary?: string | null
  masterImportanceScore?: number | null
  badges?: Array<{ name: string; color: string; icon?: string }>
  companyName?: string | null
  companyLogoUrl?: string | null
  senderProfilePhotoUrl?: string | null
  isAboutMe: boolean
  mentionContext?: string | null
  htmlSnippet?: string | null
  renderAsHtml: boolean
  scores?: Record<string, number> | null
}

interface GmailPushMessage {
  type: 'connected' | 'new_emails' | 'error'
  message?: string
  count?: number
  messageIds?: string[]
  emailAddress?: string
  emails?: PushedEmail[]
}

interface UseGmailPushOptions {
  userId?: string
  enabled?: boolean
  onNewEmails?: (emails: PushedEmail[], messageIds: string[], count: number, emailAddress: string) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: string) => void
}

export type { PushedEmail }

// Play notification sound
const playNotificationSound = () => {
  try {
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

export function useGmailPush(options: UseGmailPushOptions = {}) {
  const {
    userId,
    enabled = true,
    onNewEmails,
    onConnected,
    onDisconnected,
    onError
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [newEmailCount, setNewEmailCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  const isMountedRef = useRef(true)
  const maxReconnectAttempts = 5

  const { showNotification, isEnabled: notificationsEnabled } = useNotifications()

  // Store ALL changing values in refs to avoid dependency issues
  const userIdRef = useRef(userId)
  const enabledRef = useRef(enabled)
  const onNewEmailsRef = useRef(onNewEmails)
  const onConnectedRef = useRef(onConnected)
  const onDisconnectedRef = useRef(onDisconnected)
  const onErrorRef = useRef(onError)
  const notificationsEnabledRef = useRef(notificationsEnabled)
  const showNotificationRef = useRef(showNotification)

  // Update refs when props change (no dependencies - runs every render)
  userIdRef.current = userId
  enabledRef.current = enabled
  onNewEmailsRef.current = onNewEmails
  onConnectedRef.current = onConnected
  onDisconnectedRef.current = onDisconnected
  onErrorRef.current = onError
  notificationsEnabledRef.current = notificationsEnabled
  showNotificationRef.current = showNotification

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }

    isConnectingRef.current = false
    setIsConnected(false)
  }, [])

  const connect = useCallback(() => {
    const currentUserId = userIdRef.current
    const currentEnabled = enabledRef.current

    if (!currentUserId || !currentEnabled) {
      return
    }

    // Don't reconnect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) {
      return
    }

    // Also check CONNECTING state
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    // Check if component is still mounted
    if (!isMountedRef.current) {
      return
    }

    isConnectingRef.current = true

    try {
      const wsUrl = `ws://localhost:3000/ws?userId=${currentUserId}`
      console.log('Connecting to Gmail push WebSocket:', wsUrl)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!isMountedRef.current) return
        console.log('Gmail push WebSocket connected')
        isConnectingRef.current = false
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
        onConnectedRef.current?.()
      }

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return
        try {
          const data: GmailPushMessage = JSON.parse(event.data)
          console.log('Gmail push message received:', data)

          if (data.type === 'connected') {
            console.log('WebSocket connection confirmed')
          } else if (data.type === 'new_emails') {
            const count = data.count || 0
            const messageIds = data.messageIds || []
            const emailAddress = data.emailAddress || 'Unknown'
            const emails = data.emails || []

            console.log(`Received ${count} new email notification(s) for ${emailAddress}`, emails)
            setNewEmailCount(prev => prev + count)

            // Play notification sound
            playNotificationSound()

            // Show browser notification with actual email info if available
            if (notificationsEnabledRef.current && emails.length > 0) {
              const firstEmail = emails[0]
              showNotificationRef.current({
                id: `push-${Date.now()}`,
                subject: firstEmail.subject || `${count} new email${count > 1 ? 's' : ''} arrived`,
                from: firstEmail.fromName || firstEmail.fromEmail || emailAddress,
                preview: firstEmail.summary || firstEmail.snippet || `You have ${count} new email${count > 1 ? 's' : ''} in your inbox`,
                badges: firstEmail.badges?.map(b => b.name) || ['New']
              })
            } else if (notificationsEnabledRef.current) {
              showNotificationRef.current({
                id: `push-${Date.now()}`,
                subject: `${count} new email${count > 1 ? 's' : ''} arrived`,
                from: emailAddress,
                preview: `You have ${count} new email${count > 1 ? 's' : ''} in your inbox`,
                badges: ['New']
              })
            }

            // Callback with full email data for immediate display
            onNewEmailsRef.current?.(emails, messageIds, count, emailAddress)
          } else if (data.type === 'error') {
            console.error('Gmail push error:', data.message)
            onErrorRef.current?.(data.message || 'Unknown error')
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('Gmail push WebSocket disconnected:', event.code, event.reason)
        isConnectingRef.current = false
        if (isMountedRef.current) {
          setIsConnected(false)
        }
        wsRef.current = null
        onDisconnectedRef.current?.()

        // Attempt to reconnect if not intentionally closed (code 1000 = normal closure)
        if (event.code !== 1000 && enabledRef.current && isMountedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          if (isMountedRef.current) {
            setConnectionError('Max reconnection attempts reached')
          }
        }
      }

      ws.onerror = (error) => {
        console.error('Gmail push WebSocket error:', error)
        isConnectingRef.current = false
        if (isMountedRef.current) {
          setConnectionError('WebSocket connection error')
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      isConnectingRef.current = false
      if (isMountedRef.current) {
        setConnectionError('Failed to connect to push notification service')
      }
    }
  }, []) // No dependencies - uses refs

  const resetCount = useCallback(() => {
    setNewEmailCount(0)
  }, [])

  // Connect only once on mount, disconnect on unmount
  useEffect(() => {
    isMountedRef.current = true

    // Connect if conditions are met
    if (enabled && userId) {
      connect()
    }

    return () => {
      isMountedRef.current = false
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run on mount/unmount

  // Handle enabled/userId changes separately
  useEffect(() => {
    if (enabled && userId) {
      // Only connect if not already connected
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        connect()
      }
    } else {
      // Disconnect if conditions are no longer met
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId]) // Only react to actual value changes

  return {
    isConnected,
    connectionError,
    newEmailCount,
    resetCount,
    reconnect: connect,
    disconnect
  }
}
