'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Heart,
  Lightbulb,
  Shield,
  Target,
  Users,
  Zap,
  Mail,
  Sparkles,
} from 'lucide-react'
import { LandingNav, Footer } from '@/components/landing'

const values = [
  {
    icon: Heart,
    title: 'User-First Design',
    description:
      "Every feature we build starts with understanding our users' needs. We obsess over the details that make your email experience delightful.",
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Shield,
    title: 'Privacy & Security',
    description:
      "Your emails are sacred. We use end-to-end encryption, never sell your data, and give you full control over your information.",
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Lightbulb,
    title: 'Intelligent Innovation',
    description:
      "We leverage cutting-edge AI responsibly, creating tools that augment human intelligence rather than replace it.",
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Zap,
    title: 'Relentless Simplicity',
    description:
      "Powerful doesn't mean complicated. We work tirelessly to make complex technology feel effortless and intuitive.",
    color: 'from-green-500 to-emerald-500',
  },
]

const team = [
  {
    name: 'Alex Rivera',
    role: 'CEO & Co-founder',
    bio: 'Former Google PM. 10+ years in productivity software.',
    avatar: 'AR',
    color: 'from-violet-500 to-purple-500',
  },
  {
    name: 'Jordan Kim',
    role: 'CTO & Co-founder',
    bio: 'Ex-OpenAI engineer. ML & NLP specialist.',
    avatar: 'JK',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Sam Patel',
    role: 'Head of Design',
    bio: 'Former Apple design lead. 15 years UX experience.',
    avatar: 'SP',
    color: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Morgan Chen',
    role: 'Head of Engineering',
    bio: 'Ex-Stripe. Scaled systems to 100M+ users.',
    avatar: 'MC',
    color: 'from-green-500 to-emerald-500',
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

export default function AboutPage() {
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
            <Users size={16} />
            <span className="text-sm font-medium">About NEMI</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 animate-fade-in delay-100">
            We&apos;re on a Mission to{' '}
            <span className="gradient-text">Fix Email</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in delay-200">
            Email was invented in 1971. It&apos;s time for an upgrade. We&apos;re building the
            intelligent email experience that the modern world deserves.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                The <span className="gradient-text">NEMI</span> Story
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  It started with a frustration we all share: too many emails, not
                  enough time. Our founders spent hours every day just trying to keep
                  up with their inboxes.
                </p>
                <p>
                  We asked ourselves: what if AI could read your emails for you? Not
                  to replace human judgment, but to surface what truly matters and let
                  you focus on what you do best.
                </p>
                <p>
                  NEMI was born from this vision. Named after the goddess of divine
                  retribution (against bad email experiences), we&apos;re building the
                  email client we always wished existed.
                </p>
                <p>
                  Today, thousands of professionals trust NEMI to manage their most
                  important communications. And we&apos;re just getting started.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection className="delay-200">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-xl" />
                <div className="relative bg-card rounded-2xl border border-border p-8">
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { number: '2023', label: 'Founded' },
                      { number: '50K+', label: 'Users' },
                      { number: '10M+', label: 'Emails Processed' },
                      { number: '15', label: 'Team Members' },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <div className="text-3xl font-bold gradient-text mb-1">
                          {stat.number}
                        </div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Target size={16} />
              <span className="text-sm font-medium">Our Values</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              What We <span className="gradient-text">Believe In</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide every decision we make and every feature we build.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <AnimatedSection
                  key={value.title}
                  className={`delay-${(index + 1) * 100}`}
                >
                  <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-300 h-full">
                    <div
                      className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${value.color} mb-4`}
                    >
                      <Icon size={24} className="text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Users size={16} />
              <span className="text-sm font-medium">Our Team</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Meet the <span className="gradient-text">People</span> Behind NEMI
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A passionate team of engineers, designers, and product thinkers united by
              a common goal.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <AnimatedSection
                key={member.name}
                className={`delay-${(index + 1) * 100}`}
              >
                <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-300 text-center">
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4`}
                  >
                    {member.avatar}
                  </div>
                  <h3 className="text-xl font-semibold">{member.name}</h3>
                  <p className="text-primary text-sm mb-2">{member.role}</p>
                  <p className="text-muted-foreground text-sm">{member.bio}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center mt-12 delay-500">
            <p className="text-muted-foreground mb-4">
              Interested in joining our team?
            </p>
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
            >
              View Open Positions
              <ArrowRight size={18} />
            </Link>
          </AnimatedSection>
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
              Ready to Experience the{' '}
              <span className="gradient-text">Future of Email?</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Join thousands who&apos;ve already transformed their inbox with NEMI.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg transition-all hover:shadow-xl hover:shadow-primary/25"
            >
              <Sparkles size={20} />
              Get Started Free
              <ArrowRight size={20} />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </main>
  )
}
