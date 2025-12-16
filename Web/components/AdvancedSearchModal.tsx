'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, ChevronDown } from 'lucide-react'

interface AdvancedSearchFilters {
  from?: string
  to?: string
  subject?: string
  hasWords?: string
  doesntHave?: string
  hasAttachment?: boolean
  dateWithin?: number
  dateFrom?: string
  dateTo?: string
}

interface AdvancedSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (filters: AdvancedSearchFilters) => void
  initialQuery?: string
}

const DATE_WITHIN_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
]

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  onSearch,
  initialQuery = ''
}: AdvancedSearchModalProps) {
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    hasWords: initialQuery
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const fromInputRef = useRef<HTMLInputElement>(null)

  // Reset and focus when opening
  useEffect(() => {
    if (isOpen) {
      setFilters({ hasWords: initialQuery })
      setTimeout(() => fromInputRef.current?.focus(), 100)
    }
  }, [isOpen, initialQuery])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleSearch = () => {
    // Only include non-empty filters
    const activeFilters: AdvancedSearchFilters = {}
    if (filters.from?.trim()) activeFilters.from = filters.from.trim()
    if (filters.to?.trim()) activeFilters.to = filters.to.trim()
    if (filters.subject?.trim()) activeFilters.subject = filters.subject.trim()
    if (filters.hasWords?.trim()) activeFilters.hasWords = filters.hasWords.trim()
    if (filters.doesntHave?.trim()) activeFilters.doesntHave = filters.doesntHave.trim()
    if (filters.hasAttachment !== undefined) activeFilters.hasAttachment = filters.hasAttachment
    if (filters.dateWithin) activeFilters.dateWithin = filters.dateWithin
    if (filters.dateFrom) activeFilters.dateFrom = filters.dateFrom
    if (filters.dateTo) activeFilters.dateTo = filters.dateTo

    onSearch(activeFilters)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const clearFilters = () => {
    setFilters({})
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/30">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-[#2d2d2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Advanced Search</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Fields */}
        <div className="p-5 space-y-4">
          {/* From */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm text-gray-600 dark:text-gray-400 font-medium">From</label>
            <input
              ref={fromInputRef}
              type="text"
              value={filters.from || ''}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="sender@example.com"
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* To */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm text-gray-600 dark:text-gray-400 font-medium">To</label>
            <input
              type="text"
              value={filters.to || ''}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="recipient@example.com"
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Subject */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm text-gray-600 dark:text-gray-400 font-medium">Subject</label>
            <input
              type="text"
              value={filters.subject || ''}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Subject contains..."
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Has the words */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm text-gray-600 dark:text-gray-400 font-medium">Has words</label>
            <input
              type="text"
              value={filters.hasWords || ''}
              onChange={(e) => setFilters({ ...filters, hasWords: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Search in email content..."
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Doesn't have */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm text-gray-600 dark:text-gray-400 font-medium">Doesn't have</label>
            <input
              type="text"
              value={filters.doesntHave || ''}
              onChange={(e) => setFilters({ ...filters, doesntHave: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Exclude these words..."
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Date within */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm text-gray-600 dark:text-gray-400 font-medium">Date within</label>
            <div className="flex-1 flex items-center gap-3">
              <div className="relative">
                <select
                  value={filters.dateWithin || ''}
                  onChange={(e) => setFilters({ ...filters, dateWithin: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="appearance-none px-3 py-2 pr-8 text-sm bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="">Any time</option>
                  {DATE_WITHIN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Custom date range toggle */}
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showDatePicker ? 'Hide custom range' : 'Custom range'}
              </button>
            </div>
          </div>

          {/* Custom date range */}
          {showDatePicker && (
            <div className="flex items-center gap-4 ml-28">
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="px-3 py-2 text-sm bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-500">to</span>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="px-3 py-2 text-sm bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Has attachment */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm text-gray-600 dark:text-gray-400 font-medium">Attachment</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasAttachment === true}
                  onChange={(e) => setFilters({ ...filters, hasAttachment: e.target.checked ? true : undefined })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Has attachment</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252525]">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Clear all
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSearch}
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
