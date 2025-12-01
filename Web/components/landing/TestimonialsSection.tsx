'use client'

import { useEffect, useRef, useState } from 'react'
import { Star, Quote, Sparkles } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Product Manager',
    company: 'TechCorp',
    avatar: 'SC',
    color: 'from-violet-500 to-purple-500',
    content:
      "NEMI has transformed how I handle email. The AI summaries save me at least an hour every day. I can finally focus on actual work instead of drowning in my inbox.",
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Startup Founder',
    company: 'LaunchPad.io',
    avatar: 'MJ',
    color: 'from-blue-500 to-cyan-500',
    content:
      "The @mention detection is a game-changer. I never miss when someone needs my attention, and I can safely ignore the noise. Worth every penny.",
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Marketing Director',
    company: 'GrowthCo',
    avatar: 'ER',
    color: 'from-pink-500 to-rose-500',
    content:
      "Finally, an email client that understands context! The smart categorization is spot-on, and the beautiful email cards for meetings are just *chef's kiss*.",
    rating: 5,
  },
  {
    name: 'David Park',
    role: 'Software Engineer',
    company: 'DevStudio',
    avatar: 'DP',
    color: 'from-green-500 to-emerald-500',
    content:
      "As someone who gets 200+ emails a day, NEMI is essential. The priority notifications ensure I never miss important messages from my team.",
    rating: 5,
  },
  {
    name: 'Lisa Thompson',
    role: 'Freelance Designer',
    company: 'Self-employed',
    avatar: 'LT',
    color: 'from-amber-500 to-orange-500',
    content:
      "I was skeptical about AI email tools, but NEMI won me over. It's intuitive, beautiful, and actually makes email enjoyable. Highly recommend!",
    rating: 5,
  },
  {
    name: 'James Wilson',
    role: 'VP of Sales',
    company: 'Enterprise Inc',
    avatar: 'JW',
    color: 'from-indigo-500 to-violet-500',
    content:
      "We rolled out NEMI to our entire sales team. Response times improved by 40%. The analytics help us understand our communication patterns better.",
    rating: 5,
  },
]

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: (typeof testimonials)[0]
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

  return (
    <div
      ref={ref}
      className={`group relative bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 ${
        isVisible ? 'animate-fade-in opacity-100' : 'opacity-0'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Quote Icon */}
      <Quote
        size={40}
        className="absolute top-4 right-4 text-muted/20 group-hover:text-primary/10 transition-colors"
      />

      {/* Rating */}
      <div className="flex gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className="fill-amber-400 text-amber-400"
          />
        ))}
      </div>

      {/* Content */}
      <p className="text-foreground/80 leading-relaxed mb-6 relative z-10">
        &quot;{testimonial.content}&quot;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-semibold`}
        >
          {testimonial.avatar}
        </div>
        <div>
          <div className="font-semibold">{testimonial.name}</div>
          <div className="text-sm text-muted-foreground">
            {testimonial.role} at {testimonial.company}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TestimonialsSection() {
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
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/30" />

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
            <span className="text-sm font-medium">Loved by Thousands</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            What People Are <span className="gradient-text">Saying</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of professionals who&apos;ve transformed their email experience
            with NEMI.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.name}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </div>

        {/* Stats */}
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-border ${
            isVisible ? 'animate-fade-in delay-500' : 'opacity-0'
          }`}
        >
          {[
            { number: '50K+', label: 'Active Users' },
            { number: '10M+', label: 'Emails Processed' },
            { number: '4.9/5', label: 'User Rating' },
            { number: '80%', label: 'Time Saved' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                {stat.number}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
