'use client'

import { useState, useRef, useEffect } from 'react'

export interface EmailProvider {
  id: string
  name: string
  logo: string
  description: string
}

export const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    logo: 'https://www.google.com/favicon.ico',
    description: 'Google Mail'
  },
  {
    id: 'outlook',
    name: 'Outlook',
    logo: 'https://outlook.live.com/favicon.ico',
    description: 'Microsoft Outlook'
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    logo: '💌',
    description: 'Yahoo'
  },
  {
    id: 'icloud',
    name: 'iCloud Mail',
    logo: '☁️',
    description: 'Apple iCloud'
  },
  {
    id: 'protonmail',
    name: 'ProtonMail',
    logo: '🔒',
    description: 'Secure Email'
  },
  {
    id: 'zoho',
    name: 'Zoho Mail',
    logo: '💼',
    description: 'Zoho'
  },
  {
    id: 'aol',
    name: 'AOL Mail',
    logo: '📮',
    description: 'AOL'
  },
  {
    id: 'fastmail',
    name: 'FastMail',
    logo: '⚡',
    description: 'FastMail'
  },
  {
    id: 'gmx',
    name: 'GMX Mail',
    logo: '📬',
    description: 'GMX'
  },
  {
    id: 'mailcom',
    name: 'Mail.com',
    logo: '✉️',
    description: 'Mail.com'
  },
  {
    id: 'yandex',
    name: 'Yandex Mail',
    logo: '📪',
    description: 'Yandex'
  },
  {
    id: 'tutanota',
    name: 'Tutanota',
    logo: '🛡️',
    description: 'Secure Email'
  },
  {
    id: 'imap',
    name: 'Custom IMAP',
    logo: '🔧',
    description: 'Other Provider'
  }
]

interface ProviderDropdownProps {
  value: string
  onChange: (provider: EmailProvider) => void
}

export default function ProviderDropdown({ value, onChange }: ProviderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedProvider = EMAIL_PROVIDERS.find(p => p.id === value) || EMAIL_PROVIDERS[0]

  const filteredProviders = searchQuery
    ? EMAIL_PROVIDERS.filter(provider =>
        provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : EMAIL_PROVIDERS

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (provider: EmailProvider) => {
    onChange(provider)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Provider Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-card border border-border rounded-lg text-left flex items-center justify-between hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-3">
          {selectedProvider.logo.startsWith('http') ? (
            <img src={selectedProvider.logo} alt={selectedProvider.name} className="w-7 h-7" />
          ) : (
            <span className="text-2xl">{selectedProvider.logo}</span>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{selectedProvider.name}</p>
            <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg max-h-[400px] overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-border sticky top-0 bg-card">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Provider List */}
          <div className="overflow-y-auto max-h-[320px]">
            {filteredProviders.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No providers found
              </div>
            ) : (
              filteredProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleSelect(provider)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors ${
                    provider.id === value ? 'bg-primary/10' : ''
                  }`}
                >
                  {provider.logo.startsWith('http') ? (
                    <img src={provider.logo} alt={provider.name} className="w-7 h-7" />
                  ) : (
                    <span className="text-2xl">{provider.logo}</span>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{provider.name}</p>
                    <p className="text-xs text-muted-foreground">{provider.description}</p>
                  </div>
                  {provider.id === value && (
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="p-3 border-t border-border bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              Can&apos;t find your provider? Select &quot;Custom IMAP&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
