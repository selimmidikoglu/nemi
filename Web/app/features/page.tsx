'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Brain,
  Tags,
  AtSign,
  Bell,
  Zap,
  BarChart3,
  Eye,
  Shield,
  Mail,
  Sparkles,
  Search,
  Inbox,
  Star,
  Clock,
  Filter,
  Smartphone,
  Check,
} from 'lucide-react'
import { LandingNav, Footer } from '@/components/landing'

const mainFeatures = [
  {
    icon: Brain,
    title: 'AI-Powered Summaries',
    description:
      'Every email gets an instant, concise summary. Scan hundreds of emails in minutes. Our AI understands context, extracts key points, and presents them beautifully.',
    color: 'from-violet-500 to-purple-500',
    benefits: [
      'Ultra-concise 60-character summaries',
      'Context-aware extraction',
      'Works in any language',
      'Improves over time',
    ],
  },
  {
    icon: Tags,
    title: 'Smart Categorization',
    description:
      'Emails automatically sorted into intelligent categories. Work, Personal, Finance, Social, Promotions, Newsletters - perfectly organized without lifting a finger.',
    color: 'from-blue-500 to-cyan-500',
    benefits: [
      '8+ automatic categories',
      'Custom badge creation',
      'Priority-based sorting',
      'Zero manual tagging',
    ],
  },
  {
    icon: AtSign,
    title: '@Mention Detection',
    description:
      "Never miss when you're directly addressed. NEMI highlights emails where you're mentioned, requested, or need to take action. Stay responsive effortlessly.",
    color: 'from-pink-500 to-rose-500',
    benefits: [
      'Automatic mention detection',
      'Context-aware flagging',
      '"@YOU" visual badge',
      'Action item extraction',
    ],
  },
  {
    icon: Bell,
    title: 'Priority Notifications',
    description:
      'Smart notifications that respect your focus. Only get alerted for what truly matters. Configure by category, sender, or importance level.',
    color: 'from-amber-500 to-orange-500',
    benefits: [
      'Importance-based alerts',
      'Category filtering',
      'Quiet hours support',
      'Desktop notifications',
    ],
  },
  {
    icon: Eye,
    title: 'Beautiful Email Cards',
    description:
      'Meetings, flights, packages, invoices - rendered as gorgeous, actionable cards. Not walls of text. Click to add to calendar or track your delivery.',
    color: 'from-teal-500 to-cyan-500',
    benefits: [
      'Meeting invites with join buttons',
      'Flight/boarding passes',
      'Package tracking cards',
      'Invoice summaries',
    ],
  },
  {
    icon: BarChart3,
    title: 'Email Analytics',
    description:
      'Understand your email patterns. See which categories consume your time, track response rates, and optimize your communication workflow.',
    color: 'from-indigo-500 to-violet-500',
    benefits: [
      'Time per category breakdown',
      'Activity heatmaps',
      'Badge engagement metrics',
      'Productivity insights',
    ],
  },
]

const additionalFeatures = [
  { icon: Search, title: 'Powerful Search', description: 'Find any email instantly with full-text search' },
  { icon: Inbox, title: 'Unified Inbox', description: 'All your accounts in one beautiful interface' },
  { icon: Star, title: 'Smart Starring', description: 'AI suggests which emails to star' },
  { icon: Clock, title: 'Snooze & Remind', description: 'Bring back emails when you need them' },
  { icon: Filter, title: 'Advanced Filters', description: 'Create rules to automate organization' },
  { icon: Smartphone, title: 'Mobile Ready', description: 'Native apps for iOS (Android coming soon)' },
  { icon: Zap, title: 'Real-time Sync', description: 'Gmail push notifications for instant updates' },
  { icon: Shield, title: 'Enterprise Security', description: 'SOC 2 compliant, encrypted at rest' },
]

function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'animate-fade-in opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default function FeaturesPage() {
  return (
    <main className="min-h-screen">
      <LandingNav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float delay-300" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 animate-fade-in">
            <Sparkles size={16} />
            <span className="text-sm font-medium">All Features</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 animate-fade-in delay-100">
            Powerful Features for{' '}
            <span className="gradient-text">Modern Email</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in delay-200">
            Everything you need to conquer your inbox. AI-powered intelligence meets
            beautiful design.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in delay-300">
            <Link
              href="/register"
              className="group flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg transition-all hover:shadow-xl hover:shadow-primary/25"
            >
              Get Started Free
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {mainFeatures.map((feature, index) => {
              const Icon = feature.icon
              const isEven = index % 2 === 0

              return (
                <AnimatedSection key={feature.title}>
                  <div
                    className={`grid md:grid-cols-2 gap-12 items-center ${
                      isEven ? '' : 'md:flex-row-reverse'
                    }`}
                  >
                    {/* Content */}
                    <div className={isEven ? '' : 'md:order-2'}>
                      <div
                        className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}
                      >
                        <Icon size={28} className="text-white" />
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        {feature.title}
                      </h2>
                      <p className="text-lg text-muted-foreground mb-6">
                        {feature.description}
                      </p>
                      <ul className="space-y-3">
                        {feature.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-center gap-3">
                            <Check size={18} className="text-green-500 flex-shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Visual */}
                    <div className={isEven ? '' : 'md:order-1'}>
                      <div className="relative">
                        <div
                          className={`absolute -inset-4 bg-gradient-to-r ${feature.color} opacity-20 rounded-2xl blur-xl`}
                        />
                        <div className="relative bg-card rounded-2xl border border-border p-6 shadow-xl">
                          {/* Feature Preview Placeholder */}
                          <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
                            <Icon size={64} className="text-muted-foreground/30" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              And <span className="gradient-text">Much More</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every detail has been considered to make your email experience perfect.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <AnimatedSection
                  key={feature.title}
                  className={`delay-${(index % 4) * 100}`}
                >
                  <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-all duration-300 h-full">
                    <Icon size={24} className="text-primary mb-3" />
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="bg-card rounded-2xl border border-border p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Works With Your{' '}
                    <span className="gradient-text">Favorite Tools</span>
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Connect your existing email accounts and tools. NEMI integrates
                    seamlessly with the services you already use.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {['Gmail', 'Outlook', 'IMAP', 'Calendar'].map((service) => (
                      <div
                        key={service}
                        className="px-4 py-2 bg-muted rounded-lg text-sm font-medium"
                      >
                        {service}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl" />
                    <div className="relative w-full h-full bg-card rounded-full border border-border flex items-center justify-center">
                      <Mail size={64} className="text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to Transform Your{' '}
              <span className="gradient-text">Inbox?</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Start free and experience all these features for yourself.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg transition-all hover:shadow-xl hover:shadow-primary/25"
              >
                <Sparkles size={20} />
                Get Started Free
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-2 text-foreground/70 hover:text-foreground px-8 py-4 font-medium transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </main>
  )
}
