'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Minus, Maximize2, Minimize2, Send, Loader2, Paperclip, Smile, Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon, Trash2 } from 'lucide-react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import type { EmailAddress } from '@/types'

export interface ComposeEmailData {
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  subject: string
  text?: string
  html?: string
  attachments?: File[]
  emailAccountId: string
}

interface Contact {
  email: string
  name?: string
  frequency: number
  lastUsed: string
}

interface Recipient {
  email: string
  name?: string
}

// Recipient chip component
function RecipientChip({ recipient, onRemove }: { recipient: Recipient; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full text-[12px] mr-1 mb-1">
      {recipient.name ? (
        <>
          <span className="font-medium text-gray-900 dark:text-white">{recipient.name}</span>
          <span className="text-gray-500 dark:text-gray-400">({recipient.email})</span>
        </>
      ) : (
        <span className="text-gray-900 dark:text-white">{recipient.email}</span>
      )}
      <button
        onClick={onRemove}
        className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

interface GmailComposeProps {
  emailAccountId: string
  onSend: (emailData: ComposeEmailData) => Promise<void>
  onClose: () => void
  initialTo?: string
  initialSubject?: string
  isReply?: boolean
}

export default function GmailCompose({
  emailAccountId,
  onSend,
  onClose,
  initialTo = '',
  initialSubject = '',
  isReply = false
}: GmailComposeProps) {
  // Parse initial recipients
  const parseInitialRecipients = (str: string): Recipient[] => {
    if (!str.trim()) return []
    return str.split(',').map(s => {
      const match = s.trim().match(/(.+)\s*<(.+)>/)
      if (match) return { name: match[1].trim(), email: match[2].trim() }
      return { email: s.trim() }
    }).filter(r => r.email)
  }

  // State for compose window - using arrays of recipients
  const [toRecipients, setToRecipients] = useState<Recipient[]>(parseInitialRecipients(initialTo))
  const [ccRecipients, setCcRecipients] = useState<Recipient[]>([])
  const [bccRecipients, setBccRecipients] = useState<Recipient[]>([])
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Contact autocomplete
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showContactSuggestions, setShowContactSuggestions] = useState(false)
  const [activeField, setActiveField] = useState<'to' | 'cc' | 'bcc' | null>(null)
  const [contactSearchDebounce, setContactSearchDebounce] = useState<NodeJS.Timeout | null>(null)

  // Toolbar states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')

  // Formatting state
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const linkModalRef = useRef<HTMLDivElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)
  const contactSuggestionsRef = useRef<HTMLDivElement>(null)

  // Don't fetch contacts on mount - only when user types 2+ chars

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (linkModalRef.current && !linkModalRef.current.contains(event.target as Node)) {
        setShowLinkModal(false)
      }
      if (contactSuggestionsRef.current && !contactSuggestionsRef.current.contains(event.target as Node)) {
        setShowContactSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus on mount
  useEffect(() => {
    if (toInputRef.current && !isMinimized && !initialTo) {
      toInputRef.current.focus()
    } else if (textareaRef.current && !isMinimized) {
      textareaRef.current.focus()
    }
  }, [isMinimized, initialTo])

  // Fetch frequent contacts
  const fetchFrequentContacts = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contacts/frequent?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    }
  }

  // Search contacts for autocomplete
  const searchContacts = async (query: string) => {
    if (query.length < 2) {
      // Only show frequent contacts when input is less than 2 chars
      if (query.length === 0) {
        fetchFrequentContacts()
      }
      return
    }

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/contacts/autocomplete?q=${encodeURIComponent(query)}&limit=8`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Failed to search contacts:', error)
    }
  }

  // Handle input change with debounced search
  const handleEmailInputChange = (value: string, field: 'to' | 'cc' | 'bcc') => {
    if (field === 'to') setToInput(value)
    else if (field === 'cc') setCcInput(value)
    else setBccInput(value)

    if (contactSearchDebounce) clearTimeout(contactSearchDebounce)

    // Only search and show suggestions if 2+ characters typed
    if (value.length >= 2) {
      const timeout = setTimeout(() => {
        searchContacts(value)
      }, 200)
      setContactSearchDebounce(timeout)
      setShowContactSuggestions(true)
    } else {
      setShowContactSuggestions(false)
      setContacts([])
    }

    setActiveField(field)
  }

  // Handle key press for manual email entry
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'to' | 'cc' | 'bcc') => {
    const input = field === 'to' ? toInput : field === 'cc' ? ccInput : bccInput

    if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && input.trim()) {
      e.preventDefault()
      const email = input.trim().replace(/,/g, '')
      if (email && email.includes('@')) {
        const newRecipient: Recipient = { email }
        if (field === 'to') {
          setToRecipients([...toRecipients, newRecipient])
          setToInput('')
        } else if (field === 'cc') {
          setCcRecipients([...ccRecipients, newRecipient])
          setCcInput('')
        } else {
          setBccRecipients([...bccRecipients, newRecipient])
          setBccInput('')
        }
        setShowContactSuggestions(false)
        setContacts([])
      }
    } else if (e.key === 'Backspace' && !input) {
      // Remove last recipient on backspace if input is empty
      if (field === 'to' && toRecipients.length > 0) {
        setToRecipients(toRecipients.slice(0, -1))
      } else if (field === 'cc' && ccRecipients.length > 0) {
        setCcRecipients(ccRecipients.slice(0, -1))
      } else if (field === 'bcc' && bccRecipients.length > 0) {
        setBccRecipients(bccRecipients.slice(0, -1))
      }
    }
  }

  // Select a contact from suggestions
  const selectContact = (contact: Contact) => {
    const newRecipient: Recipient = {
      email: contact.email,
      name: contact.name
    }

    if (activeField === 'to') {
      setToRecipients([...toRecipients, newRecipient])
      setToInput('')
    } else if (activeField === 'cc') {
      setCcRecipients([...ccRecipients, newRecipient])
      setCcInput('')
    } else if (activeField === 'bcc') {
      setBccRecipients([...bccRecipients, newRecipient])
      setBccInput('')
    }

    setShowContactSuggestions(false)
    setContacts([])
  }

  // Remove recipient
  const removeRecipient = (field: 'to' | 'cc' | 'bcc', index: number) => {
    if (field === 'to') {
      setToRecipients(toRecipients.filter((_, i) => i !== index))
    } else if (field === 'cc') {
      setCcRecipients(ccRecipients.filter((_, i) => i !== index))
    } else {
      setBccRecipients(bccRecipients.filter((_, i) => i !== index))
    }
  }

  // Helper functions
  const parseEmailAddress = (emailString: string): EmailAddress => {
    if (!emailString) return { email: '' }
    const str = String(emailString).trim()
    const match = str.match(/(.+)\s*<(.+)>/)
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() }
    }
    return { email: str }
  }

  const parseEmailList = (emailString: string): EmailAddress[] => {
    if (!emailString.trim()) return []
    return emailString.split(',').map(e => parseEmailAddress(e.trim())).filter(e => e.email)
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

  // Handle send
  const handleSend = async () => {
    // Convert recipients to EmailAddress format
    const toAddresses: EmailAddress[] = toRecipients.map(r => ({ email: r.email, name: r.name }))

    if (toAddresses.length === 0) {
      alert('Please enter at least one recipient')
      return
    }

    if (!subject.trim()) {
      if (!confirm('Send this message without a subject?')) return
    }

    if (!body.trim()) {
      if (!confirm('Send this message without a body?')) return
    }

    setIsSending(true)

    try {
      const ccAddresses: EmailAddress[] = ccRecipients.map(r => ({ email: r.email, name: r.name }))
      const bccAddresses: EmailAddress[] = bccRecipients.map(r => ({ email: r.email, name: r.name }))

      const emailData: ComposeEmailData = {
        to: toAddresses,
        cc: showCc && ccAddresses.length > 0 ? ccAddresses : undefined,
        bcc: showBcc && bccAddresses.length > 0 ? bccAddresses : undefined,
        subject: subject.trim(),
        text: body,
        attachments: attachments.length > 0 ? attachments : undefined,
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

  // Handle global keyboard shortcuts for the compose window
  const handleWindowKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      if (showEmojiPicker) setShowEmojiPicker(false)
      else if (showLinkModal) setShowLinkModal(false)
      else if (showContactSuggestions) setShowContactSuggestions(false)
    }
  }

  // Window positioning
  const getWindowClasses = () => {
    if (isMaximized) return 'fixed inset-8 z-50'
    if (isMinimized) return 'fixed bottom-0 right-6 w-[320px] z-50'
    return 'fixed bottom-0 right-6 w-[540px] z-50'
  }

  const getWindowHeight = () => {
    if (isMaximized) return 'h-full'
    if (isMinimized) return ''
    return 'h-[480px]'
  }

  return (
    <div className={getWindowClasses()}>
      <div
        className={`bg-white dark:bg-[#1f1f1f] rounded-t-xl overflow-hidden flex flex-col ${getWindowHeight()} ${isMaximized ? 'rounded-xl' : ''}`}
        style={{
          boxShadow: '0 12px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.15)',
        }}
        onKeyDown={handleWindowKeyDown}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a73e8] via-[#4285f4] to-[#669df6] cursor-pointer select-none"
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <h2 className="text-[13px] font-medium text-white truncate flex-1 drop-shadow-sm">
            {subject || 'New Message'}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-md transition-all"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); setIsMinimized(false) }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-md transition-all"
              title={isMaximized ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-md transition-all"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {!isMinimized && (
          <>
            {/* To field with autocomplete */}
            <div className="relative">
              <div className="flex items-start border-b border-gray-200 dark:border-gray-700 px-4 py-2">
                <label className="text-[13px] text-gray-500 dark:text-gray-400 w-10 font-medium pt-1">To</label>
                <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[28px]">
                  {toRecipients.map((recipient, index) => (
                    <RecipientChip
                      key={recipient.email + index}
                      recipient={recipient}
                      onRemove={() => removeRecipient('to', index)}
                    />
                  ))}
                  <input
                    ref={toInputRef}
                    type="text"
                    value={toInput}
                    onChange={(e) => handleEmailInputChange(e.target.value, 'to')}
                    onKeyDown={(e) => handleKeyDown(e, 'to')}
                    onFocus={() => { setActiveField('to') }}
                    placeholder={toRecipients.length === 0 ? "Recipients" : ""}
                    disabled={isSending}
                    className="flex-1 min-w-[100px] px-1 py-0.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 text-[13px]"
                  />
                </div>
                <div className="flex items-center gap-2 text-[12px] pt-1">
                  {!showCc && (
                    <button onClick={() => setShowCc(true)} className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button onClick={() => setShowBcc(true)} className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {/* Contact suggestions */}
              {showContactSuggestions && activeField === 'to' && contacts.length > 0 && (
                <div
                  ref={contactSuggestionsRef}
                  className="absolute top-full left-0 right-0 bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-600 rounded-b-xl shadow-xl z-50 max-h-72 overflow-y-auto"
                >
                  <div className="px-3 py-2 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                    Suggestions
                  </div>
                  {contacts.map((contact, index) => (
                    <button
                      key={contact.email + index}
                      onClick={() => selectContact(contact)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                        {(contact.name || contact.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        {contact.name && (
                          <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                            {contact.name}
                          </div>
                        )}
                        <div className={`text-[12px] ${contact.name ? 'text-gray-500' : 'text-gray-900 dark:text-white font-medium'} truncate`}>
                          {contact.email}
                        </div>
                      </div>
                      {contact.frequency > 1 && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-medium">
                          {contact.frequency}×
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cc field */}
            {showCc && (
              <div className="relative">
                <div className="flex items-start border-b border-gray-200 dark:border-gray-700 px-4 py-2">
                  <label className="text-[13px] text-gray-500 dark:text-gray-400 w-10 font-medium pt-1">Cc</label>
                  <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[28px]">
                    {ccRecipients.map((recipient, index) => (
                      <RecipientChip
                        key={recipient.email + index}
                        recipient={recipient}
                        onRemove={() => removeRecipient('cc', index)}
                      />
                    ))}
                    <input
                      type="text"
                      value={ccInput}
                      onChange={(e) => handleEmailInputChange(e.target.value, 'cc')}
                      onKeyDown={(e) => handleKeyDown(e, 'cc')}
                      onFocus={() => { setActiveField('cc') }}
                      placeholder={ccRecipients.length === 0 ? "Recipients" : ""}
                      disabled={isSending}
                      className="flex-1 min-w-[100px] px-1 py-0.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 text-[13px]"
                    />
                  </div>
                  <button onClick={() => { setShowCc(false); setCcRecipients([]); setCcInput('') }} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {showContactSuggestions && activeField === 'cc' && contacts.length > 0 && (
                  <div ref={contactSuggestionsRef} className="absolute top-full left-0 right-0 bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-600 rounded-b-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {contacts.map((contact, index) => (
                      <button key={contact.email + index} onClick={() => selectContact(contact)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">{(contact.name || contact.email).charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          {contact.name && <div className="text-[13px] text-gray-900 dark:text-white truncate">{contact.name}</div>}
                          <div className="text-[12px] text-gray-500 truncate">{contact.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bcc field */}
            {showBcc && (
              <div className="relative">
                <div className="flex items-start border-b border-gray-200 dark:border-gray-700 px-4 py-2">
                  <label className="text-[13px] text-gray-500 dark:text-gray-400 w-10 font-medium pt-1">Bcc</label>
                  <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[28px]">
                    {bccRecipients.map((recipient, index) => (
                      <RecipientChip
                        key={recipient.email + index}
                        recipient={recipient}
                        onRemove={() => removeRecipient('bcc', index)}
                      />
                    ))}
                    <input
                      type="text"
                      value={bccInput}
                      onChange={(e) => handleEmailInputChange(e.target.value, 'bcc')}
                      onKeyDown={(e) => handleKeyDown(e, 'bcc')}
                      onFocus={() => { setActiveField('bcc') }}
                      placeholder={bccRecipients.length === 0 ? "Recipients" : ""}
                      disabled={isSending}
                      className="flex-1 min-w-[100px] px-1 py-0.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 text-[13px]"
                    />
                  </div>
                  <button onClick={() => { setShowBcc(false); setBccRecipients([]); setBccInput('') }} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {showContactSuggestions && activeField === 'bcc' && contacts.length > 0 && (
                  <div ref={contactSuggestionsRef} className="absolute top-full left-0 right-0 bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-600 rounded-b-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {contacts.map((contact, index) => (
                      <button key={contact.email + index} onClick={() => selectContact(contact)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">{(contact.name || contact.email).charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          {contact.name && <div className="text-[13px] text-gray-900 dark:text-white truncate">{contact.name}</div>}
                          <div className="text-[12px] text-gray-500 truncate">{contact.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subject field */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                disabled={isSending}
                className="flex-1 px-2 py-0.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 text-[13px]"
              />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden relative">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Compose email..."
                disabled={isSending}
                className="w-full h-full px-4 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none disabled:opacity-50 text-[13px] leading-relaxed"
              />

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-2 left-2 z-50">
                  <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" previewPosition="none" skinTonePosition="search" maxFrequentRows={2} />
                </div>
              )}

              {/* Link Modal */}
              {showLinkModal && (
                <div ref={linkModalRef} className="absolute bottom-16 left-4 z-50 bg-white dark:bg-[#2d2d2d] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 p-4 w-80">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Insert Link</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wide font-medium">Text to display</label>
                      <input
                        type="text"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                        placeholder="Link text (optional)"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wide font-medium">URL</label>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium">
                        Cancel
                      </button>
                      <button onClick={handleInsertLink} disabled={!linkUrl} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm">
                        Insert
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 max-h-20 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs group hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300 max-w-[100px] truncate">{file.name}</span>
                      <span className="text-gray-400 text-[10px]">({formatFileSize(file.size)})</span>
                      <button onClick={() => removeAttachment(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer toolbar */}
            <div className="flex items-center justify-between px-3 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-[#2a2a2a]">
              {/* Send button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="px-6 py-2 text-[13px] font-semibold text-white bg-gradient-to-r from-[#1a73e8] to-[#4285f4] hover:from-[#1557b0] hover:to-[#3367d6] rounded-full flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
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

                {/* Formatting */}
                <div className="flex items-center ml-1 pl-2 border-l border-gray-300 dark:border-gray-600">
                  <button
                    onClick={() => applyFormatting('bold')}
                    className={`p-2 rounded-full transition-all ${isBold ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => applyFormatting('italic')}
                    className={`p-2 rounded-full transition-all ${isItalic ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => applyFormatting('underline')}
                    className={`p-2 rounded-full transition-all ${isUnderline ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right side tools */}
              <div className="flex items-center gap-0.5">
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="*/*" />
                <input ref={imageInputRef} type="file" multiple onChange={handleImageSelect} className="hidden" accept="image/*" />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-all"
                  title="Attach files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-all"
                  title="Insert link"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-full transition-all ${showEmojiPicker ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  title="Insert emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-all"
                  title="Insert photo"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                  title="Discard draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
