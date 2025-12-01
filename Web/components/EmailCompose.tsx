'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Email, EmailAddress } from '@/types'
import { X, Send, Loader2, Sparkles } from 'lucide-react'

interface EmailComposeProps {
  onClose: () => void
  onSend: (emailData: SendEmailData) => Promise<void>
  replyTo?: Email
  emailAccountId: number
}

export interface SendEmailData {
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  subject: string
  text?: string
  html?: string
  inReplyTo?: number
  emailAccountId: number
}

export default function EmailCompose({
  onClose,
  onSend,
  replyTo,
  emailAccountId
}: EmailComposeProps) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [selectedReply, setSelectedReply] = useState<'quick' | 'standard' | 'detailed' | null>(null)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)

  // Helper function to parse email addresses - defined BEFORE useEffect
  const parseEmailAddress = (emailString: string | undefined | null): EmailAddress => {
    // Handle null/undefined
    if (!emailString) {
      return { email: '' }
    }

    // Convert to string if needed
    const str = String(emailString)

    // Simple parser for "Name <email>" or just "email"
    const match = str.match(/(.+)\s*<(.+)>/)
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() }
    }
    return { email: str.trim() }
  }

  const parseEmailList = (emailString: string): EmailAddress[] => {
    if (!emailString.trim()) return []
    return emailString.split(',').map(e => parseEmailAddress(e.trim()))
  }

  // Pre-fill fields if replying
  useEffect(() => {
    if (replyTo) {
      // Set To field to reply-to or from
      const replyToAddress = replyTo.replyTo && replyTo.replyTo.length > 0
        ? replyTo.replyTo[0]
        : parseEmailAddress(replyTo.from)

      setTo(replyToAddress.email)

      // Set subject with "Re: " prefix
      const subjectText = typeof replyTo.subject === 'string' ? replyTo.subject : ''
      setSubject(subjectText.startsWith('Re: ') ? subjectText : `Re: ${subjectText}`)

      // Don't pre-fill body - let user write from scratch
      setBody('')
    }
  }, [replyTo])

  const handleSelectReply = (type: 'quick' | 'standard' | 'detailed') => {
    if (!replyTo?.suggestedReplies) return
    setBody(replyTo.suggestedReplies[type])
    setSelectedReply(type)
  }

  // Debounce timer for autocomplete
  const autocompleteTimerRef = useRef<NodeJS.Timeout | null>(null)

  // SIMPLE undo/redo history - push when user stops typing
  const undoHistoryRef = useRef<string[]>([])
  const redoHistoryRef = useRef<string[]>([])
  const undoCheckpointTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isUndoRedoRef = useRef<boolean>(false) // Flag to prevent clearing redo on undo/redo
  const UNDO_GAP_MS = 500 // Create checkpoint after 0.5 second pause (industry standard)

  // Ref for textarea to enable auto-focus
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus the textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Fetch AI autocomplete suggestion
  const fetchAutocompleteSuggestion = useCallback(async (currentText: string) => {
    // Only suggest after complete words (text must end with space) and minimum 5 chars
    const endsWithSpace = currentText.endsWith(' ')

    // Don't suggest right after punctuation (., !, ?) - user likely starting new sentence
    const endsWithPunctuation = /[.!?]\s*$/.test(currentText)

    if (!replyTo || currentText.length < 5 || !endsWithSpace || endsWithPunctuation) {
      setAiSuggestion('')
      setShowSuggestion(false)
      return
    }

    console.log('🤖 Fetching AI autocomplete for:', currentText.substring(0, 50) + '...')
    setIsLoadingSuggestion(true)

    try {
      // Use full backend URL since we have separate frontend/backend servers
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${backendUrl}/api/emails/autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          currentText,
          emailContext: {
            subject: replyTo.subject,
            from: replyTo.from,
            body: replyTo.textBody || replyTo.body,
            aiSummary: replyTo.summary
          }
        })
      })

      console.log('🤖 Autocomplete API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('🤖 Autocomplete suggestion received:', data.suggestion)
        if (data.suggestion && data.suggestion.trim()) {
          setAiSuggestion(data.suggestion)
          setShowSuggestion(true)
        } else {
          setAiSuggestion('')
          setShowSuggestion(false)
        }
      } else {
        const errorText = await response.text()
        console.error('🤖 Autocomplete API error:', response.status, errorText)
      }
    } catch (error) {
      console.error('🤖 Failed to fetch autocomplete suggestion:', error)
      setAiSuggestion('')
      setShowSuggestion(false)
    } finally {
      setIsLoadingSuggestion(false)
    }
  }, [replyTo])

  // Handle body text change with debounced autocomplete and undo tracking
  const handleBodyChange = (newText: string) => {
    setBody(newText)
    setShowSuggestion(false) // Hide suggestion while typing

    // Don't clear redo history if this change is from undo/redo
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false // Reset flag
      return // Don't create new checkpoints for undo/redo changes
    }

    // Clear redo history when user types new text (can't redo after new changes)
    redoHistoryRef.current = []

    // Clear previous checkpoint timer
    if (undoCheckpointTimerRef.current) {
      clearTimeout(undoCheckpointTimerRef.current)
    }

    // When user stops typing for UNDO_GAP_MS, push current text to undo array
    undoCheckpointTimerRef.current = setTimeout(() => {
      const lastCheckpoint = undoHistoryRef.current[undoHistoryRef.current.length - 1]
      // Only save if text is different from last checkpoint
      if (newText !== lastCheckpoint && newText.trim().length > 0) {
        undoHistoryRef.current.push(newText)
        console.log('🤖 Saved checkpoint:', newText.substring(0, 30) + '...', 'Total:', undoHistoryRef.current.length)
      }
    }, UNDO_GAP_MS)

    // Clear previous autocomplete timer
    if (autocompleteTimerRef.current) {
      clearTimeout(autocompleteTimerRef.current)
    }

    // Set new timer for autocomplete (150ms debounce - very fast response)
    autocompleteTimerRef.current = setTimeout(() => {
      fetchAutocompleteSuggestion(newText)
    }, 150)
  }

  // Accept AI suggestion with Tab key and handle Undo/Redo
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && showSuggestion && aiSuggestion) {
      e.preventDefault()
      const newText = body + ' ' + aiSuggestion
      setBody(newText)
      setAiSuggestion('')
      setShowSuggestion(false)
    } else if (e.key === 'Escape' && showSuggestion) {
      setShowSuggestion(false)
    } else if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      // Cmd+Z / Ctrl+Z: Undo - pop from undo stack, push current to redo stack
      if (undoHistoryRef.current.length > 0) {
        e.preventDefault()
        // Push current text to redo stack before undoing
        redoHistoryRef.current.push(body)
        // Pop and restore previous text
        const previousText = undoHistoryRef.current.pop() || ''
        console.log('🤖 Undo - popped:', previousText.substring(0, 30) + '...', 'Undo remaining:', undoHistoryRef.current.length, 'Redo stack:', redoHistoryRef.current.length)
        // Set flag to prevent handleBodyChange from clearing redo
        isUndoRedoRef.current = true
        setBody(previousText)
      }
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      // Cmd+Shift+Z / Ctrl+Shift+Z: Redo - pop from redo stack, push current to undo stack
      if (redoHistoryRef.current.length > 0) {
        e.preventDefault()
        // Push current text to undo stack before redoing
        undoHistoryRef.current.push(body)
        // Pop and restore next text
        const nextText = redoHistoryRef.current.pop() || ''
        console.log('🤖 Redo - popped:', nextText.substring(0, 30) + '...', 'Undo stack:', undoHistoryRef.current.length, 'Redo remaining:', redoHistoryRef.current.length)
        // Set flag to prevent handleBodyChange from clearing redo
        isUndoRedoRef.current = true
        setBody(nextText)
      }
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimerRef.current) {
        clearTimeout(autocompleteTimerRef.current)
      }
    }
  }, [])

  const handleSend = async () => {
    const toAddresses = parseEmailList(to)
    if (toAddresses.length === 0) {
      alert('Please enter at least one recipient')
      return
    }

    if (!subject.trim()) {
      alert('Please enter a subject')
      return
    }

    if (!body.trim()) {
      alert('Please enter a message')
      return
    }

    setIsSending(true)

    try {
      const emailData: SendEmailData = {
        to: toAddresses,
        cc: showCc ? parseEmailList(cc) : undefined,
        bcc: showBcc ? parseEmailList(bcc) : undefined,
        subject: subject.trim(),
        text: body,
        inReplyTo: replyTo?.id,
        emailAccountId
      }

      await onSend(emailData)
      onClose()
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[95vw] h-[95vh] flex flex-col border border-gray-300 dark:border-gray-600 overflow-hidden">
        {/* Header - Gmail style */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">
          <h2 className="text-xs font-medium text-gray-900 dark:text-white">
            {replyTo ? `Re: ${replyTo.subject}` : 'New Message'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSending}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-column layout: Email Detail on Left, Compose on Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDE - Original Email (like EmailDetail) */}
          {replyTo && (
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 border-r-2 border-gray-300 dark:border-gray-600">
              <div className="p-6">
              {/* Email header info */}
              <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
                  {replyTo.subject}
                </h3>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                  <p><span className="font-medium">From:</span> {replyTo.from}</p>
                  <p><span className="font-medium">To:</span> {replyTo.to}</p>
                  <p><span className="font-medium">Date:</span> {new Date(replyTo.date).toLocaleString()}</p>
                </div>

                {/* Badges - same as EmailDetail */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {replyTo.isMeRelated && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Personally Relevant
                    </span>
                  )}
                  {replyTo.isAboutMe && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      {replyTo.mentionContext || 'Mentions You'}
                    </span>
                  )}
                  {replyTo.importance && (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        replyTo.importance === 'critical'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : replyTo.importance === 'high'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {replyTo.importance}
                    </span>
                  )}
                  {replyTo.category && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                      {replyTo.category}
                    </span>
                  )}
                  {replyTo.isMeRelated && (
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                      Me-related
                    </span>
                  )}
                </div>
              </div>

              {/* AI Summary - same as EmailDetail */}
              {replyTo.summary && (
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
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-0.5">
                        AI Summary
                      </h3>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {replyTo.summary}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email body - same styling as EmailDetail */}
              <div className="prose prose-sm dark:prose-invert max-w-none [&_a]:text-blue-600 [&_a]:underline [&_a]:cursor-pointer dark:[&_a]:text-blue-400 hover:[&_a]:text-blue-800 dark:hover:[&_a]:text-blue-300">
                {replyTo.htmlBody ? (
                  <>
                    <div
                      className="email-html-content text-xs [&_*]:!text-gray-900 dark:[&_*]:!text-gray-100 [&_a]:!text-blue-600 dark:[&_a]:!text-blue-400"
                      dangerouslySetInnerHTML={{ __html: replyTo.htmlBody }}
                      onClick={(e) => {
                        // Handle link clicks to open in new tab
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'A') {
                          e.preventDefault();
                          const href = (target as HTMLAnchorElement).href;
                          if (href) {
                            window.open(href, '_blank', 'noopener,noreferrer');
                          }
                        }
                      }}
                    />
                    {/* Fallback to text if HTML exists but might be invisible */}
                    {(replyTo.textBody || replyTo.body) && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                          View plain text version
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100 text-xs border-t pt-2">
                          {replyTo.textBody || replyTo.body}
                        </pre>
                      </details>
                    )}
                  </>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100 text-xs">
                    {replyTo.textBody || replyTo.body || 'No content available'}
                  </pre>
                )}
              </div>
              </div>
            </div>
          )}

          {/* RIGHT SIDE - Reply Compose Box */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
            {/* Compose Form - Gmail style with borderless inputs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* To field */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-3 py-2">
            <label className="text-xs text-gray-600 dark:text-gray-400 w-10">
              To
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipients"
              disabled={isSending}
              className="flex-1 px-2 py-0.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 text-xs"
            />
            <div className="flex items-center gap-1">
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  disabled={isSending}
                  className="text-[10px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-1.5 py-0.5 disabled:opacity-50"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  onClick={() => setShowBcc(true)}
                  disabled={isSending}
                  className="text-[10px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-1.5 py-0.5 disabled:opacity-50"
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {/* Cc field */}
          {showCc && (
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-3 py-2">
              <label className="text-xs text-gray-600 dark:text-gray-400 w-10">
                Cc
              </label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Recipients"
                disabled={isSending}
                className="flex-1 px-2 py-0.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 text-xs"
              />
            </div>
          )}

          {/* Bcc field */}
          {showBcc && (
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-3 py-2">
              <label className="text-xs text-gray-600 dark:text-gray-400 w-10">
                Bcc
              </label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Recipients"
                disabled={isSending}
                className="flex-1 px-2 py-0.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 text-xs"
              />
            </div>
          )}

          {/* Subject field */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-3 py-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              disabled={isSending}
              className="flex-1 px-2 py-0.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 text-xs font-medium"
            />
          </div>

          {/* Smart Reply Suggestions */}
          {replyTo?.suggestedReplies && !body && (
            <div className="px-3 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">AI-suggested replies:</span>
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleSelectReply('quick')}
                  className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5 uppercase tracking-wide">Quick</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{replyTo.suggestedReplies.quick}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">Click to use</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectReply('standard')}
                  className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-0.5 uppercase tracking-wide">Standard</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{replyTo.suggestedReplies.standard}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors whitespace-nowrap">Click to use</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectReply('detailed')}
                  className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5 uppercase tracking-wide">Detailed</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{replyTo.suggestedReplies.detailed}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors whitespace-nowrap">Click to use</div>
                  </div>
                </button>
              </div>
            </div>
          )}

              {/* Body field with AI autocomplete - GitHub Copilot style */}
              <div className="flex-1 px-3 py-2 overflow-y-auto relative">
                <div className="relative w-full h-full">
                  {/* Ghost text overlay - shows AI suggestion inline */}
                  {showSuggestion && aiSuggestion && (
                    <div
                      className="absolute top-0 left-0 w-full h-full px-2 py-1 pointer-events-none text-xs leading-relaxed whitespace-pre-wrap"
                      style={{
                        color: 'transparent',
                        caretColor: 'transparent'
                      }}
                    >
                      {/* Invisible text matching what user typed */}
                      <span style={{ opacity: 0 }}>{body}</span>
                      {/* Space between user text and suggestion */}
                      <span style={{ opacity: 0 }}> </span>
                      {/* Visible gray suggestion text */}
                      <span className="text-gray-400 dark:text-gray-500 italic">
                        {aiSuggestion}
                      </span>
                    </div>
                  )}

                  {/* Actual textarea */}
                  <textarea
                    ref={textareaRef}
                    value={body}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write your reply... (AI autocomplete will appear as you type)"
                    disabled={isSending}
                    className="relative w-full h-full px-2 py-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none disabled:opacity-50 text-xs leading-relaxed"
                    style={{ position: 'relative', zIndex: 1 }}
                  />
                </div>

                {/* Loading indicator */}
                {/* {isLoadingSuggestion && (
                  <div className="absolute bottom-4 right-4">
                    <div className="bg-blue-100 dark:bg-blue-900/50 px-3 py-2 rounded-full flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>AI thinking...</span>
                    </div>
                  </div>
                )} */}

                {/* Helper hint when suggestion is showing - bottom right, left of trash icon */}
                {/* {showSuggestion && aiSuggestion && (
                  <div className="absolute bottom-4 right-16 bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-medium shadow-sm">
                    Press Tab to accept
                  </div>
                )} */}
              </div>
            </div>

            {/* Footer - Gmail style toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {/* Left side - formatting tools */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send
                    </>
                  )}
                </button>

                <div className="flex items-center gap-0.5 ml-2">
                  <button className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Formatting options">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  </button>
                  <button className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Attach files">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Insert link">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </button>
                  <button className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Insert emoji">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Insert image">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Right side - more options and delete */}
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="More options">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                <button
                  onClick={onClose}
                  disabled={isSending}
                  className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
                  title="Discard"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
