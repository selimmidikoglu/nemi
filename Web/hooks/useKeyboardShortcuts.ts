'use client'

import { useEffect, useCallback } from 'react'

interface KeyboardShortcutsConfig {
  // Navigation
  onNextEmail?: () => void      // j
  onPrevEmail?: () => void      // k
  onOpenEmail?: () => void      // Enter or o
  onCloseEmail?: () => void     // Escape or u

  // Actions on selected email
  onArchive?: () => void        // e
  onDelete?: () => void         // # or Backspace
  onReply?: () => void          // r
  onReplyAll?: () => void       // a
  onForward?: () => void        // f
  onToggleStar?: () => void     // s
  onMarkRead?: () => void       // Shift+i
  onMarkUnread?: () => void     // Shift+u
  onSnooze?: () => void         // h

  // Global actions
  onCompose?: () => void        // c
  onSearch?: () => void         // /
  onRefresh?: () => void        // g then i (or just g for now)
  onGoToInbox?: () => void      // g then i
  onGoToStarred?: () => void    // g then s
  onGoToSent?: () => void       // g then t
  onGoToArchived?: () => void   // g then e

  // Toggle options
  onToggleReadPane?: () => void // ;

  // Is there a selected email?
  hasSelectedEmail?: boolean
  // Is compose/reply modal open?
  isComposeOpen?: boolean
  // Is search focused?
  isSearchFocused?: boolean
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onNextEmail,
    onPrevEmail,
    onOpenEmail,
    onCloseEmail,
    onArchive,
    onDelete,
    onReply,
    onReplyAll,
    onForward,
    onToggleStar,
    onMarkRead,
    onMarkUnread,
    onSnooze,
    onCompose,
    onSearch,
    onRefresh,
    hasSelectedEmail = false,
    isComposeOpen = false,
    isSearchFocused = false
  } = config

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input, textarea, or contenteditable
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      isComposeOpen
    ) {
      // Allow Escape to close modals
      if (e.key === 'Escape' && onCloseEmail) {
        onCloseEmail()
      }
      return
    }

    // Don't trigger shortcuts when modifier keys are pressed (except for specific combos)
    const hasModifier = e.ctrlKey || e.metaKey || e.altKey

    // Clear any text selection and blur focused elements to prevent visual artifacts
    const clearSelectionAndBlur = () => {
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges()
      }
      // Blur any focused element to remove focus outline
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    }

    // Handle shortcuts
    switch (e.key) {
      // Navigation - Arrow keys only (letter keys cause browser quick-find issues)
      case 'ArrowDown':
        if (!hasModifier && onNextEmail) {
          e.preventDefault()
          e.stopPropagation()
          clearSelectionAndBlur()
          onNextEmail()
        }
        break

      case 'ArrowUp':
        if (!hasModifier && onPrevEmail) {
          e.preventDefault()
          e.stopPropagation()
          clearSelectionAndBlur()
          onPrevEmail()
        }
        break

      case 'Enter':
        if (!hasModifier && onOpenEmail) {
          e.preventDefault()
          onOpenEmail()
        }
        break

      case 'Escape':
        if (!hasModifier && onCloseEmail) {
          e.preventDefault()
          onCloseEmail()
        }
        break

      // Actions on selected email
      case 'e':
        if (!hasModifier && hasSelectedEmail && onArchive) {
          e.preventDefault()
          onArchive()
        }
        break

      case '#':
      case 'Backspace':
        if (!hasModifier && hasSelectedEmail && onDelete) {
          e.preventDefault()
          onDelete()
        }
        break

      case 'r':
        if (!hasModifier && hasSelectedEmail && onReply) {
          e.preventDefault()
          onReply()
        }
        break

      case 'a':
        if (!hasModifier && hasSelectedEmail && onReplyAll) {
          e.preventDefault()
          onReplyAll()
        }
        break

      case 'f':
        if (!hasModifier && hasSelectedEmail && onForward) {
          e.preventDefault()
          onForward()
        }
        break

      case 's':
        if (!hasModifier && hasSelectedEmail && onToggleStar) {
          e.preventDefault()
          onToggleStar()
        }
        break

      case 'I':
        if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && hasSelectedEmail && onMarkRead) {
          e.preventDefault()
          onMarkRead()
        }
        break

      case 'h':
        if (!hasModifier && hasSelectedEmail && onSnooze) {
          e.preventDefault()
          onSnooze()
        }
        break

      // Global actions
      case 'c':
        if (!hasModifier && onCompose) {
          e.preventDefault()
          onCompose()
        }
        break

      case '/':
        if (!hasModifier && onSearch) {
          e.preventDefault()
          onSearch()
        }
        break

      case 'g':
        if (!hasModifier && onRefresh) {
          e.preventDefault()
          onRefresh()
        }
        break

      default:
        break
    }

    // Handle Shift+U for mark unread
    if (e.key === 'U' && e.shiftKey && !e.ctrlKey && !e.metaKey && hasSelectedEmail && onMarkUnread) {
      e.preventDefault()
      onMarkUnread()
    }
  }, [
    onNextEmail,
    onPrevEmail,
    onOpenEmail,
    onCloseEmail,
    onArchive,
    onDelete,
    onReply,
    onReplyAll,
    onForward,
    onToggleStar,
    onMarkRead,
    onMarkUnread,
    onSnooze,
    onCompose,
    onSearch,
    onRefresh,
    hasSelectedEmail,
    isComposeOpen,
    isSearchFocused
  ])

  useEffect(() => {
    // Use capture phase to intercept events before browser can process them
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [handleKeyDown])
}

// Keyboard shortcuts help modal content
export const KEYBOARD_SHORTCUTS = [
  { category: 'Navigation', shortcuts: [
    { key: '↓', description: 'Next email' },
    { key: '↑', description: 'Previous email' },
    { key: 'Enter', description: 'Open email' },
    { key: 'Esc', description: 'Close email / Go back' },
  ]},
  { category: 'Actions', shortcuts: [
    { key: 'e', description: 'Archive' },
    { key: '# / Backspace', description: 'Delete' },
    { key: 'r', description: 'Reply' },
    { key: 'a', description: 'Reply all' },
    { key: 'f', description: 'Forward' },
    { key: 's', description: 'Star / Unstar' },
    { key: 'h', description: 'Snooze' },
  ]},
  { category: 'Global', shortcuts: [
    { key: 'c', description: 'Compose new email' },
    { key: '/', description: 'Search' },
    { key: 'g', description: 'Refresh / Go to inbox' },
    { key: 'Shift+I', description: 'Mark as read' },
    { key: 'Shift+U', description: 'Mark as unread' },
  ]},
]
