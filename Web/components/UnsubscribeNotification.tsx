'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, MailX, ChevronRight } from 'lucide-react'
import { apiService } from '@/lib/api'
import UnsubscribeModal from './UnsubscribeModal'

interface Notification {
  id: string
  type: 'unsubscribe' | 'other'
  title: string
  description: string
  count?: number
  icon: React.ReactNode
}

interface UnsubscribeNotificationProps {
  className?: string
}

export default function UnsubscribeNotification({ className = '' }: UnsubscribeNotificationProps) {
  const [unsubscribeCount, setUnsubscribeCount] = useState(0)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Build notifications list
  const notifications: Notification[] = []

  if (unsubscribeCount > 0) {
    notifications.push({
      id: 'unsubscribe',
      type: 'unsubscribe',
      title: 'Unsubscribe Recommendations',
      description: `${unsubscribeCount} sender${unsubscribeCount !== 1 ? 's' : ''} you rarely read`,
      count: unsubscribeCount,
      icon: <MailX className="w-4 h-4 text-red-500" />
    })
  }

  // Future: Add more notification types here
  // if (otherCount > 0) {
  //   notifications.push({ ... })
  // }

  const totalNotifications = notifications.length

  const fetchNotifications = useCallback(async () => {
    try {
      const recommendationCount = await apiService.getUnsubscribeRecommendationCount()
      setUnsubscribeCount(recommendationCount)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleNotificationClick = (notification: Notification) => {
    setIsDropdownOpen(false)
    if (notification.type === 'unsubscribe') {
      setIsModalOpen(true)
    }
  }

  const handleUnsubscribeComplete = () => {
    fetchNotifications()
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    fetchNotifications()
  }

  // Don't show if loading or no notifications
  if (isLoading || totalNotifications === 0) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`relative p-2.5 rounded-full hover:bg-accent transition-colors group ${className}`}
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-foreground group-hover:text-primary transition-colors animate-bell" />

        {/* Badge */}
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
          {totalNotifications}
        </span>
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  {notification.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {notification.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {notification.description}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>

          {/* Footer */}
          {notifications.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No new notifications
            </div>
          )}
        </div>
      )}

      {/* Unsubscribe Modal */}
      <UnsubscribeModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onUnsubscribeComplete={handleUnsubscribeComplete}
      />

      {/* Bell animation CSS */}
      <style jsx global>{`
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(12deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(8deg); }
          40% { transform: rotate(-6deg); }
          50% { transform: rotate(4deg); }
          60% { transform: rotate(-2deg); }
          70%, 100% { transform: rotate(0deg); }
        }

        .animate-bell {
          animation: bell-ring 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>
    </div>
  )
}
