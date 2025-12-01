/**
 * Desktop notification service for new emails
 */

export interface EmailNotification {
  id: string
  subject: string
  from: string
  preview?: string
  badges?: string[]
}

class NotificationService {
  private permission: NotificationPermission = 'default'
  private enabled: boolean = false

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission
      this.enabled = this.permission === 'granted'
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications')
      alert('Your browser does not support desktop notifications')
      return false
    }

    if (this.permission === 'granted') {
      this.enabled = true
      return true
    }

    if (this.permission === 'denied') {
      console.warn('Notification permission was denied')
      alert('Notification permission was denied. Please enable it in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Allow notifications for this site\n3. Refresh the page')
      return false
    }

    try {
      console.log('Requesting notification permission...')
      const permission = await Notification.requestPermission()
      console.log('Permission result:', permission)

      this.permission = permission
      this.enabled = permission === 'granted'

      // Save preference to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('notifications_enabled', permission === 'granted' ? 'true' : 'false')
      }

      if (permission === 'denied') {
        alert('Notification permission was denied. To enable:\n\n1. Click the lock icon in your address bar\n2. Find Notifications and set to "Allow"\n3. Refresh the page')
      }

      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      alert('Error requesting permission: ' + error)
      return false
    }
  }

  /**
   * Check if notifications are supported and enabled
   */
  isEnabled(): boolean {
    return this.enabled && 'Notification' in window && Notification.permission === 'granted'
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission
  }

  /**
   * Show a notification for a new email
   */
  showEmailNotification(email: EmailNotification): void {
    if (!this.isEnabled()) {
      console.log('Notifications not enabled, skipping...', {
        permission: this.permission,
        enabled: this.enabled,
        supported: 'Notification' in window
      })
      return
    }

    console.log('Showing notification for email:', email.subject)

    try {
      const title = `New Email: ${email.subject || '(No Subject)'}`
      const options: NotificationOptions = {
        body: `From: ${email.from}${email.preview ? '\n\n' + email.preview : ''}`,
        icon: '/favicon.ico', // Use favicon as fallback
        tag: email.id, // Prevents duplicate notifications for same email
        requireInteraction: false,
        silent: false, // Enable sound
        data: {
          emailId: email.id,
          url: `/feed?email=${email.id}`
        }
      }

      // Add badge colors if available
      if (email.badges && email.badges.length > 0) {
        options.body += `\n\nBadges: ${email.badges.join(', ')}`
      }

      const notification = new Notification(title, options)

      console.log('Notification created successfully:', title)

      // Handle notification click - open email in app
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()

        // Navigate to the email
        const emailId = (event.target as Notification).data?.emailId
        if (emailId) {
          window.location.href = `/feed?email=${emailId}`
        }

        notification.close()
      }

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close()
      }, 10000)

    } catch (error) {
      console.error('Error showing notification:', error)
      alert('Failed to show notification. Check console for details.')
    }
  }

  /**
   * Show a test notification
   */
  showTestNotification(): void {
    this.showEmailNotification({
      id: 'test',
      subject: 'Test Notification',
      from: 'NEMI Inbox',
      preview: 'Desktop notifications are working!',
      badges: ['Test']
    })
  }

  /**
   * Disable notifications
   */
  disable(): void {
    this.enabled = false
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications_enabled', 'false')
    }
  }

  /**
   * Check if user has previously enabled notifications
   */
  hasUserPreference(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('notifications_enabled') !== null
  }

  /**
   * Get user's previous preference
   */
  getUserPreference(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('notifications_enabled') === 'true'
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
