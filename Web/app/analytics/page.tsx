'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { apiService } from '@/lib/api'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, subDays, getDay } from 'date-fns'
import Image from 'next/image'

interface BadgeStats {
  name: string
  color: string
  totalEmails: number
  timeSpent: number
  openRate: number
  engagementScore: number
  category?: string
  logoUrl?: string
}

interface HeatmapData {
  date: string
  day: number
  week: number
  count: number
}

// Map company names to domains for logo fetching
const DOMAIN_MAP: Record<string, string> = {
  'GitHub': 'github.com',
  'LinkedIn': 'linkedin.com',
  'Google': 'google.com',
  'Couchsurfing': 'couchsurfing.com',
  'Logo.dev': 'logo.dev',
  'Uxpilot': 'uxpilot.ai',
  'Asana': 'asana.com',
  'Slack': 'slack.com',
  'Notion': 'notion.so',
  'Figma': 'figma.com',
  'Stripe': 'stripe.com',
  'Vercel': 'vercel.com',
}

// Get company logo URL using both Clearbit and Logo.dev as fallback
function getCompanyLogoUrl(badgeName: string, category?: string): string | null {
  if (category !== 'Company') return null

  const domain = DOMAIN_MAP[badgeName] || `${badgeName.toLowerCase().replace(/\s+/g, '')}.com`
  // Primary: Clearbit, Fallback: Logo.dev
  return `https://logo.clearbit.com/${domain}`
}

// System/category badges that should be excluded from pie charts
const SYSTEM_BADGE_NAMES = ['Automated', 'Promotional', 'Newsletter', 'Marketing', 'Spam', 'Shopping', 'Other', 'Confirmation', 'Financial', 'Personal', 'Work', 'Social']

// Bright colors for pie charts that are visible on dark backgrounds
const PIE_CHART_COLORS = [
  '#22d3ee', // cyan
  '#a78bfa', // violet
  '#f472b6', // pink
  '#34d399', // emerald
  '#fbbf24', // amber
  '#fb7185', // rose
  '#60a5fa', // blue
  '#4ade80', // green
  '#f97316', // orange
  '#e879f9', // fuchsia
  '#2dd4bf', // teal
  '#facc15', // yellow
]

// Process badges to group small ones into "Other" (excludes system badges)
function groupSmallBadges(badges: BadgeStats[], threshold: number = 0.02): BadgeStats[] {
  // Filter out system badges first - we only want personal/company badges in pie charts
  const personalBadges = badges.filter(b => !SYSTEM_BADGE_NAMES.includes(b.name))

  const totalEmails = personalBadges.reduce((sum, b) => sum + b.totalEmails, 0)
  if (totalEmails === 0) return personalBadges

  const significantBadges: BadgeStats[] = []
  let otherEmails = 0
  let otherTimeSpent = 0
  let otherCount = 0

  personalBadges.forEach(badge => {
    const percentage = badge.totalEmails / totalEmails
    if (percentage >= threshold) {
      significantBadges.push(badge)
    } else {
      otherEmails += badge.totalEmails
      otherTimeSpent += badge.timeSpent
      otherCount++
    }
  })

  // Add "Other" category if there are grouped badges
  if (otherCount > 0) {
    significantBadges.push({
      name: `Other (${otherCount} badges)`,
      color: '#9ca3af',
      totalEmails: otherEmails,
      timeSpent: otherTimeSpent,
      openRate: 0,
      engagementScore: 0,
    })
  }

  return significantBadges.sort((a, b) => b.totalEmails - a.totalEmails)
}

export default function AnalyticsOverviewPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()
  const [badgeStats, setBadgeStats] = useState<BadgeStats[]>([])
  const [groupedBadgeStats, setGroupedBadgeStats] = useState<BadgeStats[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    } else if (isAuthenticated) {
      loadAnalytics()
    }
  }, [isAuthenticated, authLoading, router])

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      // Fetch analytics overview using the API service
      const data = await apiService.getAnalyticsOverview()

      // Process badges with company logos
      const processedBadges: BadgeStats[] = (data.badges || []).map((badge: any) => ({
        ...badge,
        logoUrl: getCompanyLogoUrl(badge.name, badge.category),
      }))

      setBadgeStats(processedBadges)
      // Group small badges (<2%) into "Other" for pie charts
      setGroupedBadgeStats(groupSmallBadges(processedBadges, 0.02))

      // Process heatmap data - use real data from API or generate empty grid
      if (data.heatmap && data.heatmap.length > 0) {
        setHeatmapData(data.heatmap)
      } else {
        // Generate empty heatmap grid for last 12 weeks
        const emptyHeatmap: HeatmapData[] = []
        for (let i = 83; i >= 0; i--) {
          const date = subDays(new Date(), i)
          emptyHeatmap.push({
            date: format(date, 'yyyy-MM-dd'),
            day: getDay(date),
            week: Math.floor(i / 7),
            count: 0,
          })
        }
        setHeatmapData(emptyHeatmap)
      }

      setHasData(processedBadges.length > 0)
    } catch (error) {
      console.error('Failed to load analytics:', error)
      // On error, show empty state instead of mock data
      setBadgeStats([])
      setGroupedBadgeStats([])
      setHasData(false)

      // Generate empty heatmap
      const emptyHeatmap: HeatmapData[] = []
      for (let i = 83; i >= 0; i--) {
        const date = subDays(new Date(), i)
        emptyHeatmap.push({
          date: format(date, 'yyyy-MM-dd'),
          day: getDay(date),
          week: Math.floor(i / 7),
          count: 0,
        })
      }
      setHeatmapData(emptyHeatmap)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const totalTimeSpent = badgeStats.reduce((sum, badge) => sum + badge.timeSpent, 0)
  const totalEmails = badgeStats.reduce((sum, badge) => sum + badge.totalEmails, 0)
  const avgOpenRate = badgeStats.length > 0
    ? badgeStats.reduce((sum, badge) => sum + badge.openRate, 0) / badgeStats.length
    : 0

  if (authLoading || isLoading) {
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
            <h1 className="text-2xl font-bold text-foreground">Analytics Overview</h1>
          </div>

          <button
            onClick={() => router.push('/settings?tab=badges')}
            className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            Manage Badges
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Total Emails"
            value={totalEmails}
            icon="📧"
            color="#6366f1"
          />
          <MetricCard
            title="Total Time Spent"
            value={formatTime(totalTimeSpent)}
            subtitle="Across all badges"
            icon="⏱️"
            color="#f59e0b"
          />
          <MetricCard
            title="Avg Open Rate"
            value={`${Math.round(avgOpenRate * 100)}%`}
            subtitle="All badges combined"
            icon="👁️"
            color="#10b981"
          />
          <MetricCard
            title="Active Badges"
            value={badgeStats.length}
            subtitle="With emails"
            icon="🏷️"
            color="#8b5cf6"
          />
        </div>

        {/* Time Allocation */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Time Allocation</h2>
            {groupedBadgeStats.length > 0 && totalTimeSpent > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={groupedBadgeStats.map(badge => ({
                      name: badge.name,
                      value: badge.timeSpent,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => value > 0 ? `${name}: ${formatTime(value)}` : ''}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    fontSize={10}
                  >
                    {groupedBadgeStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatTime(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg">No time data yet</p>
                  <p className="text-sm mt-2">Start reading emails to track time spent</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Email Distribution</h2>
            {groupedBadgeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={groupedBadgeStats.map(badge => ({
                      name: badge.name,
                      value: badge.totalEmails,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    fontSize={10}
                  >
                    {groupedBadgeStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg">No email data yet</p>
                  <p className="text-sm mt-2">Sync your emails to see distribution</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Badge Comparison */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Badge Comparison</h2>
          {badgeStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={badgeStats.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'Open Rate (%)') return `${Math.round(value * 100)}%`
                    if (name === 'Time Spent') return formatTime(value)
                    return value
                  }}
                />
                <Legend />
                <Bar dataKey="totalEmails" fill="#6366f1" name="Total Emails" />
                <Bar
                  dataKey="openRate"
                  fill="#10b981"
                  name="Open Rate (%)"
                />
                <Bar dataKey="timeSpent" fill="#f59e0b" name="Time Spent" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg">No badge data yet</p>
                <p className="text-sm mt-2">Your badges will appear here once you have emails</p>
              </div>
            </div>
          )}
        </div>

        {/* Heatmap Calendar */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Activity Heatmap (Last 12 Weeks)</h2>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-1">
              <div className="flex gap-1 mb-2 text-xs text-muted-foreground">
                <div className="w-8"></div>
                {['Mon', 'Wed', 'Fri'].map((day, i) => (
                  <div key={day} className="text-center" style={{ marginLeft: i * 24 * 2 }}>{day}</div>
                ))}
              </div>
              {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => (
                <div key={dayOfWeek} className="flex gap-1">
                  <div className="w-8 text-xs text-muted-foreground flex items-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}
                  </div>
                  {Array.from({ length: 12 }).map((_, week) => {
                    const dayData = heatmapData.find(d => d.day === dayOfWeek && d.week === week)
                    const intensity = dayData ? Math.min(dayData.count / 20, 1) : 0
                    const color = intensity === 0
                      ? 'hsl(var(--muted))'
                      : `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`

                    return (
                      <div
                        key={`${dayOfWeek}-${week}`}
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: color }}
                        title={dayData ? `${dayData.date}: ${dayData.count} emails` : 'No data'}
                      />
                    )
                  })}
                </div>
              ))}
              <div className="flex gap-2 mt-4 text-xs text-muted-foreground items-center">
                <span>Less</span>
                <div className="flex gap-1">
                  {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                    <div
                      key={intensity}
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: intensity === 0
                          ? 'hsl(var(--muted))'
                          : `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`
                      }}
                    />
                  ))}
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badge Cards */}
        {badgeStats.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {badgeStats.map((badge) => (
              <div
                key={badge.name}
                className="bg-card border border-border rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/analytics/badges/${encodeURIComponent(badge.name)}`)}
              >
                <div className="flex items-center gap-3 mb-4">
                  {badge.logoUrl ? (
                    <div className="w-8 h-8 relative flex-shrink-0">
                      <Image
                        src={badge.logoUrl}
                        alt={badge.name}
                        width={32}
                        height={32}
                        className="rounded object-contain bg-white"
                        unoptimized
                        onError={(e) => {
                          // Fallback to Logo.dev if Clearbit fails
                          const img = e.target as HTMLImageElement
                          const domain = DOMAIN_MAP[badge.name] || `${badge.name.toLowerCase().replace(/\s+/g, '')}.com`
                          if (!img.src.includes('logo.dev')) {
                            img.src = `https://img.logo.dev/${domain}?token=pk_a6aQpQifQhWNKxCBmTMxPQ`
                          } else {
                            // Both failed, hide the image
                            img.style.display = 'none'
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: badge.color }}
                    />
                  )}
                  <h3 className="text-lg font-semibold text-foreground truncate">{badge.name}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Emails:</span>
                    <span className="font-medium text-foreground">{badge.totalEmails}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium text-foreground">{formatTime(badge.timeSpent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Open Rate:</span>
                    <span className="font-medium text-foreground">{Math.round(badge.openRate * 100)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-3">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(badge.engagementScore * 100, 100)}%`,
                        backgroundColor: badge.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Engagement Score: {Math.round(badge.engagementScore * 100)}/100
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">No badges to display</p>
              <p className="text-sm mt-2">
                Once you start reading emails, your most engaged badges will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  color: string
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-foreground" style={{ color }}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}
