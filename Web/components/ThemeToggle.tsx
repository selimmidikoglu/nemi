'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

// Simple icon toggle for navbar/header use
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-muted/50 w-9 h-9" />
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun size={18} className="text-foreground" />
      ) : (
        <Moon size={18} className="text-foreground" />
      )}
    </button>
  )
}

// Full settings panel version for settings page
export function ThemeSettings() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
        <div>
          <h3 className="font-medium text-foreground">Appearance</h3>
          <p className="text-sm text-muted-foreground">Choose your theme preference</p>
        </div>
        <div className="w-32 h-10 bg-muted rounded-md animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
      <div>
        <h3 className="font-medium text-foreground">Appearance</h3>
        <p className="text-sm text-muted-foreground">Choose your theme preference</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setTheme('light')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            theme === 'light'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Light
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Dark
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            theme === 'system'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          System
        </button>
      </div>
    </div>
  )
}
