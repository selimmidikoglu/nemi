'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, Brain, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const steps = [
  {
    number: '01',
    icon: Mail,
    title: 'Connect Your Email',
    description:
      'Securely connect your Gmail, Outlook, or any IMAP email account in seconds. We use OAuth for maximum security.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    number: '02',
    icon: Brain,
    title: 'AI Analyzes Everything',
    description:
      'Our AI reads and understands every email, categorizing content, extracting key information, and identifying priorities.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Smart Organization',
    description:
      'Emails are automatically sorted, summarized, and tagged. Meetings become cards. @mentions are highlighted.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    number: '04',
    icon: CheckCircle2,
    title: 'Focus on What Matters',
    description:
      'Spend 80% less time on email. Read summaries, act on priorities, and let NEMI handle the noise.',
    color: 'from-green-500 to-emerald-500',
  },
]

function StepCard({
  step,
  index,
  isLast,
}: {
  step: (typeof steps)[0]
  index: number
  isLast: boolean
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
      { threshold: 0.2 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const Icon = step.icon

  return (
    <div ref={ref} className="relative">
      {/* Connector Line */}
      {!isLast && (
        <div className="hidden lg:block absolute top-16 left-[calc(50%+60px)] w-[calc(100%-120px)] h-0.5">
          <div
            className={`h-full bg-gradient-to-r ${step.color} transition-all duration-1000 ${
              isVisible ? 'opacity-30 w-full' : 'opacity-0 w-0'
            }`}
          />
        </div>
      )}

      {/* Card */}
      <div
        className={`relative text-center transition-all duration-700 ${
          isVisible
            ? 'animate-fade-in opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
        style={{ animationDelay: `${index * 200}ms` }}
      >
        {/* Step Number */}
        <div className="inline-block mb-4">
          <span
            className={`text-6xl font-bold bg-gradient-to-br ${step.color} bg-clip-text text-transparent opacity-20`}
          >
            {step.number}
          </span>
        </div>

        {/* Icon Circle */}
        <div className="relative mx-auto mb-6">
          <div
            className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} p-0.5 mx-auto transform hover:scale-110 transition-transform duration-300`}
          >
            <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
              <Icon size={36} className="text-foreground" />
            </div>
          </div>
          {/* Glow */}
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} blur-xl opacity-20 -z-10`}
          />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
        <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {step.description}
        </p>
      </div>
    </div>
  )
}

export function HowItWorksSection() {
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
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-20 ${
            isVisible ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Sparkles size={16} />
            <span className="text-sm font-medium">Simple Process</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            How <span className="gradient-text">NEMI</span> Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in minutes. No complex setup, no learning curve. Just connect
            and let AI handle the rest.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {steps.map((step, index) => (
            <StepCard
              key={step.number}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* CTA */}
        <div
          className={`text-center mt-16 ${
            isVisible ? 'animate-fade-in delay-700' : 'opacity-0'
          }`}
        >
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg transition-all hover:shadow-xl hover:shadow-primary/25"
          >
            Get Started Now
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Free to start. No credit card required.
          </p>
        </div>
      </div>
    </section>
  )
}
