'use client'

import { useEffect, useState } from 'react'
import { apiService } from '@/lib/api'

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  usage_count: number
}

interface BadgesListProps {
  onBadgeClick?: (badge: Badge) => void
}

export default function BadgesList({ onBadgeClick }: BadgesListProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBadges()
  }, [])

  const fetchBadges = async () => {
    try {
      setIsLoading(true)
      const data = await apiService.getBadgeStats()
      // Sort by usage count and take top 8
      const sortedBadges = (data.badges || [])
        .sort((a: Badge, b: Badge) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 8)
      setBadges(sortedBadges)
    } catch (error) {
      console.error('Failed to fetch badges:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getBadgeColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
      green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
      yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
      red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
      purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
      pink: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-200 dark:border-pink-800',
      indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
      gray: 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-800',
      orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
      teal: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
    }
    return colors[color.toLowerCase()] || colors.gray
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (badges.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Top Badges
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {badges.map((badge) => (
          <button
            key={badge.id}
            onClick={() => onBadgeClick?.(badge)}
            className={`${getBadgeColorClass(
              badge.color
            )} rounded-lg p-3 text-left transition-all hover:scale-105 hover:shadow-md`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{badge.icon}</span>
              <span className="text-xs font-bold">{badge.usage_count || 0}</span>
            </div>
            <p className="text-xs font-medium truncate">{badge.name}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
