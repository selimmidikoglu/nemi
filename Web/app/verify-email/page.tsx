'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, XCircle, Mail, RefreshCw, ArrowRight } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuthStore } from '@/lib/store'
import { apiService } from '@/lib/api'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const message = searchParams.get('message')
  const token = searchParams.get('token')

  const { isAuthenticated, user } = useAuthStore()
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // If we have a token in the URL, redirect to backend to process it
  useEffect(() => {
    if (token) {
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`
    }
  }, [token])

  const handleResendVerification = async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    setIsResending(true)
    setResendMessage(null)

    try {
      await apiService.resendVerificationEmail()
      setResendMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' })
    } catch (error: any) {
      setResendMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to send verification email'
      })
    } finally {
      setIsResending(false)
    }
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="relative w-12 h-12">
            <Image
              src="/Nemi-logo.png"
              alt="NEMI"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-3xl font-bold gradient-text">NEMI</span>
        </Link>

        {/* Success Card */}
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="relative">
            {/* Animated background circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-green-500/20 rounded-full blur-xl animate-pulse" />
            </div>

            <div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-xl">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 size={48} className="text-green-500" />
              </div>

              <h1 className="text-2xl font-bold mb-3">Email Verified!</h1>
              <p className="text-muted-foreground mb-8">
                Your email has been successfully verified. You can now access all features of NEMI.
              </p>

              <Link
                href="/feed"
                className="inline-flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all hover:shadow-lg hover:shadow-primary/25"
              >
                Go to Inbox
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="relative w-12 h-12">
            <Image
              src="/Nemi-logo.png"
              alt="NEMI"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-3xl font-bold gradient-text">NEMI</span>
        </Link>

        {/* Error Card */}
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="relative">
            {/* Animated background circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-destructive/20 rounded-full blur-xl animate-pulse" />
            </div>

            <div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-xl">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle size={48} className="text-destructive" />
              </div>

              <h1 className="text-2xl font-bold mb-3">Verification Failed</h1>
              <p className="text-muted-foreground mb-6">
                {message ? decodeURIComponent(message) : 'The verification link is invalid or has expired.'}
              </p>

              {resendMessage && (
                <div className={`mb-6 p-4 rounded-lg ${
                  resendMessage.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                }`}>
                  {resendMessage.text}
                </div>
              )}

              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="inline-flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Resend Verification Email
                  </>
                )}
              </button>

              <p className="mt-6 text-sm text-muted-foreground">
                Need help?{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  Contact Support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default state - waiting for verification or showing pending status
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="relative w-12 h-12">
          <Image
            src="/Nemi-logo.png"
            alt="NEMI"
            fill
            className="object-contain"
          />
        </div>
        <span className="text-3xl font-bold gradient-text">NEMI</span>
      </Link>

      {/* Pending Card */}
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="relative">
          {/* Animated background circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-primary/20 rounded-full blur-xl animate-pulse" />
          </div>

          <div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail size={48} className="text-primary animate-bounce" />
            </div>

            <h1 className="text-2xl font-bold mb-3">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              We&apos;ve sent a verification link to your email address.
              Click the link in the email to verify your account.
            </p>

            {/* Instructions */}
            <div className="text-left bg-muted/30 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium mb-2">Didn&apos;t receive the email?</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Make sure your email address is correct</li>
                <li>Wait a few minutes and try again</li>
              </ul>
            </div>

            {resendMessage && (
              <div className={`mb-6 p-4 rounded-lg ${
                resendMessage.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                  : 'bg-destructive/10 border border-destructive/20 text-destructive'
              }`}>
                {resendMessage.text}
              </div>
            )}

            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="inline-flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 mb-4"
            >
              {isResending ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Resend Verification Email
                </>
              )}
            </button>

            <Link
              href="/feed"
              className="inline-flex items-center justify-center gap-2 w-full border border-border hover:bg-muted/50 font-medium py-3 px-6 rounded-lg transition-all"
            >
              Continue to Inbox
              <ArrowRight size={18} />
            </Link>

            <p className="mt-6 text-xs text-muted-foreground">
              You can still use NEMI while waiting for verification, but some features may be limited.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
