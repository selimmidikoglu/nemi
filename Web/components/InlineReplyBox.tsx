'use client'

import { useState } from 'react'
import { Send, Paperclip, Image as ImageIcon, Smile, Bold, Italic, Link as LinkIcon, X } from 'lucide-react'
import type { EmailAddress } from '@/types'
import type { SendEmailData } from './EmailCompose'

interface InlineReplyBoxProps {
  onSend: (emailData: SendEmailData) => Promise<void>
  onCancel: () => void
  replyTo: string
  subject: string
  emailAccountId: number
  originalEmailId: number
  suggestedReplies?: {
    quick: string
    standard: string
    detailed: string
  } | null
}

export default function InlineReplyBox({
  onSend,
  onCancel,
  replyTo,
  subject,
  emailAccountId,
  originalEmailId,
  suggestedReplies
}: InlineReplyBoxProps) {
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [selectedReply, setSelectedReply] = useState<'quick' | 'standard' | 'detailed' | null>(null)

  const parseEmailAddress = (emailString: string): EmailAddress => {
    const match = emailString.match(/(.+)\s*<(.+)>/)
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() }
    }
    return { email: emailString.trim() }
  }

  const parseEmailList = (emailString: string): EmailAddress[] => {
    if (!emailString.trim()) return []
    return emailString.split(',').map(e => parseEmailAddress(e.trim()))
  }

  const handleSend = async () => {
    if (!body.trim()) {
      alert('Please write a message')
      return
    }

    setIsSending(true)

    try {
      const emailData: SendEmailData = {
        to: [parseEmailAddress(replyTo)],
        cc: showCc ? parseEmailList(cc) : undefined,
        bcc: showCc ? parseEmailList(bcc) : undefined,
        subject,
        text: body,
        inReplyTo: originalEmailId,
        emailAccountId
      }

      await onSend(emailData)
      setBody('')
      onCancel()
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd+Enter or Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSelectReply = (type: 'quick' | 'standard' | 'detailed') => {
    if (!suggestedReplies) return
    setBody(suggestedReplies[type])
    setSelectedReply(type)
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Reply header */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">To:</span>
          <span className="text-gray-900 dark:text-white font-medium">{replyTo}</span>
          {!showCc && (
            <button
              onClick={() => setShowCc(true)}
              className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Add Cc/Bcc
            </button>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cc/Bcc fields */}
      {showCc && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">Cc:</span>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">Bcc:</span>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="bcc@example.com"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Smart Reply Suggestions */}
      {suggestedReplies && !body && (
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2 mb-3">
            <Smile className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI-suggested replies:</span>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => handleSelectReply('quick')}
              className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Quick Reply</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{suggestedReplies.quick}</div>
                </div>
                <div className="text-xs text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Click to use</div>
              </div>
            </button>
            <button
              onClick={() => handleSelectReply('standard')}
              className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Standard Reply</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{suggestedReplies.standard}</div>
                </div>
                <div className="text-xs text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Click to use</div>
              </div>
            </button>
            <button
              onClick={() => handleSelectReply('detailed')}
              className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Detailed Reply</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{suggestedReplies.detailed}</div>
                </div>
                <div className="text-xs text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Click to use</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Text editor */}
      <div className="p-6">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your reply... (Cmd+Enter to send)"
          disabled={isSending}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 text-sm leading-relaxed"
        />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-6 pb-6">
        {/* Left side - formatting tools */}
        <div className="flex items-center gap-1">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Insert image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Insert emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Insert link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Right side - send button */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">Cmd+Enter to send</span>
          <button
            onClick={handleSend}
            disabled={isSending || !body.trim()}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
