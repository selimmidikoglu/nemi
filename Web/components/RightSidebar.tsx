'use client'

import { useState, useEffect } from 'react'
import { Calendar, Target, Bell, Check, X, Clock, AlertCircle, ChevronLeft, ChevronRight, Sparkles, Video, ExternalLink } from 'lucide-react'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, isThisWeek, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, getHours, getMinutes } from 'date-fns'
import type { EmailAction, ActionCounts, CalendarEvent } from '@/types'
import { apiService } from '@/lib/api'

interface RightSidebarProps {
  isOpen: boolean
  onToggle: () => void
  activeTab: 'calendar' | 'your_life' | 'reminders'
  onTabChange: (tab: 'calendar' | 'your_life' | 'reminders') => void
  onEmailClick?: (emailId: string) => void
}

export default function RightSidebar({
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  onEmailClick
}: RightSidebarProps) {
  const [deadlines, setDeadlines] = useState<EmailAction[]>([])
  const [reminders, setReminders] = useState<EmailAction[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [counts, setCounts] = useState<ActionCounts | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [calendarView, setCalendarView] = useState<'month' | 'day'>('day')

  useEffect(() => {
    fetchActions()
    fetchCounts()
    fetchCalendarEvents()
  }, [])

  // Update current time every minute for the time indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchActions = async () => {
    try {
      setIsLoading(true)
      const [deadlinesData, remindersData] = await Promise.all([
        apiService.getDeadlines(90),
        apiService.getReminders()
      ])
      setDeadlines(deadlinesData)
      setReminders(remindersData)
    } catch (error) {
      console.error('Failed to fetch actions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCalendarEvents = async () => {
    try {
      const events = await apiService.getCalendarEvents(30)
      setCalendarEvents(events)
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
    }
  }

  const fetchCounts = async () => {
    try {
      const countsData = await apiService.getActionCounts()
      setCounts(countsData)
    } catch (error) {
      console.error('Failed to fetch counts:', error)
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await apiService.completeAction(id)
      fetchActions()
      fetchCounts()
    } catch (error) {
      console.error('Failed to complete action:', error)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await apiService.dismissAction(id)
      fetchActions()
      fetchCounts()
    } catch (error) {
      console.error('Failed to dismiss action:', error)
    }
  }

  // Handle email click - delegates to parent's onEmailClick prop
  const handleEmailClick = (emailId: string | undefined) => {
    if (emailId && onEmailClick) {
      onEmailClick(emailId)
    }
  }

  const formatDueDate = (dateStr: string | null): { text: string; isOverdue: boolean; isUrgent: boolean } => {
    if (!dateStr) return { text: 'No date', isOverdue: false, isUrgent: false }
    const date = new Date(dateStr)
    const isOverdue = isPast(date) && !isToday(date)
    const isUrgent = isToday(date) || isTomorrow(date)

    if (isOverdue) return { text: `Overdue`, isOverdue: true, isUrgent: false }
    if (isToday(date)) return { text: 'Today', isOverdue: false, isUrgent: true }
    if (isTomorrow(date)) return { text: 'Tomorrow', isOverdue: false, isUrgent: true }
    if (isThisWeek(date)) return { text: format(date, 'EEEE'), isOverdue: false, isUrgent: false }
    return { text: format(date, 'MMM d'), isOverdue: false, isUrgent: false }
  }

  const formatEventTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    return format(date, 'h:mm a')
  }

  const formatEventDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEE, MMM d')
  }

  // Group calendar events by date
  const groupedEvents = calendarEvents.reduce((groups, event) => {
    const dateKey = format(new Date(event.time), 'yyyy-MM-dd')
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(event)
    return groups
  }, {} as Record<string, CalendarEvent[]>)

  const getPlatformIcon = (platform?: string) => {
    if (!platform) return <Video className="w-4 h-4" />
    const p = platform.toLowerCase()
    if (p.includes('zoom')) return <span className="text-[10px] font-bold">Z</span>
    if (p.includes('meet') || p.includes('google')) return <span className="text-[10px] font-bold">G</span>
    if (p.includes('teams')) return <span className="text-[10px] font-bold">T</span>
    return <Video className="w-4 h-4" />
  }

  // Calendar grid generation
  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days: Date[] = []
    let day = startDate
    while (day <= endDate) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => isSameDay(new Date(event.time), date))
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // Get today's events for day view
  const todayEvents = calendarEvents.filter(event => isToday(new Date(event.time)))

  // Time slots for day view (6 AM to 11 PM)
  const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6) // 6 AM to 11 PM

  // Calculate current time position (percentage of day from 6 AM)
  const currentHour = getHours(currentTime)
  const currentMinute = getMinutes(currentTime)
  const timePosition = ((currentHour - 6) * 60 + currentMinute) / (18 * 60) * 100

  // Get event position and height for day view
  const getEventStyle = (event: CalendarEvent) => {
    const eventTime = new Date(event.time)
    const hour = getHours(eventTime)
    const minute = getMinutes(eventTime)
    const top = ((hour - 6) * 60 + minute) / (18 * 60) * 100
    return { top: `${Math.max(0, top)}%` }
  }

  // Collapsed state
  if (!isOpen) {
    return (
      <div className="w-14 border-l border-border bg-card flex flex-col items-center py-6 gap-3">
        <button
          onClick={() => { onToggle(); onTabChange('calendar'); }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            activeTab === 'calendar'
              ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-500 dark:text-blue-400 shadow-lg shadow-blue-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
          title="Calendar"
        >
          <Calendar className="w-5 h-5" />
        </button>

        <button
          onClick={() => { onToggle(); onTabChange('your_life'); }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
            activeTab === 'your_life'
              ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 text-purple-500 dark:text-purple-400 shadow-lg shadow-purple-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
          title="Your Life"
        >
          <Target className="w-5 h-5" />
          {counts && counts.your_life.pending > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-red-500/30">
              {counts.your_life.pending > 9 ? '9+' : counts.your_life.pending}
            </span>
          )}
        </button>

        <button
          onClick={() => { onToggle(); onTabChange('reminders'); }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
            activeTab === 'reminders'
              ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-amber-500 dark:text-amber-400 shadow-lg shadow-amber-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
          title="Reminders"
        >
          <Bell className="w-5 h-5" />
          {counts && counts.reminder.pending > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-amber-500/30">
              {counts.reminder.pending > 9 ? '9+' : counts.reminder.pending}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            <span className="text-sm font-semibold text-foreground">Actions</span>
          </div>
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <button
            onClick={() => onTabChange('calendar')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTab === 'calendar'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Calendar
          </button>
          <button
            onClick={() => onTabChange('your_life')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 relative ${
              activeTab === 'your_life'
                ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/10 text-purple-600 dark:text-purple-300 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Life
            {counts && counts.your_life.pending > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-purple-500/30 text-purple-600 dark:text-purple-300 text-[10px] font-bold rounded-full">
                {counts.your_life.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange('reminders')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 relative ${
              activeTab === 'reminders'
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-600/10 text-amber-600 dark:text-amber-300 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Tasks
            {counts && counts.reminder.pending > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] font-bold rounded-full">
                {counts.reminder.pending}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
              <div className="p-3 flex flex-col h-full">
                {/* Header with date and view toggle */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Calendar</p>
                    <h3 className="text-sm font-semibold text-foreground">
                      {format(new Date(), 'EEE, MMM d')}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setCalendarView('day')}
                      className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                        calendarView === 'day' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => setCalendarView('month')}
                      className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                        calendarView === 'month' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Month
                    </button>
                  </div>
                </div>

                {/* Day View - Timeline */}
                {calendarView === 'day' && (
                  <div className="flex-1 overflow-y-auto -mx-3 px-3">
                    <div className="relative" style={{ height: `${18 * 48}px` }}>
                      {/* Time slots */}
                      {timeSlots.map((hour) => (
                        <div
                          key={hour}
                          className="absolute w-full flex items-start border-t border-border"
                          style={{ top: `${((hour - 6) / 18) * 100}%`, height: `${100 / 18}%` }}
                        >
                          <span className="text-[10px] text-muted-foreground w-10 -mt-2 flex-shrink-0">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </span>
                          <div className="flex-1 h-full" />
                        </div>
                      ))}

                      {/* Current time indicator */}
                      {timePosition >= 0 && timePosition <= 100 && (
                        <div
                          className="absolute left-10 right-0 flex items-center z-20 pointer-events-none"
                          style={{ top: `${timePosition}%` }}
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-0.5 bg-red-500" />
                        </div>
                      )}

                      {/* Events */}
                      {todayEvents.map((event) => {
                        const style = getEventStyle(event)
                        return (
                          <div
                            key={event.id}
                            onClick={() => handleEmailClick(event.emailId)}
                            className={`absolute left-10 right-1 rounded-lg p-2 border transition-all hover:scale-[1.02] cursor-pointer z-10 ${
                              event.type === 'meeting'
                                ? 'bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30'
                                : 'bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30'
                            }`}
                            style={{ top: style.top, minHeight: '44px' }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
                                <p className={`text-[10px] ${
                                  event.type === 'meeting' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                                }`}>
                                  {formatEventTime(event.time)}
                                  {event.platform && ` · ${event.platform}`}
                                </p>
                              </div>
                              {event.type === 'meeting' && event.url && (
                                <a
                                  href={event.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-5 h-5 rounded flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 transition-colors"
                                  title="Join"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {/* Empty state for today */}
                      {todayEvents.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">No events today</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">Your schedule is clear</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Month View - Calendar Grid */}
                {calendarView === 'month' && (
                  <div className="flex-1 overflow-y-auto">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <h4 className="text-xs font-medium text-foreground">
                        {format(currentMonth, 'MMMM yyyy')}
                      </h4>
                      <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0.5">
                      {getCalendarDays().map((day, i) => {
                        const dayEvents = getEventsForDate(day)
                        const hasMeeting = dayEvents.some(e => e.type === 'meeting')
                        const hasDeadline = dayEvents.some(e => e.type === 'deadline')
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const isSelected = selectedDate && isSameDay(day, selectedDate)
                        const isTodayDate = isToday(day)

                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedDate(isSelected ? null : day)}
                            className={`
                              relative aspect-square rounded flex flex-col items-center justify-center transition-all
                              ${!isCurrentMonth ? 'text-muted-foreground/50' : 'text-muted-foreground'}
                              ${isTodayDate ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold' : ''}
                              ${isSelected ? 'bg-purple-500/30 ring-1 ring-purple-500/50' : 'hover:bg-accent'}
                            `}
                          >
                            <span className="text-[10px]">{format(day, 'd')}</span>
                            {dayEvents.length > 0 && (
                              <div className="flex gap-0.5 mt-0.5">
                                {hasMeeting && <div className="w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400" />}
                                {hasDeadline && <div className="w-1 h-1 rounded-full bg-purple-500 dark:bg-purple-400" />}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Selected Date Events */}
                    {selectedDate && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[10px] font-semibold text-muted-foreground">
                            {format(selectedDate, 'EEE, MMM d')}
                          </h4>
                          <button
                            onClick={() => setSelectedDate(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {selectedDateEvents.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground text-center py-3">No events</p>
                        ) : (
                          <div className="space-y-1.5">
                            {selectedDateEvents.map((event) => (
                              <div
                                key={event.id}
                                onClick={() => handleEmailClick(event.emailId)}
                                className={`p-2 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                                  event.type === 'meeting'
                                    ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
                                    : 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20'
                                }`}
                              >
                                <p className="text-[10px] font-medium text-foreground truncate">{event.title}</p>
                                <p className={`text-[9px] ${
                                  event.type === 'meeting' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                                }`}>
                                  {formatEventTime(event.time)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Your Life Tab */}
            {activeTab === 'your_life' && (
              <div className="p-3">
                {/* Overdue Warning */}
                {counts && counts.your_life.overdue > 0 && (
                  <div className="mb-3 px-3 py-2.5 bg-gradient-to-r from-red-500/10 to-rose-500/5 border border-red-500/20 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-300">{counts.your_life.overdue} overdue deadline{counts.your_life.overdue > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}

                {deadlines.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 flex items-center justify-center">
                      <Target className="w-7 h-7 text-purple-500 dark:text-purple-400" />
                    </div>
                    <p className="text-xs text-muted-foreground">No deadlines yet</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">AI will extract deadlines from your emails</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deadlines.map((action) => {
                      const { text: dateText, isOverdue, isUrgent } = formatDueDate(action.dueDate)
                      return (
                        <div
                          key={action.id}
                          className={`group p-3 rounded-xl border transition-all duration-200 hover:scale-[1.01] ${
                            isOverdue
                              ? 'bg-gradient-to-r from-red-500/10 to-transparent border-red-500/20 hover:border-red-500/30'
                              : isUrgent
                              ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/20 hover:border-amber-500/30'
                              : 'bg-muted/30 border-border hover:border-border/80 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isOverdue ? 'bg-red-500/20' : isUrgent ? 'bg-amber-500/20' : 'bg-purple-500/20'
                            }`}>
                              <Target className={`w-4 h-4 ${
                                isOverdue ? 'text-red-500 dark:text-red-400' : isUrgent ? 'text-amber-500 dark:text-amber-400' : 'text-purple-500 dark:text-purple-400'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{action.title}</p>
                              {action.emailSubject && (
                                <button
                                  onClick={() => handleEmailClick(action.emailId)}
                                  className="text-[11px] text-muted-foreground hover:text-purple-500 dark:hover:text-purple-400 truncate block mt-0.5 transition-colors text-left"
                                >
                                  {action.emailSubject}
                                </button>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-[11px] font-medium flex items-center gap-1 ${
                                  isOverdue ? 'text-red-500 dark:text-red-400' : isUrgent ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  {dateText}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleComplete(action.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                                title="Complete"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDismiss(action.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                title="Dismiss"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Reminders Tab */}
            {activeTab === 'reminders' && (
              <div className="p-3">
                {reminders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/5 flex items-center justify-center">
                      <Bell className="w-7 h-7 text-amber-500 dark:text-amber-400" />
                    </div>
                    <p className="text-xs text-muted-foreground">No tasks yet</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">AI will extract tasks from your emails</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reminders.map((action) => (
                      <div
                        key={action.id}
                        className="group p-3 rounded-xl bg-muted/30 border border-border hover:border-border/80 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.01]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{action.title}</p>
                            {action.emailSubject && (
                              <button
                                onClick={() => handleEmailClick(action.emailId)}
                                className="text-[11px] text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 truncate block mt-0.5 transition-colors text-left"
                              >
                                {action.emailSubject}
                              </button>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[11px] text-muted-foreground">
                                {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleComplete(action.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                              title="Complete"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDismiss(action.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              title="Dismiss"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
