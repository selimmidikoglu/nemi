'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'
import type { Email, EmailBadge } from '@/types'
import { apiService } from '@/lib/api'

// Helper to determine if a color is too dark for dark mode backgrounds
function getContrastAdjustedColor(hexColor: string, isDark: boolean): string {
  if (!isDark || !hexColor) return hexColor

  // Convert hex to RGB
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // If the color is too dark (luminance < 0.5), lighten it for dark mode
  if (luminance < 0.5) {
    // Lighten the color by blending with white
    const factor = 0.6 // How much to lighten (0-1)
    const newR = Math.round(r + (255 - r) * factor)
    const newG = Math.round(g + (255 - g) * factor)
    const newB = Math.round(b + (255 - b) * factor)
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  }

  return hexColor
}

interface EmailFiltersProps {
  emails: Email[]
  activeBadge: string | null
  onBadgeChange: (badgeName: string | null) => void
  totalEmailCount: number
}

interface BadgeStats {
  name: string
  color: string
  icon: string
  category: string
  count: number
  displayOrder: number
}

export default function EmailFilters({ emails, activeBadge, onBadgeChange, totalEmailCount }: EmailFiltersProps) {
  const [badgeStats, setBadgeStats] = useState<BadgeStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Fetch badge statistics from backend
  useEffect(() => {
    const fetchBadgeStats = async () => {
      try {
        const response = await apiService.getBadgeStats()
        setBadgeStats(response.badges || [])
      } catch (error) {
        console.error('Failed to fetch badge stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBadgeStats()
  }, [])

  // Generic/system badges that belong in sidebar, not filter bar
  const genericBadges = ['Automated', 'Promotional', 'Newsletter', 'Marketing', 'Spam', 'Shopping', 'Other']

  // Show meaningful badges (excluding generic ones)
  // Backend already handles sorting (by display_order if custom, or by count if default)
  const filteredBadges = badgeStats
    .filter(badge => badge.count > 0 && !genericBadges.includes(badge.name))

  return (
    <div
      className={cn(
        "flex items-center gap-4 bg-card px-4 py-3 overflow-x-auto relative",
        "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground"
      )}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(var(--border)) transparent'
      }}
    >
      {/* All badge */}
      <button
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-all hover:opacity-80 flex-shrink-0 relative h-full',
          'text-primary',
        )}
        onClick={() => onBadgeChange(null)}
      >
        <Inbox className="size-3" />
        All
        <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10">
          {totalEmailCount}
        </span>
        {activeBadge === null && (
          <span
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          />
        )}
      </button>

      {/* Dynamic badges from emails */}
      {filteredBadges.map((badge) => {
        const isActive = activeBadge === badge.name;
        const count = badge.count;

        // Try to get company logo from Clearbit if it's a company badge
        const isCompanyBadge = badge.category === 'Company';

        // Map common company names to their actual domains
        const domainMap: Record<string, string> = {
          'GitHub': 'github.com',
          'LinkedIn': 'linkedin.com',
          'Couchsurfing': 'couchsurfing.com',
          'Google': 'google.com',
          'Logo.dev': 'logo.dev',
          'Uxpilot': 'uxpilot.com',
        };

        const companyDomain = isCompanyBadge
          ? (domainMap[badge.name] || badge.name.toLowerCase().replace(/\s+/g, '') + '.com')
          : null;
        const logoUrl = companyDomain ? `https://logo.clearbit.com/${companyDomain}` : null;

        // Adjust badge color for dark mode visibility
        const displayColor = getContrastAdjustedColor(badge.color, isDark)

        return (
          <button
            key={badge.name}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-all hover:opacity-80 flex-shrink-0 relative h-full',
            )}
            style={{
              color: displayColor,
            }}
            onClick={() => onBadgeChange(badge.name)}
          >
            {logoUrl && (
              <img
                src={logoUrl}
                alt={badge.name}
                className="size-3 rounded-sm object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {badge.name}
            {count > 0 && (
              <span
                className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: `${displayColor}20` }}
              >
                {count}
              </span>
            )}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: displayColor }}
              />
            )}
          </button>
        );
      })}

    </div>
  )
}
