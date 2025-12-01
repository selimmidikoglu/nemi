'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface BadgeAnalytics {
  badgeName: string
  badgeColor: string
  category: string
  totalEmails: number
  emailsOpened: number
  emailsWithClicks: number
  totalTimeSpentSeconds: number
  avgTimeSpentSeconds: number
  totalLinkClicks: number
  openRate: number
  clickRate: number
  engagementScore: number
  lastInteractionAt: string | null
}

interface TimelineData {
  date: string
  emails: number
  opened: number
  timeSpent: number
}

type DateRange = '7d' | '30d' | '90d' | 'all'

export default function BadgeAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const badgeName = decodeURIComponent(params.badgeName as string)
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()

  const [analytics, setAnalytics] = useState<BadgeAnalytics | null>(null)
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    } else if (isAuthenticated) {
      loadAnalytics()
    }
  }, [isAuthenticated, authLoading, router, badgeName, dateRange])

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      // Fetch badge engagement metrics
      const response = await fetch(`http://localhost:3000/api/badges/${encodeURIComponent(badgeName)}/analytics?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()

      // Transform data
      const analyticsData: BadgeAnalytics = {
        badgeName: data.badge_name || badgeName,
        badgeColor: data.badge_color || '#6366f1',
        category: data.category || 'Other',
        totalEmails: data.total_emails_with_badge || 0,
        emailsOpened: data.emails_opened || 0,
        emailsWithClicks: data.emails_with_clicks || 0,
        totalTimeSpentSeconds: data.total_time_spent_seconds || 0,
        avgTimeSpentSeconds: data.avg_time_spent_seconds || 0,
        totalLinkClicks: data.total_link_clicks || 0,
        openRate: data.open_rate || 0,
        clickRate: data.click_rate || 0,
        engagementScore: data.engagement_score || 0,
        lastInteractionAt: data.last_interaction_at,
      }

      setAnalytics(analyticsData)

      // Generate mock timeline data (replace with actual API data later)
      const mockTimeline = generateMockTimeline(dateRange)
      setTimeline(mockTimeline)
    } catch (error) {
      console.error('Failed to load analytics:', error)
      // Set mock data for development
      setAnalytics({
        badgeName,
        badgeColor: '#6366f1',
        category: 'Company',
        totalEmails: 45,
        emailsOpened: 38,
        emailsWithClicks: 25,
        totalTimeSpentSeconds: 2700, // 45 minutes
        avgTimeSpentSeconds: 71, // ~1 minute per email
        totalLinkClicks: 42,
        openRate: 0.84,
        clickRate: 0.66,
        engagementScore: 0.75,
        lastInteractionAt: new Date().toISOString(),
      })
      setTimeline(generateMockTimeline(dateRange))
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockTimeline = (range: DateRange): TimelineData[] => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
    const data: TimelineData[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      data.push({
        date: format(date, 'MMM dd'),
        emails: Math.floor(Math.random() * 10) + 1,
        opened: Math.floor(Math.random() * 8) + 1,
        timeSpent: Math.floor(Math.random() * 600) + 60, // seconds
      })
    }

    return data
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Badge not found</p>
          <button
            onClick={() => router.push('/settings?tab=badges')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Back to Badges
          </button>
        </div>
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
              onClick={() => router.push('/settings?tab=badges')}
              className="text-foreground hover:text-foreground/80"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: analytics.badgeColor }}
              />
              <h1 className="text-2xl font-bold text-foreground">{analytics.badgeName} Analytics</h1>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                {analytics.category}
              </span>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d', 'all'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  dateRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Total Emails"
            value={analytics.totalEmails}
            icon="📧"
            color={analytics.badgeColor}
          />
          <MetricCard
            title="Open Rate"
            value={`${Math.round(analytics.openRate * 100)}%`}
            subtitle={`${analytics.emailsOpened} opened`}
            icon="👁️"
            color="#10b981"
          />
          <MetricCard
            title="Total Time Spent"
            value={formatTime(analytics.totalTimeSpentSeconds)}
            subtitle={`Avg: ${formatTime(Math.round(analytics.avgTimeSpentSeconds))}`}
            icon="⏱️"
            color="#f59e0b"
          />
          <MetricCard
            title="Engagement Score"
            value={`${Math.round(analytics.engagementScore * 100)}/100`}
            subtitle={`${analytics.totalLinkClicks} clicks`}
            icon="🎯"
            color="#8b5cf6"
          />
        </div>

        {/* Email Volume Timeline */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Email Volume & Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="emails"
                stroke={analytics.badgeColor}
                strokeWidth={2}
                name="Emails Received"
              />
              <Line
                type="monotone"
                dataKey="opened"
                stroke="#10b981"
                strokeWidth={2}
                name="Emails Opened"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Time Spent Chart */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Time Spent Per Day</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `${Math.floor(value / 60)}m`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: any) => formatTime(value)}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="timeSpent" fill="#f59e0b" name="Time Spent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Email Status</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Opened', value: analytics.emailsOpened },
                    { name: 'Unopened', value: analytics.totalEmails - analytics.emailsOpened },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Click Activity</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'With Clicks', value: analytics.emailsWithClicks },
                    { name: 'No Clicks', value: analytics.emailsOpened - analytics.emailsWithClicks },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#8b5cf6" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">💡 Insights</h2>
          <div className="space-y-3">
            {analytics.openRate > 0.8 && (
              <InsightItem
                icon="🔥"
                text={`High engagement! You open ${Math.round(analytics.openRate * 100)}% of ${analytics.badgeName} emails.`}
                type="positive"
              />
            )}
            {analytics.avgTimeSpentSeconds > 120 && (
              <InsightItem
                icon="⏰"
                text={`You spend an average of ${formatTime(Math.round(analytics.avgTimeSpentSeconds))} on each email.`}
                type="neutral"
              />
            )}
            {analytics.clickRate > 0.5 && (
              <InsightItem
                icon="👆"
                text={`You're actively engaging - ${Math.round(analytics.clickRate * 100)}% of opened emails have clicks.`}
                type="positive"
              />
            )}
            {analytics.openRate < 0.3 && (
              <InsightItem
                icon="💤"
                text={`Low open rate (${Math.round(analytics.openRate * 100)}%). Consider unsubscribing or creating filters.`}
                type="warning"
              />
            )}
          </div>
        </div>
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

function InsightItem({
  icon,
  text,
  type,
}: {
  icon: string
  text: string
  type: 'positive' | 'neutral' | 'warning'
}) {
  const colors = {
    positive: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300',
    neutral: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
    warning: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-300',
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${colors[type]}`}>
      <span className="text-xl">{icon}</span>
      <p className="text-sm">{text}</p>
    </div>
  )
}
