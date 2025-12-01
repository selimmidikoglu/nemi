'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Sparkles, Zap, Building } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Free',
    description: 'Perfect for trying out NEMI',
    price: '$0',
    period: 'forever',
    icon: Sparkles,
    color: 'from-slate-500 to-zinc-500',
    features: [
      '1 email account',
      'AI summaries',
      'Smart categorization',
      '100 emails/month processing',
      'Basic notifications',
      'Web access',
    ],
    cta: 'Get Started Free',
    ctaLink: '/register',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For professionals who value their time',
    price: '$9',
    period: '/month',
    icon: Zap,
    color: 'from-violet-500 to-purple-500',
    features: [
      'Unlimited email accounts',
      'Advanced AI summaries',
      '@Mention detection',
      'Unlimited email processing',
      'Priority notifications',
      'Email analytics',
      'Beautiful email cards',
      'Priority support',
    ],
    cta: 'Start Pro Trial',
    ctaLink: '/register?plan=pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For teams and organizations',
    price: 'Custom',
    period: '',
    icon: Building,
    color: 'from-blue-500 to-cyan-500',
    features: [
      'Everything in Pro',
      'Team management',
      'Shared badges & rules',
      'SSO / SAML',
      'Custom AI training',
      'API access',
      'Dedicated support',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact',
    popular: false,
  },
]

function PricingCard({
  plan,
  index,
}: {
  plan: (typeof plans)[0]
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

  const Icon = plan.icon

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-700 ${
        isVisible ? 'animate-fade-in opacity-100' : 'opacity-0'
      }`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium px-4 py-1 rounded-full shadow-lg">
            Most Popular
          </div>
        </div>
      )}

      <div
        className={`relative h-full bg-card rounded-2xl border transition-all duration-300 hover:shadow-xl ${
          plan.popular
            ? 'border-primary shadow-lg shadow-primary/10 scale-105'
            : 'border-border hover:border-primary/30'
        }`}
      >
        {/* Gradient Glow for Popular */}
        {plan.popular && (
          <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl blur-lg -z-10" />
        )}

        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`p-2.5 rounded-xl bg-gradient-to-br ${plan.color}`}
            >
              <Icon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>
          </div>

          {/* Price */}
          <div className="mb-6">
            <span className="text-4xl font-bold">{plan.price}</span>
            <span className="text-muted-foreground">{plan.period}</span>
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check
                  size={18}
                  className={`flex-shrink-0 mt-0.5 ${
                    plan.popular ? 'text-primary' : 'text-green-500'
                  }`}
                />
                <span className="text-sm text-foreground/80">{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href={plan.ctaLink}
            className={`block w-full text-center py-3 px-6 rounded-xl font-medium transition-all ${
              plan.popular
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
                : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
            }`}
          >
            {plan.cta}
          </Link>
        </div>
      </div>
    </div>
  )
}

export function PricingSection() {
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
    <section id="pricing" className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

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
            <span className="text-sm font-medium">Simple Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Choose Your <span className="gradient-text">Plan</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard key={plan.name} plan={plan} index={index} />
          ))}
        </div>

        {/* FAQ Teaser */}
        <div
          className={`text-center mt-16 ${
            isVisible ? 'animate-fade-in delay-500' : 'opacity-0'
          }`}
        >
          <p className="text-muted-foreground">
            Have questions?{' '}
            <Link href="/pricing" className="text-primary hover:underline font-medium">
              See full pricing details
            </Link>{' '}
            or{' '}
            <Link href="/contact" className="text-primary hover:underline font-medium">
              contact us
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
