'use client'

import { useState } from 'react'
import type { EmailAddress } from '@/types'

interface EmailAddressTooltipProps {
  label: string
  addresses: EmailAddress[] | string
  className?: string
  showLabel?: boolean
}

export default function EmailAddressTooltip({
  label,
  addresses,
  className = '',
  showLabel = true
}: EmailAddressTooltipProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Convert string to EmailAddress array format
  const addressList: EmailAddress[] = typeof addresses === 'string'
    ? [{ email: addresses, name: undefined }]
    : addresses

  if (!addressList || addressList.length === 0) return null

  const displayText = addressList.length === 1
    ? addressList[0].name || addressList[0].email
    : `${addressList.length} recipients`

  return (
    <div className="relative inline-block">
      <span
        className={`cursor-help hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showLabel && `${label}: `}
        {displayText}
      </span>

      {isHovered && (
        <div className="absolute z-50 left-0 top-full mt-2 min-w-[250px] max-w-[400px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            {label}
          </div>
          <div className="space-y-2">
            {addressList.map((addr, idx) => (
              <div
                key={idx}
                className="flex flex-col text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 pb-2 last:pb-0"
              >
                {addr.name && (
                  <span className="font-medium text-gray-900 dark:text-white">
                    {addr.name}
                  </span>
                )}
                <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                  {addr.email}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
