'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

interface EmailHtmlCardProps {
  htmlContent: string
  className?: string
}

// Light mode Tailwind color mappings
const lightColors: Record<string, string> = {
  // Backgrounds
  'bg-blue-50': '#eff6ff', 'bg-blue-100': '#dbeafe', 'bg-blue-500': '#3b82f6', 'bg-blue-600': '#2563eb', 'bg-blue-700': '#1d4ed8',
  'bg-indigo-50': '#eef2ff', 'bg-indigo-100': '#e0e7ff', 'bg-indigo-500': '#6366f1', 'bg-indigo-600': '#4f46e5', 'bg-indigo-700': '#4338ca', 'bg-indigo-800': '#3730a3',
  'bg-purple-50': '#faf5ff', 'bg-purple-100': '#f3e8ff', 'bg-purple-500': '#a855f7', 'bg-purple-600': '#9333ea', 'bg-purple-700': '#7e22ce',
  'bg-green-50': '#f0fdf4', 'bg-green-100': '#dcfce7', 'bg-green-500': '#22c55e', 'bg-green-600': '#16a34a', 'bg-green-700': '#15803d',
  'bg-red-50': '#fef2f2', 'bg-red-100': '#fee2e2', 'bg-red-500': '#ef4444', 'bg-red-600': '#dc2626', 'bg-red-700': '#b91c1c',
  'bg-amber-50': '#fffbeb', 'bg-amber-100': '#fef3c7', 'bg-amber-500': '#f59e0b', 'bg-amber-600': '#d97706', 'bg-amber-700': '#b45309',
  'bg-orange-50': '#fff7ed', 'bg-orange-100': '#ffedd5', 'bg-orange-500': '#f97316', 'bg-orange-600': '#ea580c', 'bg-orange-700': '#c2410c',
  'bg-pink-50': '#fdf2f8', 'bg-pink-100': '#fce7f3', 'bg-pink-500': '#ec4899', 'bg-pink-600': '#db2777', 'bg-pink-700': '#be185d',
  'bg-sky-50': '#f0f9ff', 'bg-sky-100': '#e0f2fe', 'bg-sky-500': '#0ea5e9', 'bg-sky-600': '#0284c7',
  'bg-gray-50': '#f9fafb', 'bg-gray-100': '#f3f4f6', 'bg-gray-200': '#e5e7eb', 'bg-gray-600': '#4b5563', 'bg-gray-700': '#374151', 'bg-gray-800': '#1f2937',
  'bg-white': '#ffffff',
  // Text colors
  'text-white': '#ffffff', 'text-black': '#000000',
  'text-gray-900': '#111827', 'text-gray-800': '#1f2937', 'text-gray-700': '#374151', 'text-gray-600': '#4b5563', 'text-gray-500': '#6b7280', 'text-gray-400': '#9ca3af', 'text-gray-300': '#d1d5db', 'text-gray-200': '#e5e7eb', 'text-gray-100': '#f3f4f6',
  'text-red-600': '#dc2626', 'text-red-400': '#f87171',
  'text-amber-600': '#d97706', 'text-amber-400': '#fbbf24',
  'text-indigo-700': '#4338ca', 'text-indigo-300': '#a5b4fc',
  // Borders
  'border-gray-200': '#e5e7eb', 'border-gray-300': '#d1d5db', 'border-gray-500': '#6b7280', 'border-gray-600': '#4b5563',
  'border-blue-200': '#bfdbfe', 'border-blue-300': '#93c5fd', 'border-blue-700': '#1d4ed8',
  'border-indigo-200': '#c7d2fe', 'border-indigo-300': '#a5b4fc', 'border-indigo-700': '#4338ca',
  'border-purple-200': '#e9d5ff', 'border-purple-300': '#d8b4fe', 'border-purple-700': '#7e22ce',
  'border-green-200': '#bbf7d0', 'border-green-300': '#86efac', 'border-green-700': '#15803d',
  'border-red-200': '#fecaca', 'border-red-300': '#fca5a5', 'border-red-700': '#b91c1c',
  'border-amber-200': '#fde68a', 'border-amber-300': '#fcd34d', 'border-amber-700': '#b45309',
  'border-pink-200': '#fbcfe8', 'border-pink-300': '#f9a8d4', 'border-pink-700': '#be185d',
}

// Dark mode Tailwind color mappings - converts light backgrounds to dark equivalents
const darkColors: Record<string, string> = {
  // Light backgrounds become dark backgrounds
  'bg-blue-50': '#1e3a5f', 'bg-blue-100': '#1e3a5f', 'bg-blue-500': '#3b82f6', 'bg-blue-600': '#2563eb', 'bg-blue-700': '#1d4ed8',
  'bg-indigo-50': '#1e1b4b', 'bg-indigo-100': '#1e1b4b', 'bg-indigo-500': '#6366f1', 'bg-indigo-600': '#4f46e5', 'bg-indigo-700': '#4338ca', 'bg-indigo-800': '#3730a3',
  'bg-purple-50': '#2e1065', 'bg-purple-100': '#2e1065', 'bg-purple-500': '#a855f7', 'bg-purple-600': '#9333ea', 'bg-purple-700': '#7e22ce',
  'bg-green-50': '#14532d', 'bg-green-100': '#14532d', 'bg-green-500': '#22c55e', 'bg-green-600': '#16a34a', 'bg-green-700': '#15803d',
  'bg-red-50': '#450a0a', 'bg-red-100': '#450a0a', 'bg-red-500': '#ef4444', 'bg-red-600': '#dc2626', 'bg-red-700': '#b91c1c',
  'bg-amber-50': '#451a03', 'bg-amber-100': '#451a03', 'bg-amber-500': '#f59e0b', 'bg-amber-600': '#d97706', 'bg-amber-700': '#b45309',
  'bg-orange-50': '#431407', 'bg-orange-100': '#431407', 'bg-orange-500': '#f97316', 'bg-orange-600': '#ea580c', 'bg-orange-700': '#c2410c',
  'bg-pink-50': '#500724', 'bg-pink-100': '#500724', 'bg-pink-500': '#ec4899', 'bg-pink-600': '#db2777', 'bg-pink-700': '#be185d',
  'bg-sky-50': '#082f49', 'bg-sky-100': '#082f49', 'bg-sky-500': '#0ea5e9', 'bg-sky-600': '#0284c7',
  'bg-gray-50': '#1f2937', 'bg-gray-100': '#1f2937', 'bg-gray-200': '#374151', 'bg-gray-600': '#4b5563', 'bg-gray-700': '#374151', 'bg-gray-800': '#1f2937',
  'bg-white': '#1f2937',
  // Text colors - invert dark/light
  'text-white': '#ffffff', 'text-black': '#f9fafb',
  'text-gray-900': '#f9fafb', 'text-gray-800': '#f3f4f6', 'text-gray-700': '#e5e7eb', 'text-gray-600': '#d1d5db', 'text-gray-500': '#9ca3af', 'text-gray-400': '#9ca3af', 'text-gray-300': '#d1d5db', 'text-gray-200': '#e5e7eb', 'text-gray-100': '#f3f4f6',
  'text-red-600': '#f87171', 'text-red-400': '#f87171',
  'text-amber-600': '#fbbf24', 'text-amber-400': '#fbbf24',
  'text-indigo-700': '#a5b4fc', 'text-indigo-300': '#a5b4fc',
  // Borders - darker versions
  'border-gray-200': '#374151', 'border-gray-300': '#4b5563', 'border-gray-500': '#6b7280', 'border-gray-600': '#4b5563',
  'border-blue-200': '#1e40af', 'border-blue-300': '#1d4ed8', 'border-blue-700': '#1d4ed8',
  'border-indigo-200': '#3730a3', 'border-indigo-300': '#4338ca', 'border-indigo-700': '#4338ca',
  'border-purple-200': '#581c87', 'border-purple-300': '#6b21a8', 'border-purple-700': '#7e22ce',
  'border-green-200': '#166534', 'border-green-300': '#15803d', 'border-green-700': '#15803d',
  'border-red-200': '#991b1b', 'border-red-300': '#b91c1c', 'border-red-700': '#b91c1c',
  'border-amber-200': '#92400e', 'border-amber-300': '#b45309', 'border-amber-700': '#b45309',
  'border-pink-200': '#9d174d', 'border-pink-300': '#be185d', 'border-pink-700': '#be185d',
}

// Convert Tailwind classes to inline styles
function convertTailwindToInline(html: string, isDark: boolean): string {
  let result = html
  // Pick the right color map based on theme
  const colorMap = isDark ? darkColors : lightColors

  // Process each element with class attribute
  result = result.replace(/class="([^"]*)"/g, (match, classes) => {
    const classList = classes.split(' ')
    const styles: string[] = []
    const remainingClasses: string[] = []

    for (const cls of classList) {
      // Skip dark: prefixed classes - we handle theme conversion ourselves
      if (cls.startsWith('dark:')) {
        continue
      }

      // Convert known Tailwind color classes to inline styles using the theme-appropriate map
      if (colorMap[cls]) {
        const prop = cls.startsWith('bg-') ? 'background-color' :
                    cls.startsWith('text-') ? 'color' :
                    cls.startsWith('border-') ? 'border-color' : null
        if (prop) styles.push(`${prop}: ${colorMap[cls]}`)
      }

      // Layout and spacing classes - convert to inline
      if (cls === 'flex') styles.push('display: flex')
      if (cls === 'items-center') styles.push('align-items: center')
      if (cls === 'gap-2') styles.push('gap: 0.5rem')
      if (cls === 'flex-1') styles.push('flex: 1 1 0%')
      if (cls === 'min-w-0') styles.push('min-width: 0')
      if (cls === 'truncate') styles.push('overflow: hidden; text-overflow: ellipsis; white-space: nowrap')
      if (cls === 'whitespace-nowrap') styles.push('white-space: nowrap')
      if (cls === 'overflow-hidden') styles.push('overflow: hidden')
      if (cls === 'p-2') styles.push('padding: 0.5rem')
      if (cls === 'px-2') styles.push('padding-left: 0.5rem; padding-right: 0.5rem')
      if (cls === 'px-3') styles.push('padding-left: 0.75rem; padding-right: 0.75rem')
      if (cls === 'py-1') styles.push('padding-top: 0.25rem; padding-bottom: 0.25rem')
      if (cls === 'rounded') styles.push('border-radius: 0.25rem')
      if (cls === 'rounded-lg') styles.push('border-radius: 0.5rem')
      if (cls === 'border') styles.push('border-width: 1px; border-style: solid')
      if (cls === 'text-xs') styles.push('font-size: 0.75rem; line-height: 1rem')
      if (cls === 'text-lg') styles.push('font-size: 1.125rem; line-height: 1.75rem')
      if (cls.startsWith('text-[')) {
        const size = cls.match(/text-\[([^\]]+)\]/)?.[1]
        if (size) styles.push(`font-size: ${size}`)
      }
      if (cls === 'font-semibold') styles.push('font-weight: 600')
      if (cls === 'font-bold') styles.push('font-weight: 700')
      if (cls === 'font-medium') styles.push('font-weight: 500')
      if (cls === 'font-mono') styles.push('font-family: ui-monospace, monospace')

      remainingClasses.push(cls)
    }

    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
    return `class="${remainingClasses.join(' ')}"${styleAttr}`
  })

  return result
}

/**
 * EmailHtmlCard - Renders AI-generated HTML snippets with theme support
 *
 * Used for special email types like:
 * - Meeting invitations (calendar cards)
 * - Flight/boarding passes
 * - Package tracking
 * - GitHub PRs
 * - Invoices/bills
 *
 * Automatically adapts colors for dark/light themes by replacing
 * hardcoded Tailwind classes with theme-appropriate equivalents.
 */
export default function EmailHtmlCard({ htmlContent, className = '' }: EmailHtmlCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!containerRef.current) return

    const isDark = resolvedTheme === 'dark'

    // Convert Tailwind classes to inline styles (Tailwind doesn't see dynamically injected HTML)
    const processedHtml = convertTailwindToInline(htmlContent, isDark)

    // Wrap in a div for styling
    containerRef.current.innerHTML = `<div class="email-html-content">${processedHtml}</div>`
  }, [htmlContent, resolvedTheme])

  const isDark = resolvedTheme === 'dark'

  return (
    <div
      ref={containerRef}
      className={`email-html-card ${className}`}
      style={{
        // Simplified styling - no extra box in dark mode, subtle in light mode
        backgroundColor: isDark ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
        padding: isDark ? '0' : '6px',
        borderRadius: '6px',
        border: isDark ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
      }}
      onClick={(e) => {
        // Handle link clicks in a safe way
        const target = e.target as HTMLElement
        if (target.tagName === 'A') {
          e.preventDefault()
          const href = target.getAttribute('href')
          if (href) {
            window.open(href, '_blank', 'noopener,noreferrer')
          }
        }
      }}
    />
  )
}
