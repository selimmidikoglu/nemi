'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { Email, EmailAddress } from '@/types'
import EmailHtmlCard from './EmailHtmlCard'
import EmailAddressTooltip from './EmailAddressTooltip'
import EmailCompose, { SendEmailData } from './EmailCompose'
import { AtSign, Reply } from 'lucide-react'

interface EmailDetailProps {
  email: Email
  onClose: () => void
  onDelete: (id: number) => void
  onToggleStar: (id: number, isStarred: boolean) => void
  onMarkAsRead: (id: number, isRead: boolean) => void
  onSendEmail: (emailData: SendEmailData) => Promise<void>
  onLinkClick?: (url?: string) => void
}

export default function EmailDetail({
  email,
  onClose,
  onDelete,
  onToggleStar,
  onMarkAsRead,
  onSendEmail,
  onLinkClick,
}: EmailDetailProps) {
  const [showCompose, setShowCompose] = useState(false)

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this email?')) {
      onDelete(email.id)
      onClose()
    }
  }

  const handleReply = () => {
    setShowCompose(true)
  }

  const handleSendEmail = async (emailData: SendEmailData) => {
    await onSendEmail(emailData)
    setShowCompose(false)
  }

  const handleCancelReply = () => {
    setShowCompose(false)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReply}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Reply"
          >
            <Reply className="w-5 h-5" />
          </button>

          <button
            onClick={() => onToggleStar(email.id, !email.isStarred)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-500 transition-colors"
            title={email.isStarred ? 'Unstar' : 'Star'}
          >
            {email.isStarred ? (
              <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
                />
              </svg>
            )}
          </button>

          <button
            onClick={() => onMarkAsRead(email.id, !email.isRead)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title={email.isRead ? 'Mark as unread' : 'Mark as read'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </button>

          <button
            onClick={handleDelete}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {typeof email.subject === 'string' ? (email.subject || '(No subject)') : '(No subject)'}
          </h1>

          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                <EmailAddressTooltip
                  label="From"
                  addresses={email.from}
                />
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <EmailAddressTooltip
                  label="To"
                  addresses={email.to}
                />
              </p>
              {email.cc && email.cc.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <EmailAddressTooltip
                    label="CC"
                    addresses={email.cc}
                  />
                </p>
              )}
              {email.bcc && email.bcc.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <EmailAddressTooltip
                    label="BCC"
                    addresses={email.bcc}
                  />
                </p>
              )}
              {email.replyTo && email.replyTo.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                  <EmailAddressTooltip
                    label="Reply-To"
                    addresses={email.replyTo}
                  />
                </p>
              )}
              {email.date && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {(() => {
                    try {
                      return format(new Date(email.date), 'PPpp')
                    } catch {
                      return email.date
                    }
                  })()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              {/* NEW: "About Me" badge if user is @mentioned */}
              {email.isAboutMe && (
                <span
                  className="px-2 py-1 text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 rounded-full flex items-center gap-1"
                  title={email.mentionContext || 'You are mentioned in this email'}
                >
                  <AtSign className="w-3 h-3" />
                  {email.mentionContext || 'Mentions You'}
                </span>
              )}
              {email.importance && (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    email.importance === 'critical'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : email.importance === 'high'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {email.importance}
                </span>
              )}
              {email.category && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                  {email.category}
                </span>
              )}
              {email.isMeRelated && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                  Me-related
                </span>
              )}
            </div>
          </div>

          {/* AI Summary OR HTML Card */}
          {email.renderAsHtml && email.htmlSnippet ? (
            // NEW: Beautiful HTML card for special emails (meetings, flights, PRs, etc.)
            <div className="mb-6">
              <EmailHtmlCard htmlContent={email.htmlSnippet} />
            </div>
          ) : email.summary ? (
            // Standard AI summary
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5"
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
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    AI Summary
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {email.summary}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Email body */}
        <div className="max-w-none">
          {email.htmlBody ? (
            <>
              <div
                className="email-html-content"
                dangerouslySetInnerHTML={{ __html: email.htmlBody }}
                onClick={(e) => {
                  // Handle link clicks to open in new tab
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'A') {
                    e.preventDefault();
                    const href = (target as HTMLAnchorElement).href;
                    if (href) {
                      // Track the link click for analytics
                      onLinkClick?.(href);
                      window.open(href, '_blank', 'noopener,noreferrer');
                    }
                  }
                }}
              />
              {/* Fallback to text if HTML exists but might be invisible */}
              {(email.textBody || email.body) && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                    View plain text version
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100 text-sm border-t pt-2">
                    {email.textBody || email.body}
                  </pre>
                </details>
              )}
            </>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100">
              {email.textBody || email.body || 'No content available'}
            </pre>
          )}
        </div>
      </div>

      {/* Gmail-style Reply Modal */}
      {showCompose && (
        <EmailCompose
          onClose={() => setShowCompose(false)}
          onSend={handleSendEmail}
          replyTo={email}
          emailAccountId={email.emailAccountId}
        />
      )}
    </div>
  )
}
