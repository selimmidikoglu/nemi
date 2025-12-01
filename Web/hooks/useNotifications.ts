import { useState, useEffect, useCallback } from 'react'
import { notificationService, EmailNotification } from '@/lib/notifications'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    // Initialize state
    setPermission(notificationService.getPermission())
    setIsEnabled(notificationService.isEnabled())
  }, [])

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission()
    setPermission(notificationService.getPermission())
    setIsEnabled(granted)
    return granted
  }, [])

  const showNotification = useCallback((email: EmailNotification) => {
    notificationService.showEmailNotification(email)
  }, [])

  const showTestNotification = useCallback(() => {
    notificationService.showTestNotification()
  }, [])

  const disable = useCallback(() => {
    notificationService.disable()
    setIsEnabled(false)
  }, [])

  return {
    permission,
    isEnabled,
    requestPermission,
    showNotification,
    showTestNotification,
    disable
  }
}
