'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Mail, Undo2 } from 'lucide-react'
import { apiService } from '@/lib/api'

interface SendUndoToastProps {
  scheduledEmailId: string
  subject: string
  to: string // First recipient email/name
  undoDelay: number // seconds
  onUndo: () => void
  onSent: () => void
  onDismiss: () => void
}

export default function SendUndoToast({
  scheduledEmailId,
  subject,
  to,
  undoDelay,
  onUndo,
  onSent,
  onDismiss
}: SendUndoToastProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(undoDelay)
  const [isUndoing, setIsUndoing] = useState(false)
  const [isSent, setIsSent] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) {
      setIsSent(true)
      onSent()
      // Auto dismiss after showing "Sent" for 2 seconds
      const timeout = setTimeout(() => {
        onDismiss()
      }, 2000)
      return () => clearTimeout(timeout)
    }

    const timer = setInterval(() => {
      setRemainingSeconds(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [remainingSeconds, onSent, onDismiss])

  const handleUndo = useCallback(async () => {
    if (isUndoing || isSent) return

    setIsUndoing(true)
    try {
      await apiService.cancelScheduledEmail(scheduledEmailId)
      onUndo()
      onDismiss()
    } catch (error) {
      console.error('Failed to undo send:', error)
      setIsUndoing(false)
    }
  }, [scheduledEmailId, isUndoing, isSent, onUndo, onDismiss])

  // Progress bar percentage
  const progressPercent = (remainingSeconds / undoDelay) * 100

  if (isSent) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
          <Mail className="w-5 h-5" />
          <span className="text-sm font-medium">Message sent</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="relative overflow-hidden bg-gray-900 text-white rounded-lg shadow-lg min-w-[320px] max-w-md">
        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="flex items-center gap-3 px-4 py-3">
          {/* Icon and message */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-sm font-medium">Sending in {remainingSeconds}s</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">
              To: {to} - {subject}
            </p>
          </div>

          {/* Undo button */}
          <button
            onClick={handleUndo}
            disabled={isUndoing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-50"
          >
            {isUndoing ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <Undo2 className="w-4 h-4" />
            )}
            Undo
          </button>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook to manage undo toast state
export function useSendUndoToast() {
  const [toastData, setToastData] = useState<{
    scheduledEmailId: string
    subject: string
    to: string
    undoDelay: number
  } | null>(null)

  const showUndoToast = useCallback((data: {
    scheduledEmailId: string
    subject: string
    to: string
    undoDelay?: number
  }) => {
    setToastData({
      ...data,
      undoDelay: data.undoDelay || 10
    })
  }, [])

  const hideToast = useCallback(() => {
    setToastData(null)
  }, [])

  return {
    toastData,
    showUndoToast,
    hideToast
  }
}
