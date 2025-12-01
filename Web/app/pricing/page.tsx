'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  X,
  Sparkles,
  Zap,
  Building,
  HelpCircle,
  Mail,
} from 'lucide-react'
import { LandingNav, Footer } from '@/components/landing'

const plans = [
  {
    name: 'Free',
    description: 'Perfect for trying out NEMI',
    price: '$0',
    period: 'forever',
    icon: Sparkles,
    color: 'from-slate-500 to-zinc-500',
    features: {
      'Email accounts': '1',
      'AI summaries': 'Yes',
      'Smart categorization': 'Yes',
      'Email processing': '100/month',
      '@Mention detection': 'No',
      'Email analytics': 'Basic',
      'Beautiful email cards': 'No',
      'Priority notifications': 'Basic',
      'Support': 'Community',
    },
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
    features: {
      'Email accounts': 'Unlimited',
      'AI summaries': 'Advanced',
      'Smart categorization': 'Yes',
      'Email processing': 'Unlimited',
      '@Mention detection': 'Yes',
      'Email analytics': 'Full',
      'Beautiful email cards': 'Yes',
      'Priority notifications': 'Full',
      'Support': 'Priority',
    },
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
    features: {
      'Email accounts': 'Unlimited',
      'AI summaries': 'Custom AI',
      'Smart categorization': 'Custom',
      'Email processing': 'Unlimited',
      '@Mention detection': 'Yes',
      'Email analytics': 'Advanced',
      'Beautiful email cards': 'Yes',
      'Priority notifications': 'Full',
      'Support': 'Dedicated',
    },
    extras: [
      'Team management',
      'SSO / SAML',
      'API access',
      'Custom training',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact',
    popular: false,
  },
]

const faqs = [
  {
    question: 'Can I try NEMI for free?',
    answer:
      "Absolutely! Our Free plan is forever free and includes core features like AI summaries and smart categorization. It's a great way to experience NEMI before upgrading.",
  },
  {
    question: 'How does the 14-day Pro trial work?',
    answer:
      "When you sign up for Pro, you get 14 days of full access without entering payment info. At the end of the trial, you can upgrade to continue or stay on the Free plan.",
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      "Yes, you can cancel your subscription at any time. There are no long-term commitments. If you cancel, you'll have access until the end of your billing period.",
  },
  {
    question: 'Is my email data secure?',
    answer:
      "Security is our top priority. We use industry-standard encryption, never store your email content permanently, and comply with SOC 2 standards. Your data is yours.",
  },
  {
    question: "What email providers do you support?",
    answer:
      "We currently support Gmail (with full OAuth integration), Outlook, and any IMAP-compatible email service. More integrations are coming soon!",
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer:
      "Yes! When you choose annual billing, you get 2 months free (effectively a 17% discount). That's $90/year instead of $108.",
  },
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

function FAQItem({ faq, index }: { faq: (typeof faqs)[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <AnimatedSection className={`delay-${(index % 4) * 100}`}>
      <div className="border-b border-border">
        <button
          className="w-full py-6 flex items-center justify-between text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="font-semibold pr-4">{faq.question}</span>
          <HelpCircle
            size={20}
            className={`flex-shrink-0 text-muted-foreground transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isOpen && (
          <div className="pb-6 text-muted-foreground animate-fade-in">
            {faq.answer}
          </div>
        )}
      </div>
    </AnimatedSection>
  )
}

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

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
            <span className="text-sm font-medium">Simple Pricing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 animate-fade-in delay-100">
            Choose the <span className="gradient-text">Perfect Plan</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in delay-200">
            Start free, upgrade when you need more. No hidden fees, transparent pricing.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-muted rounded-full p-1 animate-fade-in delay-300">
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'annual'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setBillingPeriod('annual')}
            >
              Annual
              <span className="ml-2 text-xs text-green-500 font-semibold">
                Save 17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const Icon = plan.icon
              const price =
                billingPeriod === 'annual' && plan.price !== '$0' && plan.price !== 'Custom'
                  ? '$7.50'
                  : plan.price
              const period =
                billingPeriod === 'annual' && plan.period === '/month'
                  ? '/month (billed annually)'
                  : plan.period

              return (
                <AnimatedSection
                  key={plan.name}
                  className={`delay-${index * 150}`}
                >
                  <div
                    className={`relative h-full bg-card rounded-2xl border transition-all duration-300 ${
                      plan.popular
                        ? 'border-primary shadow-lg shadow-primary/10 scale-105'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium px-4 py-1 rounded-full shadow-lg">
                          Most Popular
                        </div>
                      </div>
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
                          <p className="text-sm text-muted-foreground">
                            {plan.description}
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        <span className="text-4xl font-bold">{price}</span>
                        <span className="text-muted-foreground">{period}</span>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-8">
                        {Object.entries(plan.features).map(([feature, value]) => (
                          <li key={feature} className="flex items-center gap-3">
                            {value === 'No' ? (
                              <X size={18} className="text-muted-foreground" />
                            ) : (
                              <Check
                                size={18}
                                className={plan.popular ? 'text-primary' : 'text-green-500'}
                              />
                            )}
                            <span className="text-sm">
                              <span className="text-muted-foreground">{feature}:</span>{' '}
                              <span className={value === 'No' ? 'text-muted-foreground' : ''}>
                                {value}
                              </span>
                            </span>
                          </li>
                        ))}
                        {plan.extras?.map((extra) => (
                          <li key={extra} className="flex items-center gap-3">
                            <Check size={18} className="text-green-500" />
                            <span className="text-sm">{extra}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <Link
                        href={plan.ctaLink}
                        className={`block w-full text-center py-3 px-6 rounded-xl font-medium transition-all ${
                          plan.popular
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                            : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table (Mobile Hidden) */}
      <section className="py-20 hidden lg:block">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <h2 className="text-2xl font-bold text-center mb-8">
              Detailed Comparison
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-center p-4 font-semibold">Free</th>
                    <th className="text-center p-4 font-semibold text-primary">Pro</th>
                    <th className="text-center p-4 font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.keys(plans[0].features).map((feature) => (
                    <tr key={feature}>
                      <td className="p-4 text-muted-foreground">{feature}</td>
                      {plans.map((plan) => (
                        <td key={plan.name} className="p-4 text-center">
                          {plan.features[feature as keyof typeof plan.features] === 'No' ? (
                            <X size={18} className="inline text-muted-foreground" />
                          ) : plan.features[feature as keyof typeof plan.features] === 'Yes' ? (
                            <Check size={18} className="inline text-green-500" />
                          ) : (
                            plan.features[feature as keyof typeof plan.features]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know about NEMI pricing
            </p>
          </AnimatedSection>

          <div>
            {faqs.map((faq, index) => (
              <FAQItem key={faq.question} faq={faq} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-8">
              <Mail size={40} className="text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Still Have <span className="gradient-text">Questions?</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Our team is here to help you find the perfect plan for your needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold transition-all hover:shadow-xl hover:shadow-primary/25"
              >
                Contact Sales
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-2 text-foreground/70 hover:text-foreground px-8 py-4 font-medium transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </main>
  )
}
