"use client"

import { Star, Paperclip } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BadgeType } from "./email-client"

interface EmailListProps {
  account: string
  badgeFilter: BadgeType
}

const emails = [
  {
    id: 1,
    from: "Sarah Chen",
    email: "sarah.chen@tech.com",
    subject: "Q4 Project Review Meeting",
    aiSummary: "Schedule request for quarterly performance review with team availability check",
    preview:
      "Hi team, I wanted to schedule our quarterly review for next week. Please let me know your availability...",
    time: "10:30 AM",
    unread: true,
    starred: true,
    hasAttachment: true,
    badges: ["work" as const, "urgent" as const, "project" as const],
  },
  {
    id: 2,
    from: "GitHub",
    email: "noreply@github.com",
    subject: "[vercel/next.js] New release v15.0.0",
    aiSummary: "Major framework update announcement featuring enhanced performance and new developer tools",
    preview: "We are excited to announce the release of Next.js 15.0.0 with several new features including...",
    time: "9:15 AM",
    unread: true,
    starred: false,
    hasAttachment: false,
    badges: ["newsletter" as const, "work" as const],
  },
  {
    id: 3,
    from: "Marketing Team",
    email: "marketing@company.com",
    subject: "New Product Launch Campaign",
    aiSummary: "Upcoming product launch strategy with prepared marketing collateral for review",
    preview: "The new product launch is scheduled for next month. Here are the marketing materials we have prepared...",
    time: "Yesterday",
    unread: false,
    starred: true,
    hasAttachment: true,
    badges: ["work" as const, "project" as const],
  },
  {
    id: 4,
    from: "Mom",
    email: "mom@family.com",
    subject: "Family Dinner This Sunday",
    aiSummary: "Weekend family gathering reminder with time and location details",
    preview:
      "Hi honey! Just wanted to remind you about the family dinner this Sunday at 6 PM. Looking forward to seeing you...",
    time: "Yesterday",
    unread: false,
    starred: false,
    hasAttachment: false,
    badges: ["personal" as const],
  },
  {
    id: 5,
    from: "LinkedIn",
    email: "noreply@linkedin.com",
    subject: "You appeared in 8 searches this week",
    aiSummary: "Profile engagement report showing increased visibility to potential connections",
    preview: "Your profile has been showing up in more searches. See who is looking at your profile...",
    time: "2 days ago",
    unread: true,
    starred: false,
    hasAttachment: false,
    badges: ["newsletter" as const],
  },
  {
    id: 6,
    from: "Finance Department",
    email: "finance@company.com",
    subject: "Invoice Payment Confirmation - URGENT",
    aiSummary: "Payment processing confirmation with expected transfer timeline for outstanding invoice",
    preview:
      "Your invoice #INV-2024-0342 has been processed and payment will be transferred within 2-3 business days...",
    time: "2 days ago",
    unread: true,
    starred: true,
    hasAttachment: true,
    badges: ["work" as const, "finance" as const, "urgent" as const],
  },
  {
    id: 7,
    from: "Amazon",
    email: "auto@amazon.com",
    subject: "Your package has been delivered",
    aiSummary: "Successful delivery notification with tracking history access",
    preview: "Good news! Your package has been delivered to your mailbox. Track your delivery history...",
    time: "3 days ago",
    unread: false,
    starred: false,
    hasAttachment: false,
    badges: ["personal" as const],
  },
  {
    id: 8,
    from: "Dev Team",
    email: "dev@company.com",
    subject: "Code Review Required: PR #234",
    aiSummary: "Pull request awaiting your technical review and approval for merge",
    preview:
      "A new pull request requires your review. Please check the changes and approve if everything looks good...",
    time: "3 days ago",
    unread: false,
    starred: true,
    hasAttachment: false,
    badges: ["work" as const, "project" as const],
  },
  {
    id: 9,
    from: "Bank of America",
    email: "alerts@bankofamerica.com",
    subject: "Monthly Statement Available",
    aiSummary: "Account statement ready for download with monthly transaction overview",
    preview: "Your monthly statement for account ending in 4532 is now available. View your statement online...",
    time: "4 days ago",
    unread: false,
    starred: false,
    hasAttachment: true,
    badges: ["finance" as const, "personal" as const],
  },
  {
    id: 10,
    from: "Tech Newsletter",
    email: "weekly@technews.com",
    subject: "This Week in Tech: AI Advances",
    aiSummary: "Weekly tech industry roundup highlighting artificial intelligence breakthroughs and trends",
    preview:
      "The biggest tech stories of the week including breakthroughs in AI, new product launches, and industry trends...",
    time: "5 days ago",
    unread: false,
    starred: false,
    hasAttachment: false,
    badges: ["newsletter" as const],
  },
]

const badgeStyles: Record<BadgeType, string> = {
  all: "bg-secondary text-secondary-foreground",
  work: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  personal: "bg-green-500/20 text-green-400 border-green-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  newsletter: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  project: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  finance: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
}

export function EmailList({ account, badgeFilter }: EmailListProps) {
  const filteredEmails = badgeFilter === "all" ? emails : emails.filter((email) => email.badges.includes(badgeFilter))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-border">
        {filteredEmails.map((email) => (
          <button
            key={email.id}
            className={cn(
              "flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-accent",
              email.unread && "bg-accent/50",
            )}
          >
            <button
              className="mt-1 text-muted-foreground transition-colors hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <Star className={cn("size-5", email.starred && "fill-primary text-primary")} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-medium",
                    email.unread && "text-foreground",
                    !email.unread && "text-muted-foreground",
                  )}
                >
                  {email.from}
                </span>
                <span className="text-xs text-muted-foreground">{email.email}</span>
              </div>

              <div
                className={cn(
                  "mt-1 font-medium",
                  email.unread && "text-foreground",
                  !email.unread && "text-muted-foreground",
                )}
              >
                {email.subject}
              </div>

              <div className="mt-2 text-sm font-medium text-primary/90 italic">{email.aiSummary}</div>

              <div className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">
                {email.preview.substring(0, 80)}...
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {email.badges.map((badge) => (
                  <Badge
                    key={badge}
                    variant="outline"
                    className={cn("px-2 py-0 text-xs font-medium", badgeStyles[badge])}
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="whitespace-nowrap text-xs text-muted-foreground">{email.time}</span>
              {email.hasAttachment && <Paperclip className="size-4 text-muted-foreground" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
