'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { Email } from '@/types'
import EmailHtmlCard from './EmailHtmlCard'
import EmailAddressTooltip from './EmailAddressTooltip'
import EmailCompose, { SendEmailData } from './EmailCompose'
import { AtSign, Reply, Clock, Archive, ArchiveRestore, ReplyAll, Forward, Trash2, Star, MoreHorizontal } from 'lucide-react'
import SnoozeModal from './SnoozeModal'
import { sanitizeEmailHtml } from '@/lib/sanitizeEmailHtml'

interface EmailDetailProps {
  email: Email
  threadEmails?: Email[]  // All emails in thread (for thread view)
  onClose: () => void
  onDelete: (id: string) => void
  onToggleStar: (id: string, isStarred: boolean) => void
  onMarkAsRead: (id: string, isRead: boolean) => void
  onSendEmail: (emailData: SendEmailData) => Promise<void>
  onLinkClick?: (url?: string) => void
  onSnooze?: (id: string, snoozeUntil: Date) => Promise<void>
  onUnsnooze?: (id: string) => Promise<void>
  onArchive?: (id: string) => Promise<void>
  onUnarchive?: (id: string) => Promise<void>
}

// Helper to parse sender name from "Name <email>" format
function parseSenderName(from: string): string {
  if (!from) return 'Unknown'
  const match = from.match(/^([^<]+)\s*</)
  if (match) return match[1].trim()
  if (from.includes('@')) return from.split('@')[0]
  return from
}

// Format date with full detail
function formatDetailedDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  try {
    return format(new Date(dateStr), 'EEE, MMM d, yyyy \'at\' h:mm a')
  } catch {
    return dateStr
  }
}

// Single email message in thread view - Gmail style full width
function ThreadEmailMessage({
  email,
  onLinkClick,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onToggleStar,
  isLast,
}: {
  email: Email
  onLinkClick?: (url?: string) => void
  onReply: (email: Email) => void
  onReplyAll: (email: Email) => void
  onForward: (email: Email) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string, isStarred: boolean) => void
  isLast: boolean
}) {
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  return (
    <div className={`${!isLast ? 'border-b border-border/50' : ''}`}>
      {/* Email Header - Sender info and actions */}
      <div className="flex items-start justify-between px-6 py-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {parseSenderName(email.from).charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Sender name and email */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {parseSenderName(email.from)}
              </span>
              <span className="text-xs text-muted-foreground">
                &lt;{email.from.match(/<([^>]+)>/)?.[1] || email.from}&gt;
              </span>
            </div>

            {/* To line */}
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <span>to</span>
              <EmailAddressTooltip label="" addresses={email.to} />
              {email.cc && email.cc.length > 0 && (
                <>
                  <span>, cc:</span>
                  <EmailAddressTooltip label="" addresses={email.cc} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Date and quick actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {formatDetailedDate(email.date)}
          </span>

          {/* Star button */}
          <button
            onClick={() => onToggleStar(email.id, !email.isStarred)}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            title={email.isStarred ? 'Unstar' : 'Star'}
          >
            {email.isStarred ? (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <Star className="w-4 h-4 text-muted-foreground hover:text-yellow-500" />
            )}
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>

            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => {
                      onDelete(email.id)
                      setShowMoreMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-muted flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete this message
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Email Body Content */}
      <div className="px-6 pb-4">
        {/* AI Summary OR HTML Card */}
        {email.renderAsHtml && email.htmlSnippet ? (
          <div className="mb-4">
            <EmailHtmlCard htmlContent={email.htmlSnippet} />
          </div>
        ) : email.summary ? (
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <p className="text-sm text-gray-700 dark:text-gray-300">{email.summary}</p>
            </div>
          </div>
        ) : null}

        {/* Badges */}
        {(email.isAboutMe || (email.importance && (email.importance === 'critical' || email.importance === 'high')) ||
          (email.category && email.category !== 'Other') || (email.badges && email.badges.length > 0)) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {email.isAboutMe && (
              <span className="px-2 py-0.5 text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 rounded-full flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                {email.mentionContext || 'Mentions You'}
              </span>
            )}
            {email.importance && (email.importance === 'critical' || email.importance === 'high') && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                email.importance === 'critical'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
              }`}>
                {email.importance}
              </span>
            )}
            {email.category && email.category !== 'Other' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                {email.category}
              </span>
            )}
            {email.badges && email.badges.length > 0 && email.badges
              .filter(badge => {
                const name = badge.name?.toLowerCase() || ''
                const excludedNames = ['low', 'normal', 'high', 'critical', 'other', 'general', 'misc']
                return !excludedNames.includes(name)
              })
              .map((badge, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: badge.color ? `${badge.color}20` : undefined,
                    color: badge.color || undefined,
                  }}
                  title={badge.category}
                >
                  {badge.name}
                </span>
              ))}
          </div>
        )}

        {/* Email body content */}
        {email.htmlBody ? (
          <div
            className="email-html-content"
            dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(email.htmlBody) }}
            onClick={(e) => {
              const target = e.target as HTMLElement
              if (target.tagName === 'A') {
                e.preventDefault()
                const href = (target as HTMLAnchorElement).href
                if (href) {
                  onLinkClick?.(href)
                  window.open(href, '_blank', 'noopener,noreferrer')
                }
              }
            }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-foreground text-sm">
            {email.textBody || email.body || 'No content available'}
          </pre>
        )}
      </div>

      {/* Reply/Forward buttons at bottom of each email - Gmail style */}
      <div className="px-6 pb-4 flex items-center gap-2">
        <button
          onClick={() => onReply(email)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-full hover:bg-muted transition-colors"
        >
          <Reply className="w-4 h-4" />
          Reply
        </button>
        <button
          onClick={() => onReplyAll(email)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-full hover:bg-muted transition-colors"
        >
          <ReplyAll className="w-4 h-4" />
          Reply all
        </button>
        <button
          onClick={() => onForward(email)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-full hover:bg-muted transition-colors"
        >
          <Forward className="w-4 h-4" />
          Forward
        </button>
      </div>
    </div>
  )
}

export default function EmailDetail({
  email,
  threadEmails,
  onClose,
  onDelete,
  onToggleStar,
  onMarkAsRead,
  onSendEmail,
  onLinkClick,
  onSnooze,
  onUnsnooze,
  onArchive,
  onUnarchive,
}: EmailDetailProps) {
  const [showCompose, setShowCompose] = useState(false)
  const [replyToEmail, setReplyToEmail] = useState<Email | null>(null)
  const [composeMode, setComposeMode] = useState<'reply' | 'replyAll' | 'forward'>('reply')
  const [showSnoozeModal, setShowSnoozeModal] = useState(false)

  // Determine if we're in thread view mode
  const isThreadView = threadEmails && threadEmails.length > 1 && threadEmails[0].id === email.id

  // All emails in thread, sorted oldest first (chronological order like Gmail)
  const allThreadEmails = isThreadView
    ? [...threadEmails].reverse()  // Oldest at top, newest at bottom
    : [email]

  const handleReply = (targetEmail: Email) => {
    setReplyToEmail(targetEmail)
    setComposeMode('reply')
    setShowCompose(true)
  }

  const handleReplyAll = (targetEmail: Email) => {
    setReplyToEmail(targetEmail)
    setComposeMode('replyAll')
    setShowCompose(true)
  }

  const handleForward = (targetEmail: Email) => {
    setReplyToEmail(targetEmail)
    setComposeMode('forward')
    setShowCompose(true)
  }

  const handleSendEmail = async (emailData: SendEmailData) => {
    await onSendEmail(emailData)
    setShowCompose(false)
    setReplyToEmail(null)
  }

  const handleDeleteEmail = (id: string) => {
    if (confirm('Are you sure you want to delete this email?')) {
      onDelete(id)
      // If deleting the main email, close the detail view
      if (id === email.id) {
        onClose()
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-background select-text">
      {/* Top Header Bar - Compact with main actions */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border select-none bg-card">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          title="Close"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="flex items-center gap-1">
          {/* Archive */}
          {(onArchive || onUnarchive) && (
            email.isArchived ? (
              <button
                onClick={() => onUnarchive?.(email.id)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="Unarchive"
              >
                <ArchiveRestore className="w-5 h-5 text-green-500" />
              </button>
            ) : (
              <button
                onClick={() => onArchive?.(email.id)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="Archive"
              >
                <Archive className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            )
          )}

          {/* Snooze */}
          {onSnooze && (
            email.snoozedUntil ? (
              <button
                onClick={() => onUnsnooze?.(email.id)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title={`Snoozed until ${new Date(email.snoozedUntil).toLocaleString()}`}
              >
                <Clock className="w-5 h-5 text-orange-500" />
              </button>
            ) : (
              <button
                onClick={() => setShowSnoozeModal(true)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="Snooze"
              >
                <Clock className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            )
          )}

          {/* Delete */}
          <button
            onClick={() => handleDeleteEmail(email.id)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5 text-muted-foreground hover:text-red-500" />
          </button>

          {/* Mark as read/unread */}
          <button
            onClick={() => onMarkAsRead(email.id, !email.isRead)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            title={email.isRead ? 'Mark as unread' : 'Mark as read'}
          >
            <svg className="w-5 h-5 text-muted-foreground hover:text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Email Thread Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Subject Line */}
        <div className="px-6 py-4 border-b border-border/50">
          <h1 className="text-xl font-semibold text-foreground">
            {typeof email.subject === 'string' ? (email.subject || '(No subject)') : '(No subject)'}
          </h1>
          {isThreadView && (
            <p className="text-xs text-muted-foreground mt-1">
              {allThreadEmails.length} messages
            </p>
          )}
        </div>

        {/* All emails in thread - full width, each with its own actions */}
        <div>
          {allThreadEmails.map((threadEmail, index) => (
            <ThreadEmailMessage
              key={threadEmail.id}
              email={threadEmail}
              onLinkClick={onLinkClick}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onDelete={handleDeleteEmail}
              onToggleStar={onToggleStar}
              isLast={index === allThreadEmails.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Gmail-style Reply Modal */}
      {showCompose && replyToEmail && (
        <EmailCompose
          onClose={() => {
            setShowCompose(false)
            setReplyToEmail(null)
          }}
          onSend={handleSendEmail}
          replyTo={composeMode === 'forward' ? undefined : replyToEmail}
          forwardEmail={composeMode === 'forward' ? replyToEmail : undefined}
          emailAccountId={replyToEmail.emailAccountId}
          isReplyAll={composeMode === 'replyAll'}
        />
      )}

      {/* Snooze Modal */}
      {showSnoozeModal && onSnooze && (
        <SnoozeModal
          onClose={() => setShowSnoozeModal(false)}
          onSnooze={(snoozeUntil) => {
            onSnooze(email.id, snoozeUntil)
            setShowSnoozeModal(false)
          }}
        />
      )}
    </div>
  )
}
