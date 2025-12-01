'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

interface Badge {
  id: string
  name: string
  color: string
  icon: string
  category: string
  displayOrder: number
  usageCount: number
}

// System/generic badges that Gmail also has - these go in "Categories" tab
const SYSTEM_BADGE_NAMES = ['Automated', 'Promotional', 'Newsletter', 'Marketing', 'Spam', 'Shopping', 'Other']

type TabType = 'my-badges' | 'categories'

// Badge icon component - shows company logo or falls back to colored square
function BadgeIcon({ badge, size = 'md' }: { badge: { name: string; color: string; category: string }; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false)

  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'

  // For company badges, try to show a logo
  if (badge.category === 'Company' && !imgError) {
    // Clean up badge name to use as domain hint
    const domainName = badge.name.toLowerCase().replace(/\s+/g, '')
    const logoUrl = `https://logo.clearbit.com/${domainName}.com`

    return (
      <div className={cn(sizeClasses, 'rounded-sm overflow-hidden flex-shrink-0 bg-muted')}>
        <img
          src={logoUrl}
          alt={badge.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  // Fallback to colored square
  return (
    <div
      className={cn(sizeClasses, 'rounded-sm flex-shrink-0')}
      style={{ backgroundColor: badge.color }}
    />
  )
}

interface BadgeItemProps {
  badge: Badge
  onEdit?: (badge: Badge) => void
  onDelete?: (badge: Badge) => void
  onViewAnalytics?: (badge: Badge) => void
}

function SortableBadgeItem({ badge, onEdit, onDelete, onViewAnalytics }: BadgeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: badge.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border border-border rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-shadow',
        isDragging && 'opacity-50'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* Badge icon - logo or colored dot */}
      <BadgeIcon badge={badge} size="md" />

      {/* Badge info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground truncate">{badge.name}</h3>
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
          >
            {badge.usageCount} emails
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{badge.category}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onViewAnalytics?.(badge)}
          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
          title="View analytics"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
        <button
          onClick={() => onEdit?.(badge)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          title="Edit badge"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete?.(badge)}
          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          title="Delete badge"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function BadgeManagement() {
  const router = useRouter()
  const [badges, setBadges] = useState<Badge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasCustomOrder, setHasCustomOrder] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('my-badges')

  // Split badges into personal/company badges vs system categories
  // Filter out badges with 0 emails (unused badges)
  const { myBadges, categoryBadges, unusedBadgesCount } = useMemo(() => {
    const my: Badge[] = []
    const categories: Badge[] = []
    let unused = 0

    badges.forEach(badge => {
      if (SYSTEM_BADGE_NAMES.includes(badge.name)) {
        if (badge.usageCount > 0) {
          categories.push(badge)
        }
      } else {
        if (badge.usageCount > 0) {
          my.push(badge)
        } else {
          unused++
        }
      }
    })

    return { myBadges: my, categoryBadges: categories, unusedBadgesCount: unused }
  }, [badges])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load badges from API
  useEffect(() => {
    loadBadges()
  }, [])

  const loadBadges = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:3000/api/badges', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch badges')
      }

      const data = await response.json()

      // Update custom order flag
      setHasCustomOrder(data.hasCustomOrder || false)

      // Transform backend data to frontend format
      const transformedBadges: Badge[] = (data.badges || []).map((badge: any, index: number) => ({
        id: badge.badge_name || badge.badgeName || String(index),
        name: badge.badge_name || badge.badgeName || 'Unknown',
        color: badge.badge_color || badge.badgeColor || '#6366f1',
        icon: badge.badge_icon || badge.badgeIcon || 'tag',
        category: badge.category || 'Other',
        displayOrder: badge.display_order !== undefined ? badge.display_order : badge.displayOrder !== undefined ? badge.displayOrder : index,
        usageCount: badge.usage_count || badge.usageCount || 0,
      }))

      setBadges(transformedBadges.sort((a, b) => a.displayOrder - b.displayOrder))
    } catch (error) {
      console.error('Failed to load badges:', error)
      // Show empty state on error
      setBadges([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      // Work with myBadges array only (not categories)
      const oldIndex = myBadges.findIndex((b) => b.id === active.id)
      const newIndex = myBadges.findIndex((b) => b.id === over.id)

      // Make sure both badges were found
      if (oldIndex === -1 || newIndex === -1) {
        console.error('Badge not found in array')
        return
      }

      const reorderedMyBadges = arrayMove(myBadges, oldIndex, newIndex)

      // Update display order for my badges only
      const updatedMyBadges = reorderedMyBadges.map((badge, index) => ({
        ...badge,
        displayOrder: index,
      }))

      // Merge back with category badges (keep their order unchanged)
      const updatedAllBadges = [...updatedMyBadges, ...categoryBadges]
      setBadges(updatedAllBadges)

      // Save order to backend (only send myBadges order)
      try {
        const response = await fetch('http://localhost:3000/api/badges/order', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            badge_order: updatedMyBadges.map(b => ({
              badge_name: b.name,
              order: b.displayOrder
            }))
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update badge order')
        }

        // Backend sets has_custom_badge_order to true
        setHasCustomOrder(true)
        console.log('Badge order updated successfully')
      } catch (error) {
        console.error('Failed to save badge order:', error)
        // Revert on error
        setBadges(badges)
        alert('Failed to save badge order. Please try again.')
      }
    }
  }

  const handleViewAnalytics = (badge: Badge) => {
    router.push(`/analytics/badges/${encodeURIComponent(badge.name)}`)
  }

  const handleEdit = (badge: Badge) => {
    // TODO: Implement edit modal
    console.log('Edit badge:', badge)
    alert('Edit functionality coming soon!')
  }

  const handleDelete = async (badge: Badge) => {
    if (!confirm(`Are you sure you want to delete the "${badge.name}" badge? This will remove it from all emails.`)) {
      return
    }

    try {
      const response = await fetch(`http://localhost:3000/api/badges/${encodeURIComponent(badge.name)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete badge')
      }

      setBadges(badges.filter(b => b.id !== badge.id))
      console.log('Badge deleted successfully:', badge.name)
    } catch (error) {
      console.error('Failed to delete badge:', error)
      alert('Failed to delete badge. Please try again.')
    }
  }

  const handleResetOrder = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('http://localhost:3000/api/badges/reset-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to reset badge order')
      }

      const data = await response.json()

      // Update badges with new order from response
      setHasCustomOrder(data.hasCustomOrder || false)

      const transformedBadges: Badge[] = (data.badges || []).map((badge: any, index: number) => ({
        id: badge.badge_name || badge.badgeName || String(index),
        name: badge.badge_name || badge.badgeName || 'Unknown',
        color: badge.badge_color || badge.badgeColor || '#6366f1',
        icon: badge.badge_icon || badge.badgeIcon || 'tag',
        category: badge.category || 'Other',
        displayOrder: badge.display_order !== undefined ? badge.display_order : badge.displayOrder !== undefined ? badge.displayOrder : index,
        usageCount: badge.usage_count || badge.usageCount || 0,
      }))

      setBadges(transformedBadges.sort((a, b) => a.displayOrder - b.displayOrder))
      setShowResetConfirm(false)
      console.log('Badge order reset to default successfully')
    } catch (error) {
      console.error('Failed to reset badge order:', error)
      alert('Failed to reset badge order. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  // Get the current tab's badges
  const currentTabBadges = activeTab === 'my-badges' ? myBadges : categoryBadges

  // Don't allow drag and drop when searching - it gets confusing
  const filteredBadges = currentTabBadges.filter(badge =>
    badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.category.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const isSearching = searchQuery.length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Badge Management</h2>
          <p className="text-muted-foreground">
            {activeTab === 'my-badges'
              ? 'Your personalized badges from companies and services. Drag to reorder.'
              : 'Default email categories. These are similar to Gmail labels.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasCustomOrder && activeTab === 'my-badges' && (
            <button
              className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex items-center gap-2"
              onClick={() => setShowResetConfirm(true)}
              title="Reset to default order (by email count)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Order
            </button>
          )}
          <button
            className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors flex items-center gap-2"
            onClick={() => router.push('/analytics')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => { setActiveTab('my-badges'); setSearchQuery('') }}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
            activeTab === 'my-badges'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          My Badges
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
            {myBadges.length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('categories'); setSearchQuery('') }}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
            activeTab === 'categories'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Categories
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-muted-foreground/10 text-muted-foreground">
            {categoryBadges.length}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={activeTab === 'my-badges' ? 'Search your badges...' : 'Search categories...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Info banner for Categories tab */}
      {activeTab === 'categories' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              These are default email categories that work like Gmail labels. They help organize emails by type (promotional, newsletters, etc.) rather than by sender.
            </p>
          </div>
        </div>
      )}

      {/* Badge list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            {filteredBadges.length} {activeTab === 'my-badges' ? 'badge' : 'categor'}{filteredBadges.length !== 1 ? (activeTab === 'my-badges' ? 's' : 'ies') : (activeTab === 'my-badges' ? '' : 'y')}
          </h3>
          {isSearching && activeTab === 'my-badges' && (
            <p className="text-xs text-muted-foreground">Clear search to reorder badges</p>
          )}
        </div>

        {filteredBadges.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              {activeTab === 'my-badges' ? 'No badges found' : 'No categories found'}
            </p>
          </div>
        ) : isSearching || activeTab === 'categories' ? (
          // Show non-draggable list when searching or in categories tab
          <div className="space-y-2">
            {filteredBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-card border border-border rounded-lg p-4 flex items-center gap-4"
              >
                <BadgeIcon badge={badge} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate">{badge.name}</h3>
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                    >
                      {badge.usageCount} emails
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{badge.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewAnalytics(badge)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="View analytics"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                  {activeTab === 'my-badges' && (
                    <>
                      <button
                        onClick={() => handleEdit(badge)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                        title="Edit badge"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(badge)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete badge"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Show draggable list when not searching and in my-badges tab
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={myBadges.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {myBadges.map((badge) => (
                  <SortableBadgeItem
                    key={badge.id}
                    badge={badge}
                    onViewAnalytics={handleViewAnalytics}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Reset Order Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Reset Badge Order?</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              This will reset your badges to the default order, sorted by email count. Your custom arrangement will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetOrder}
                disabled={isResetting}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset to Default'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
