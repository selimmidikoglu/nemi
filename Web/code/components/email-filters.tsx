"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Briefcase, User, AlertTriangle, Mail, FolderKanban, DollarSign, Inbox } from "lucide-react"
import type { BadgeType } from "./email-client"

interface EmailFiltersProps {
  activeBadge: BadgeType
  onBadgeChange: (badge: BadgeType) => void
}

const badgeFilters = [
  { id: "all" as const, label: "All", icon: Inbox, count: 127, color: "bg-secondary text-secondary-foreground" },
  {
    id: "work" as const,
    label: "Work",
    icon: Briefcase,
    count: 32,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    id: "personal" as const,
    label: "Personal",
    icon: User,
    count: 18,
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  {
    id: "urgent" as const,
    label: "Urgent",
    icon: AlertTriangle,
    count: 5,
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  {
    id: "newsletter" as const,
    label: "Newsletter",
    icon: Mail,
    count: 45,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    id: "project" as const,
    label: "Project",
    icon: FolderKanban,
    count: 12,
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  {
    id: "finance" as const,
    label: "Finance",
    icon: DollarSign,
    count: 8,
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
]

export function EmailFilters({ activeBadge, onBadgeChange }: EmailFiltersProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-6 py-4">
      {badgeFilters.map((badge) => {
        const Icon = badge.icon
        const isActive = activeBadge === badge.id

        return (
          <Badge
            key={badge.id}
            variant="outline"
            className={cn(
              "cursor-pointer gap-1.5 px-3 py-1.5 text-sm transition-all hover:scale-105",
              badge.color,
              isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md",
            )}
            onClick={() => onBadgeChange(badge.id)}
          >
            <Icon className="size-3.5" />
            {badge.label}
            <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold", "bg-background/20")}>
              {badge.count}
            </span>
          </Badge>
        )
      })}
    </div>
  )
}
