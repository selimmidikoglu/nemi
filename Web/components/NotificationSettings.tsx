'use client'

import { useState, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationSettings() {
  const { permission, isEnabled, requestPermission, showTestNotification, disable } = useNotifications()
  const [pollingInterval, setPollingInterval] = useState(30)
  const [testStatus, setTestStatus] = useState<string | null>(null)

  useEffect(() => {
    // Load polling interval from localStorage
    const saved = localStorage.getItem('email_polling_interval')
    if (saved) {
      setPollingInterval(parseInt(saved))
    }
  }, [])

  const handleEnableNotifications = async () => {
    const granted = await requestPermission()
    if (granted) {
      showTestNotification()
      setTestStatus('Test notification sent! Check your desktop.')
      setTimeout(() => setTestStatus(null), 3000)
    }
  }

  const handleDisableNotifications = () => {
    disable()
  }

  const handleTest = () => {
    showTestNotification()
    setTestStatus('Test notification sent! Check your desktop.')
    setTimeout(() => setTestStatus(null), 3000)
  }

  const handlePollingIntervalChange = (value: number) => {
    setPollingInterval(value)
    localStorage.setItem('email_polling_interval', value.toString())
    // Force page reload to apply new interval
    window.location.reload()
  }

  const getStatusColor = () => {
    switch (permission) {
      case 'granted':
        return 'text-green-600 dark:text-green-400'
      case 'denied':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-yellow-600 dark:text-yellow-400'
    }
  }

  const getStatusText = () => {
    switch (permission) {
      case 'granted':
        return 'Enabled'
      case 'denied':
        return 'Denied (check browser settings)'
      default:
        return 'Not enabled'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Desktop Notifications</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get notified when new emails arrive, even when NEMI is in the background.
        </p>
      </div>

      {/* Status */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Notification Status</p>
            <p className={`text-sm mt-1 ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {permission === 'granted' ? (
                <>
                  <button
                    onClick={handleTest}
                    className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    Test
                  </button>
                  <button
                    onClick={handleDisableNotifications}
                    className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    Disable
                  </button>
                </>
              ) : permission === 'denied' ? (
                <p className="text-xs text-muted-foreground">
                  Please enable notifications in your browser settings
                </p>
              ) : (
                <button
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                >
                  Enable Notifications
                </button>
              )}
            </div>
            {testStatus && (
              <p className="text-xs text-green-600 dark:text-green-400 animate-pulse">
                {testStatus}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Polling Interval */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Check for new emails every</p>
            <p className="text-xs text-muted-foreground mt-1">
              How often NEMI should check for new emails in the background
            </p>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={pollingInterval}
              onChange={(e) => handlePollingIntervalChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-sm font-medium text-foreground w-24 text-right">
              {pollingInterval < 60
                ? `${pollingInterval}s`
                : `${Math.floor(pollingInterval / 60)}m`}
            </span>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>More frequent (10s)</span>
            <span>Less frequent (5m)</span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="space-y-2 text-sm">
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              How desktop notifications work:
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
              <li>NEMI checks for new emails in the background while the app is open</li>
              <li>You&apos;ll see a desktop notification when new emails arrive</li>
              <li>Click the notification to open the email directly</li>
              <li>Notifications work even when NEMI is minimized</li>
            </ul>
          </div>
        </div>
      </div>

      {/* macOS Troubleshooting */}
      {permission === 'denied' && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="space-y-2 text-sm">
              <p className="text-orange-700 dark:text-orange-300 font-medium">
                Notifications Blocked - How to Enable on macOS:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-orange-600 dark:text-orange-400 ml-2">
                <li>Click the <strong>lock icon</strong> in your browser&apos;s address bar</li>
                <li>Find &quot;Notifications&quot; and change it to <strong>&quot;Allow&quot;</strong></li>
                <li>Refresh the page</li>
                <li>Click &quot;Enable Notifications&quot; again</li>
              </ol>
              <p className="text-orange-700 dark:text-orange-300 font-medium mt-3">
                Also check System Settings:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-orange-600 dark:text-orange-400 ml-2">
                <li>Open System Settings → Notifications</li>
                <li>Find your browser (Chrome/Safari/Firefox)</li>
                <li>Make sure &quot;Allow Notifications&quot; is enabled</li>
                <li>Check &quot;Do Not Disturb&quot; is off</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
