'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Image as ImageIcon, Smile, Bold, Italic, Underline, Link as LinkIcon, X, Loader2 } from 'lucide-react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import type { EmailAddress } from '@/types'
import type { SendEmailData } from './EmailCompose'

interface InlineReplyBoxProps {
  onSend: (emailData: SendEmailData) => Promise<void>
  onCancel: () => void
  replyTo: string
  subject: string
  emailAccountId: string
  originalEmailId: string
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
  const [attachments, setAttachments] = useState<File[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const linkModalRef = useRef<HTMLDivElement>(null)

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (linkModalRef.current && !linkModalRef.current.contains(event.target as Node)) {
        setShowLinkModal(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // Handle file attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files)
      setAttachments(prev => [...prev, ...newFiles])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle image attachment
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
      setAttachments(prev => [...prev, ...newFiles])
    }
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    const native = emoji.native
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const newBody = body.slice(0, start) + native + body.slice(end)
      setBody(newBody)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + native.length
          textareaRef.current.selectionEnd = start + native.length
          textareaRef.current.focus()
        }
      }, 0)
    } else {
      setBody(body + native)
    }
    setShowEmojiPicker(false)
  }

  // Insert link
  const handleInsertLink = () => {
    if (!linkUrl) return
    const text = linkText || linkUrl
    const markdown = `[${text}](${linkUrl})`

    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const newBody = body.slice(0, start) + markdown + body.slice(end)
      setBody(newBody)
    } else {
      setBody(body + markdown)
    }

    setLinkUrl('')
    setLinkText('')
    setShowLinkModal(false)
  }

  // Apply text formatting
  const applyFormatting = (type: 'bold' | 'italic' | 'underline') => {
    if (!textareaRef.current) return

    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selectedText = body.slice(start, end)

    let wrapper = ''
    switch (type) {
      case 'bold':
        wrapper = '**'
        setIsBold(!isBold)
        break
      case 'italic':
        wrapper = '_'
        setIsItalic(!isItalic)
        break
      case 'underline':
        wrapper = '__'
        setIsUnderline(!isUnderline)
        break
    }

    if (selectedText) {
      const newBody = body.slice(0, start) + wrapper + selectedText + wrapper + body.slice(end)
      setBody(newBody)
    }
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
      <div className="p-6 relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your reply... (Cmd+Enter to send)"
          disabled={isSending}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 text-sm leading-relaxed"
        />

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-20 left-6 z-50"
          >
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="light"
              previewPosition="none"
              skinTonePosition="search"
              maxFrequentRows={2}
            />
          </div>
        )}

        {/* Link Modal */}
        {showLinkModal && (
          <div
            ref={linkModalRef}
            className="absolute bottom-20 left-40 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-72"
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Insert Link</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Text to display</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text (optional)"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertLink}
                  disabled={!linkUrl}
                  className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs group"
              >
                <Paperclip className="w-3 h-3 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                  {file.name}
                </span>
                <span className="text-gray-400">({formatFileSize(file.size)})</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        onChange={handleImageSelect}
        className="hidden"
        accept="image/*"
      />

      {/* Action bar */}
      <div className="flex items-center justify-between px-6 pb-6">
        {/* Left side - formatting tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Insert image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-md transition-colors ${showEmojiPicker ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            title="Insert emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            onClick={() => applyFormatting('bold')}
            className={`p-2 rounded-md transition-colors ${isBold ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormatting('italic')}
            className={`p-2 rounded-md transition-colors ${isItalic ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormatting('underline')}
            className={`p-2 rounded-md transition-colors ${isUnderline ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLinkModal(true)}
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
                <Loader2 className="w-4 h-4 animate-spin" />
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
