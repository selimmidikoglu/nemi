'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Brain,
  Sparkles,
  Tags,
  Bell,
  Shield,
  Zap,
  Mail,
  Eye,
  BarChart3,
  AtSign,
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Summaries',
    description:
      'Get instant, concise summaries of every email. Scan your inbox in seconds instead of minutes.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: Tags,
    title: 'Smart Categorization',
    description:
      'Emails automatically sorted into Work, Personal, Finance, Social, Promotions, Newsletters, and more.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: AtSign,
    title: '@Mention Detection',
    description:
      'Never miss when you\'re directly addressed. NEMI highlights emails where you\'re mentioned or requested.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Bell,
    title: 'Priority Notifications',
    description:
      'Smart notifications for what truly matters. Less noise, more signal. Stay focused on important emails.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Real-time sync with Gmail push notifications. Your inbox updates instantly, no manual refresh needed.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: BarChart3,
    title: 'Email Analytics',
    description:
      'Understand your email patterns. See which categories take your time and optimize your workflow.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Eye,
    title: 'Beautiful Email Cards',
    description:
      'Meetings, flights, packages, invoices - displayed as gorgeous, actionable cards. Not walls of text.',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description:
      'Your emails stay yours. We process data securely and never share it. Enterprise-grade security.',
    gradient: 'from-slate-500 to-zinc-500',
  },
]

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0]
  index: number
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

  const Icon = feature.icon

  return (
    <div
      ref={ref}
      className={`group relative bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 ${
        isVisible ? 'animate-fade-in opacity-100' : 'opacity-0'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Icon */}
      <div
        className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon size={24} className="text-white" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
        {feature.title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>

      {/* Hover Glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  )
}

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

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

    if (headerRef.current) {
      observer.observe(headerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="features" className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-16 ${
            isVisible ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Sparkles size={16} />
            <span className="text-sm font-medium">Powerful Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Everything You Need for{' '}
            <span className="gradient-text">Email Mastery</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            NEMI combines cutting-edge AI with thoughtful design to transform how you
            handle email. Work smarter, not harder.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className={`text-center mt-16 ${
            isVisible ? 'animate-fade-in delay-500' : 'opacity-0'
          }`}
        >
          <p className="text-muted-foreground mb-4">
            And many more features to discover...
          </p>
          <a
            href="/features"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Mail size={18} />
            Explore All Features
          </a>
        </div>
      </div>
    </section>
  )
}
