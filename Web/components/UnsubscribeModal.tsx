'use client'

import { useState, useEffect } from 'react'
import { X, Mail, MailX, Check, AlertCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { apiService, UnsubscribeRecommendation, UnsubscribeResult } from '@/lib/api'

interface UnsubscribeModalProps {
  isOpen: boolean
  onClose: () => void
  onUnsubscribeComplete?: (count: number) => void
}

// Helper to generate avatar URL from email domain
function getAvatarUrl(email: string, logoUrl: string | null): string | null {
  if (logoUrl) return logoUrl

  // Try Clearbit logo API as fallback
  const domain = email.split('@')[1]
  if (domain) {
    return `https://logo.clearbit.com/${domain}`
  }
  return null
}

// Helper to get initials from name or email
function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  const emailPrefix = email.split('@')[0]
  return emailPrefix.substring(0, 2).toUpperCase()
}

// Compact avatar component
function SenderAvatar({ rec }: { rec: UnsubscribeRecommendation }) {
  const [imgError, setImgError] = useState(false)
  const avatarUrl = getAvatarUrl(rec.senderEmail, rec.companyLogoUrl)
  const initials = getInitials(rec.senderName, rec.senderEmail)

  if (imgError || !avatarUrl) {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 shrink-0">
        {initials}
      </div>
    )
  }

  return (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
      <Image
        src={avatarUrl}
        alt={rec.senderName || rec.senderEmail}
        width={28}
        height={28}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
        unoptimized
      />
    </div>
  )
}

export default function UnsubscribeModal({ isOpen, onClose, onUnsubscribeComplete }: UnsubscribeModalProps) {
  const [recommendations, setRecommendations] = useState<UnsubscribeRecommendation[]>([])
  const [selectedSenders, setSelectedSenders] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [results, setResults] = useState<UnsubscribeResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchRecommendations()
    }
  }, [isOpen])

  const fetchRecommendations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const recs = await apiService.getUnsubscribeRecommendations()
      setRecommendations(recs)
      setSelectedSenders(new Set(recs.map(r => r.senderEmail)))
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
      setError('Failed to load recommendations')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSender = (senderEmail: string) => {
    setSelectedSenders(prev => {
      const next = new Set(prev)
      if (next.has(senderEmail)) {
        next.delete(senderEmail)
      } else {
        next.add(senderEmail)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedSenders.size === recommendations.length) {
      setSelectedSenders(new Set())
    } else {
      setSelectedSenders(new Set(recommendations.map(r => r.senderEmail)))
    }
  }

  const handleDismiss = async (senderEmail: string) => {
    try {
      await apiService.dismissUnsubscribeRecommendation(senderEmail)
      setRecommendations(prev => prev.filter(r => r.senderEmail !== senderEmail))
      setSelectedSenders(prev => {
        const next = new Set(prev)
        next.delete(senderEmail)
        return next
      })
    } catch (err) {
      console.error('Failed to dismiss recommendation:', err)
    }
  }

  const handleUnsubscribe = async () => {
    if (selectedSenders.size === 0) return

    setIsUnsubscribing(true)
    setError(null)
    try {
      const senderEmails = Array.from(selectedSenders)
      const unsubResults = await apiService.unsubscribeFromSenders(senderEmails)
      setResults(unsubResults)

      const successCount = unsubResults.filter(r => r.success).length
      if (successCount > 0) {
        const successEmails = new Set(unsubResults.filter(r => r.success).map(r => r.senderEmail))
        setRecommendations(prev => prev.filter(r => !successEmails.has(r.senderEmail)))
        setSelectedSenders(prev => {
          const next = new Set(prev)
          successEmails.forEach(email => next.delete(email))
          return next
        })
        onUnsubscribeComplete?.(successCount)
      }
    } catch (err) {
      console.error('Failed to unsubscribe:', err)
      setError('Failed to process unsubscribe requests')
    } finally {
      setIsUnsubscribing(false)
    }
  }

  const handleClose = () => {
    setResults(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const formatOpenRate = (rate: number) => `${Math.round(rate * 100)}%`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <MailX className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Unsubscribe Recommendations</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">{error}</p>
              <button
                onClick={fetchRecommendations}
                className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Try again
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Mail className="w-8 h-8 text-green-400 mb-2" />
              <p className="text-sm text-gray-900 dark:text-white font-medium">All caught up!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                No unsubscribe recommendations right now.
              </p>
            </div>
          ) : (
            <>
              {/* Description */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Senders you rarely engage with. Unsubscribe to clean up your inbox.
                </p>
              </div>

              {/* Select all */}
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSenders.size === recommendations.length && recommendations.length > 0}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Select all ({recommendations.length})
                  </span>
                </label>
              </div>

              {/* Recommendations list */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recommendations.map(rec => {
                  const hasAutoUnsubscribe = !!(rec.unsubscribeUrl || rec.unsubscribeEmail)
                  return (
                    <div
                      key={rec.id}
                      className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedSenders.has(rec.senderEmail)}
                          onChange={() => toggleSender(rec.senderEmail)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                        />

                        <SenderAvatar rec={rec} />

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {rec.companyName || rec.senderName || rec.senderEmail.split('@')[0]}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                            <span>{rec.totalEmails} emails</span>
                            <span className="text-red-500 dark:text-red-400 font-medium">
                              {formatOpenRate(rec.openRate)} opened
                            </span>
                            {!hasAutoUnsubscribe && (
                              <span className="text-amber-500 dark:text-amber-400" title="Manual unsubscribe required">
                                manual
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDismiss(rec.senderEmail)}
                          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Results */}
              {results && results.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">Results:</p>
                  <div className="space-y-1">
                    {results.map((result, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[10px]">
                        {result.success ? (
                          <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1">
                          <span className={result.success ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                            {result.senderEmail.split('@')[0]}
                            {result.success && result.method && (
                              <span className="text-gray-400 ml-1">({result.method})</span>
                            )}
                          </span>
                          {!result.success && result.method === null && (
                            <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                              No auto-unsubscribe available. Open an email from this sender and use their unsubscribe link.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {recommendations.length > 0 && !isLoading && (
          <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnsubscribe}
                disabled={selectedSenders.size === 0 || isUnsubscribing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded transition-colors"
              >
                {isUnsubscribing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <MailX className="w-3 h-3" />
                    Unsubscribe ({selectedSenders.size})
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
