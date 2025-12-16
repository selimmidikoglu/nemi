'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore, useEmailAccountStore } from '@/lib/store'
import { format } from 'date-fns'
import ProviderDropdown, { EmailProvider } from '@/components/ProviderDropdown'

export default function AccountsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()
  const { accounts, isLoading, fetchAccounts, addAccount, removeAccount, syncAccount } =
    useEmailAccountStore()

  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    provider: 'gmail' as 'gmail' | 'outlook' | 'imap',
    email: '',
    password: '',
    imapHost: '',
    imapPort: 993,
  })
  const [error, setError] = useState('')

  // Handle Gmail OAuth redirect
  const handleGmailOAuth = () => {
    const userId = useAuthStore.getState().user?.id
    if (userId) {
      window.location.href = `http://localhost:3000/api/auth/gmail/authorize?userId=${userId}`
    } else {
      setError('User not authenticated')
    }
  }

  // Handle Outlook OAuth redirect
  const handleOutlookOAuth = () => {
    const userId = useAuthStore.getState().user?.id
    if (userId) {
      window.location.href = `http://localhost:3000/api/auth/outlook/authorize?userId=${userId}`
    } else {
      setError('User not authenticated')
    }
  }

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    } else if (isAuthenticated) {
      fetchAccounts()
    }
  }, [isAuthenticated, authLoading, router, fetchAccounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const data: any = {
        provider: formData.provider,
        email: formData.email,
      }

      if (formData.provider === 'imap') {
        data.password = formData.password
        data.imapHost = formData.imapHost
        data.imapPort = formData.imapPort
      } else {
        // For Gmail and Outlook, OAuth should be used in production
        // For now, we'll use password (this should be replaced with OAuth flow)
        data.password = formData.password
      }

      await addAccount(data)
      setShowAddForm(false)
      setFormData({
        provider: 'gmail',
        email: '',
        password: '',
        imapHost: '',
        imapPort: 993,
      })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add account')
    }
  }

  const handleRemove = async (id: string) => {
    if (confirm('Are you sure you want to remove this account?')) {
      try {
        await removeAccount(id)
      } catch (err) {
        alert('Failed to remove account')
      }
    }
  }

  const handleSync = async (id: string) => {
    try {
      await syncAccount(id)
      alert('Sync started successfully')
    } catch (err) {
      alert('Failed to sync account')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/feed')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <Link href="/feed" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/Nemi-logo.png"
                alt="NEMI Logo"
                width={32}
                height={32}
                className="rounded"
                priority
              />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Accounts</h1>
            </Link>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            Add Account
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No email accounts
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add your first email account to start managing your emails with AI
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              Add Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts && Array.isArray(accounts) && accounts.map((account) => (
              <div
                key={account.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {account.email}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          account.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full capitalize">
                        {account.provider}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Last synced:{' '}
                      {account.lastSyncAt
                        ? format(new Date(account.lastSyncAt), 'PPpp')
                        : 'Never'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {account.provider === 'gmail' && (
                      <button
                        onClick={handleGmailOAuth}
                        className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reconnect
                      </button>
                    )}
                    {account.provider === 'outlook' && (
                      <button
                        onClick={handleOutlookOAuth}
                        className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reconnect
                      </button>
                    )}
                    <button
                      onClick={() => handleSync(account.id)}
                      className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Sync
                    </button>
                    <button
                      onClick={() => handleRemove(account.id)}
                      className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Add Email Account
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provider
                </label>
                <ProviderDropdown
                  value={formData.provider}
                  onChange={(provider: EmailProvider) =>
                    setFormData({ ...formData, provider: provider.id as any })
                  }
                />
              </div>

              {/* Gmail OAuth Flow */}
              {formData.provider === 'gmail' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Connect your Gmail account securely using Google OAuth. No password required.
                    </p>
                    <button
                      type="button"
                      onClick={handleGmailOAuth}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Connect with Google
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Outlook OAuth Flow */}
              {formData.provider === 'outlook' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Connect your Outlook account securely using Microsoft OAuth. No password required.
                    </p>
                    <button
                      type="button"
                      onClick={handleOutlookOAuth}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 11H0V0H11V11Z" fill="#F25022"/>
                        <path d="M23 11H12V0H23V11Z" fill="#7FBA00"/>
                        <path d="M11 23H0V12H11V23Z" fill="#00A4EF"/>
                        <path d="M23 23H12V12H23V23Z" fill="#FFB900"/>
                      </svg>
                      <span className="font-medium text-gray-900 dark:text-white">
                        Connect with Microsoft
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* IMAP Configuration */}
              {formData.provider !== 'gmail' && formData.provider !== 'outlook' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password / App Password
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>

                  {formData.provider === 'imap' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          IMAP Host
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.imapHost}
                          onChange={(e) =>
                            setFormData({ ...formData, imapHost: e.target.value })
                          }
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="imap.example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          IMAP Port
                        </label>
                        <input
                          type="number"
                          required
                          value={formData.imapPort}
                          onChange={(e) =>
                            setFormData({ ...formData, imapPort: parseInt(e.target.value) })
                          }
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="993"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                    >
                      Add Account
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
