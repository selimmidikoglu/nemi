'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/lib/store'

interface AppHeaderProps {
  showBackButton?: boolean
  onBackClick?: () => void
  title?: string
  rightContent?: React.ReactNode
}

export default function AppHeader({ showBackButton, onBackClick, title, rightContent }: AppHeaderProps) {
  const { user } = useAuthStore()

  return (
    <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && onBackClick && (
            <button
              onClick={onBackClick}
              className="text-foreground hover:text-foreground/80"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <Link href="/feed" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/main-logo.png"
              alt="NEMI Logo"
              width={32}
              height={32}
              className="rounded"
              priority
            />
            {title && <h1 className="text-2xl font-bold text-foreground">{title}</h1>}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {rightContent}
          {user && (
            <span className="text-sm text-muted-foreground">
              {typeof user.email === 'string' ? user.email : (user.email as any)?.email || user.name || 'User'}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
