'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, Mail, Brain, Bell, BarChart3, TrendingUp } from 'lucide-react'

// Mock email data for the preview
const mockEmails = [
  {
    id: 1,
    from: 'Sarah Chen',
    companyLogo: 'S',
    companyColor: 'from-purple-500 to-indigo-500',
    summary: 'Q4 revenue up 23%. Board deck needs your approval before Thursday.',
    badges: [{ name: 'Work', color: 'bg-blue-500/20 text-blue-400' }, { name: 'Important', color: 'bg-red-500/20 text-red-400' }],
    isAboutMe: true,
  },
  {
    id: 2,
    from: 'GitHub',
    companyLogo: 'G',
    companyColor: 'from-gray-600 to-gray-800',
    summary: '@johndoe requested your review on PR #847: Add dark mode',
    badges: [{ name: 'GitHub', color: 'bg-gray-500/20 text-gray-400' }, { name: 'Code Review', color: 'bg-orange-500/20 text-orange-400' }],
    isAboutMe: true,
  },
  {
    id: 3,
    from: 'GitHub',
    companyLogo: 'G',
    companyColor: 'from-gray-600 to-gray-800',
    summary: 'You were mentioned in PR #912: @you Can you check this logic?',
    badges: [{ name: 'GitHub', color: 'bg-gray-500/20 text-gray-400' }],
    isAboutMe: true,
  },
  {
    id: 4,
    from: 'Chase Bank',
    companyLogo: 'C',
    companyColor: 'from-blue-600 to-blue-800',
    summary: 'November statement ready. Total spending: $4,230.',
    badges: [{ name: 'Finance', color: 'bg-green-500/20 text-green-400' }],
    isAboutMe: false,
  },
  {
    id: 5,
    from: 'Linear',
    companyLogo: 'L',
    companyColor: 'from-indigo-500 to-purple-600',
    summary: 'Weekly digest: 12 issues completed, velocity up 15%.',
    badges: [{ name: 'Newsletter', color: 'bg-purple-500/20 text-purple-400' }],
    isAboutMe: false,
  },
]

const emailAccounts = [
  { email: 'john@company.com', count: 18, active: true },
  { email: 'john.doe@gmail.com', count: 6, active: false },
]

const sidebarCategories = [
  { name: 'All Inbox', count: 24, active: true },
  { name: 'Work', count: 12, color: 'bg-blue-500' },
  { name: 'GitHub', count: 8, color: 'bg-gray-500' },
  { name: 'Finance', count: 5, color: 'bg-green-500' },
  { name: 'Newsletter', count: 3, color: 'bg-purple-500' },
]

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />

      {/* Animated Background Circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float delay-300" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-8 animate-fade-in">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-sm font-medium">AI-Powered Email Intelligence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in delay-100">
            Your Inbox,{' '}
            <span className="gradient-text">Reimagined</span>
            <br />
            with AI
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in delay-200">
            NEMI automatically categorizes, summarizes, and prioritizes your emails.
            Never miss what matters. Spend less time reading, more time doing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in delay-300">
            <Link
              href="/register"
              className="group flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg transition-all hover:shadow-xl hover:shadow-primary/25 hover:scale-105"
            >
              Start for Free
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#how-it-works"
              className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-8 py-4 rounded-full font-semibold text-lg transition-all"
            >
              See How It Works
            </Link>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in delay-400">
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-sm border border-border">
              <Mail size={18} className="text-primary" />
              <span className="text-sm font-medium">Smart Categorization</span>
            </div>
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-sm border border-border">
              <Brain size={18} className="text-primary" />
              <span className="text-sm font-medium">AI Summaries</span>
            </div>
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-sm border border-border">
              <Bell size={18} className="text-primary" />
              <span className="text-sm font-medium">@Mention Detection</span>
            </div>
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-sm border border-border">
              <BarChart3 size={18} className="text-primary" />
              <span className="text-sm font-medium">Email Analytics</span>
            </div>
          </div>

          {/* Hero Image/Mockup */}
          <div className="mt-16 relative animate-slide-up delay-500">
            <div className="relative mx-auto max-w-6xl">
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-2xl animate-pulse-glow" />

              {/* Mockup Container */}
              <div className="relative bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-background rounded-md px-3 py-1.5 text-xs text-muted-foreground text-center">
                      app.nemi.ai
                    </div>
                  </div>
                </div>

                {/* App Preview Content */}
                <div className="p-4 sm:p-6 bg-gradient-to-br from-background to-muted/30">
                  <div className="flex gap-4">
                    {/* Sidebar Preview */}
                    <div className="hidden md:block w-56 space-y-1 pr-4 border-r border-border">
                      {/* Email Accounts */}
                      <div className="mb-4">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-2">Accounts</p>
                        {emailAccounts.map((account) => (
                          <div
                            key={account.email}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs ${
                              account.active
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted/50'
                            }`}
                          >
                            <span className="truncate">{account.email}</span>
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{account.count}</span>
                          </div>
                        ))}
                      </div>

                      {/* Search */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg mb-4">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-xs text-muted-foreground">Search emails...</span>
                      </div>

                      {/* Categories */}
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-2">Categories</p>
                      {sidebarCategories.map((cat) => (
                        <div
                          key={cat.name}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            cat.active
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {cat.color && <div className={`w-2 h-2 rounded-full ${cat.color}`} />}
                            <span>{cat.name}</span>
                          </div>
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{cat.count}</span>
                        </div>
                      ))}

                      {/* Analytics Link */}
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer">
                          <BarChart3 size={14} />
                          <span>Analytics</span>
                        </div>
                      </div>
                    </div>

                    {/* Email List Preview */}
                    <div className="flex-1 min-w-0">
                      {/* Top Filter Badges */}
                      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                        <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full whitespace-nowrap">
                          All
                        </span>
                        <span className="px-3 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded-full whitespace-nowrap flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                          Important (2)
                        </span>
                        <span className="px-3 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full whitespace-nowrap">
                          @Mentions (3)
                        </span>
                        <span className="px-3 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full whitespace-nowrap">
                          Unread (8)
                        </span>
                      </div>

                      {/* Email Items */}
                      <div className="space-y-2">
                        {mockEmails.map((email, i) => (
                          <div
                            key={email.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                              i === 0
                                ? 'bg-primary/5 border-primary/30'
                                : 'bg-card/50 border-border hover:border-primary/20'
                            }`}
                          >
                            {/* Company Logo */}
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${email.companyColor} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                              {email.companyLogo}
                            </div>

                            {/* Sender Name */}
                            <span className="font-medium text-sm text-foreground whitespace-nowrap flex-shrink-0 w-20">
                              {email.from}
                            </span>

                            {/* @YOU Tag */}
                            {email.isAboutMe && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-500 rounded border border-yellow-500/30 flex-shrink-0">
                                @YOU
                              </span>
                            )}

                            {/* AI Summary */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <Sparkles size={12} className="text-violet-400 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground truncate">
                                {email.summary}
                              </p>
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {email.badges.map((badge) => (
                                <span
                                  key={badge.name}
                                  className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${badge.color}`}
                                >
                                  {badge.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Analytics Preview Panel */}
                    <div className="hidden lg:block w-64 pl-4 border-l border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={16} className="text-primary" />
                        <span className="text-sm font-semibold text-foreground">Quick Stats</span>
                      </div>

                      {/* Mini Stats */}
                      <div className="space-y-3 mb-4">
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Emails Today</p>
                          <p className="text-2xl font-bold text-foreground">24</p>
                          <div className="flex items-center gap-1 text-[10px] text-green-400">
                            <TrendingUp size={10} />
                            <span>12% from yesterday</span>
                          </div>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time Saved</p>
                          <p className="text-2xl font-bold text-primary">2.5h</p>
                          <p className="text-[10px] text-muted-foreground">with AI summaries</p>
                        </div>
                      </div>

                      {/* Mini Pie Chart Representation */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">By Category</p>
                        <div className="flex gap-2 items-center">
                          {/* Simple visual bars */}
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: '50%' }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">12</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-500" />
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-gray-500 rounded-full" style={{ width: '33%' }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">8</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: '20%' }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">5</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full" style={{ width: '12%' }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">3</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Activity Heatmap Preview */}
                      <div className="bg-muted/30 rounded-lg p-3 mt-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Activity</p>
                        <div className="grid grid-cols-7 gap-0.5">
                          {Array.from({ length: 28 }).map((_, i) => {
                            const intensity = Math.random()
                            return (
                              <div
                                key={i}
                                className="w-3 h-3 rounded-sm"
                                style={{
                                  backgroundColor: intensity < 0.2
                                    ? 'hsl(var(--muted))'
                                    : `rgba(139, 92, 246, ${0.2 + intensity * 0.6})`
                                }}
                              />
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center mt-2">Last 4 weeks</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-subtle">
        <div className="w-6 h-10 rounded-full border-2 border-foreground/20 flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  )
}
