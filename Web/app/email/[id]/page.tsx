'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Reply, Forward, Star, Trash2, Archive, ArchiveRestore, Clock, MoreVertical, Printer, ExternalLink } from 'lucide-react'
import type { Email } from '@/types'
import { apiService } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import EmailHtmlCard from '@/components/EmailHtmlCard'
import EmailAddressTooltip from '@/components/EmailAddressTooltip'
import InlineReplyBox from '@/components/InlineReplyBox'
import SnoozeModal from '@/components/SnoozeModal'
import { sanitizeEmailHtml } from '@/lib/sanitizeEmailHtml'

export default function EmailViewPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()
  const [email, setEmail] = useState<Email | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReply, setShowReply] = useState(false)
  const [showSnoozeModal, setShowSnoozeModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && params.id) {
      fetchEmail()
    }
  }, [isAuthenticated, params.id])

  const fetchEmail = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const fetchedEmail = await apiService.getEmailById(params.id as string)
      setEmail(fetchedEmail)
    } catch (err) {
      console.error('Failed to fetch email:', err)
      setError('Failed to load email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/feed')
    }
  }

  const handleToggleStar = async () => {
    if (!email) return
    try {
      await apiService.toggleEmailStar(email.id, !email.isStarred)
      setEmail({ ...email, isStarred: !email.isStarred })
    } catch (err) {
      console.error('Failed to toggle star:', err)
    }
  }

  const handleArchive = async () => {
    if (!email) return
    try {
      const response = await fetch(`http://localhost:3000/api/emails/${email.id}/archive`, {
        method: email.isArchived ? 'DELETE' : 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })
      if (response.ok) {
        if (!email.isArchived) {
          router.push('/feed')
        } else {
          setEmail({ ...email, isArchived: false })
        }
      }
    } catch (err) {
      console.error('Failed to archive email:', err)
    }
  }

  const handleDelete = async () => {
    if (!email) return
    if (!confirm('Are you sure you want to delete this email?')) return
    try {
      const response = await fetch(`http://localhost:3000/api/emails/${email.id}/trash`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })
      if (response.ok) {
        router.push('/feed')
      }
    } catch (err) {
      console.error('Failed to delete email:', err)
    }
  }

  const handleSnooze = async (snoozeUntil: Date) => {
    if (!email) return
    try {
      const response = await fetch(`http://localhost:3000/api/emails/${email.id}/snooze`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ snoozeUntil: snoozeUntil.toISOString() }),
      })
      if (response.ok) {
        setShowSnoozeModal(false)
        router.push('/feed')
      }
    } catch (err) {
      console.error('Failed to snooze email:', err)
    }
  }

  const handleSendReply = async (emailData: any) => {
    try {
      const response = await fetch('http://localhost:3000/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(emailData),
      })
      if (response.ok) {
        setShowReply(false)
      }
    } catch (err) {
      console.error('Failed to send reply:', err)
      throw err
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !email) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">{error || 'Email not found'}</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col">
      {/* Top Toolbar - Gmail style */}
      <div className="sticky top-0 z-10 bg-[#0a0a0c]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Back to inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Action buttons */}
          <button
            onClick={handleArchive}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title={email.isArchived ? 'Unarchive' : 'Archive'}
          >
            {email.isArchived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
          </button>

          <button
            onClick={handleDelete}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowSnoozeModal(true)}
            className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
              email.snoozedUntil ? 'text-orange-400' : 'text-gray-400 hover:text-orange-400'
            }`}
            title={email.snoozedUntil ? `Snoozed until ${format(new Date(email.snoozedUntil), 'PPp')}` : 'Snooze'}
          >
            <Clock className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Right side actions */}
          <button
            onClick={() => window.print()}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Print"
          >
            <Printer className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-[#1a1a1e] border border-white/10 rounded-lg shadow-xl z-20 py-1">
                  <button
                    onClick={() => {
                      window.open(`mailto:?subject=Fwd: ${email.subject}&body=${encodeURIComponent(email.body || '')}`, '_blank')
                      setShowMoreMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                  >
                    <Forward className="w-4 h-4" /> Forward
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Subject */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-semibold text-white">
                {email.subject || '(No subject)'}
              </h1>
              <button
                onClick={handleToggleStar}
                className={`p-1 rounded transition-colors ${
                  email.isStarred ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                }`}
              >
                <Star className={`w-6 h-6 ${email.isStarred ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Badges */}
            {email.badges && email.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {email.badges
                  .filter(badge => {
                    const name = badge.name?.toLowerCase() || ''
                    const excluded = ['low', 'normal', 'high', 'critical', 'other', 'general', 'misc']
                    return !excluded.includes(name)
                  })
                  .map((badge, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: badge.color ? `${badge.color}20` : 'rgba(139, 92, 246, 0.2)',
                        color: badge.color || '#a78bfa',
                      }}
                    >
                      {badge.name}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Sender Info Card */}
          <div className="bg-[#111113] border border-white/5 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {email.from?.charAt(0).toUpperCase() || '?'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">
                      <EmailAddressTooltip label="" addresses={email.from} />
                    </p>
                    <p className="text-sm text-gray-500">
                      to <EmailAddressTooltip label="" addresses={email.to} />
                      {email.cc && email.cc.length > 0 && (
                        <>, cc: <EmailAddressTooltip label="" addresses={email.cc} /></>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-gray-400">
                      {email.date && format(new Date(email.date), 'MMM d, yyyy, h:mm a')}
                    </p>
                    {email.companyName && (
                      <div className="flex items-center gap-1.5 justify-end mt-1">
                        {email.companyLogoUrl && (
                          <img
                            src={email.companyLogoUrl}
                            alt={email.companyName}
                            className="w-4 h-4 rounded"
                          />
                        )}
                        <span className="text-xs text-gray-500">{email.companyName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Summary or HTML Card */}
          {email.renderAsHtml && email.htmlSnippet ? (
            <div className="mb-6">
              <EmailHtmlCard htmlContent={email.htmlSnippet} />
            </div>
          ) : email.summary ? (
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">AI Summary</h3>
                  <p className="text-sm text-gray-300">{email.summary}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Email Body */}
          <div className="bg-[#111113] border border-white/5 rounded-xl p-6">
            {email.htmlBody ? (
              <div
                className="email-html-content prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(email.htmlBody) }}
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.tagName === 'A') {
                    e.preventDefault()
                    const href = (target as HTMLAnchorElement).href
                    if (href) {
                      window.open(href, '_blank', 'noopener,noreferrer')
                    }
                  }
                }}
              />
            ) : (
              <div className="text-gray-300 whitespace-pre-wrap">
                {email.body || email.textBody || 'No content'}
              </div>
            )}
          </div>

          {/* Reply Section */}
          <div className="mt-6">
            {showReply ? (
              <div className="bg-[#111113] border border-white/5 rounded-xl p-4">
                <InlineReplyBox
                  emailAccountId={email.emailAccountId}
                  replyTo={email.from}
                  subject={email.subject}
                  onSend={handleSendReply}
                  onCancel={() => setShowReply(false)}
                  suggestedReplies={email.suggestedReplies}
                />
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReply(true)}
                  className="flex-1 py-3 px-4 bg-[#111113] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
                <button
                  onClick={() => window.open(`mailto:?subject=Fwd: ${email.subject}&body=${encodeURIComponent(email.body || '')}`, '_blank')}
                  className="flex-1 py-3 px-4 bg-[#111113] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Forward className="w-4 h-4" />
                  Forward
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Snooze Modal */}
      {showSnoozeModal && (
        <SnoozeModal
          onClose={() => setShowSnoozeModal(false)}
          onSnooze={handleSnooze}
        />
      )}

      {/* Styles for email HTML content */}
      <style jsx global>{`
        .email-html-content {
          color: #e5e7eb;
        }
        .email-html-content a {
          color: #a78bfa;
          text-decoration: underline;
        }
        .email-html-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        .email-html-content table {
          max-width: 100%;
          overflow-x: auto;
        }
        .email-html-content blockquote {
          border-left: 3px solid #6366f1;
          padding-left: 1rem;
          margin-left: 0;
          color: #9ca3af;
        }
        @media print {
          .email-html-content {
            color: #000;
          }
        }
      `}</style>
    </div>
  )
}
