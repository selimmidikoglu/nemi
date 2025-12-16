'use client'

import { useState } from 'react'
import { X, Clock, Sun, Moon, Calendar } from 'lucide-react'
import { addHours, addDays, setHours, setMinutes, startOfTomorrow, nextMonday, format } from 'date-fns'

interface SnoozeModalProps {
  onClose: () => void
  onSnooze: (snoozeUntil: Date) => void
}

export default function SnoozeModal({ onClose, onSnooze }: SnoozeModalProps) {
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('09:00')

  const now = new Date()

  // Preset snooze options
  const presets = [
    {
      label: 'Later today',
      icon: Clock,
      time: addHours(now, 3),
      description: format(addHours(now, 3), 'h:mm a')
    },
    {
      label: 'Tomorrow morning',
      icon: Sun,
      time: setMinutes(setHours(startOfTomorrow(), 9), 0),
      description: format(setMinutes(setHours(startOfTomorrow(), 9), 0), 'EEE, h:mm a')
    },
    {
      label: 'Tomorrow evening',
      icon: Moon,
      time: setMinutes(setHours(startOfTomorrow(), 18), 0),
      description: format(setMinutes(setHours(startOfTomorrow(), 18), 0), 'EEE, h:mm a')
    },
    {
      label: 'Next week',
      icon: Calendar,
      time: setMinutes(setHours(nextMonday(now), 9), 0),
      description: format(setMinutes(setHours(nextMonday(now), 9), 0), 'EEE, MMM d, h:mm a')
    }
  ]

  const handleCustomSnooze = () => {
    if (!customDate) return
    const [hours, minutes] = customTime.split(':').map(Number)
    const snoozeDate = setMinutes(setHours(new Date(customDate), hours), minutes)
    if (snoozeDate > now) {
      onSnooze(snoozeDate)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Snooze until...</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset options */}
        <div className="p-2">
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => onSnooze(preset.time)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <preset.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{preset.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

        {/* Custom date/time */}
        <div className="px-4 pb-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pick date & time</div>
          <div className="flex gap-2">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={format(now, 'yyyy-MM-dd')}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCustomSnooze}
            disabled={!customDate}
            className="w-full mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Set custom snooze
          </button>
        </div>
      </div>
    </div>
  )
}
