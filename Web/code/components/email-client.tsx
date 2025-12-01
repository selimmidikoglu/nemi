"use client"

import { useState } from "react"
import { EmailSidebar } from "./email-sidebar"
import { EmailList } from "./email-list"
import { EmailFilters } from "./email-filters"

export type BadgeType = "all" | "work" | "personal" | "urgent" | "newsletter" | "project" | "finance"

export function EmailClient() {
  const [selectedAccount, setSelectedAccount] = useState("work@company.com")
  const [activeBadge, setActiveBadge] = useState<BadgeType>("all")

  return (
    <div className="flex h-screen bg-background dark">
      <EmailSidebar selectedAccount={selectedAccount} onSelectAccount={setSelectedAccount} />
      <div className="flex flex-1 flex-col">
        <EmailFilters activeBadge={activeBadge} onBadgeChange={setActiveBadge} />
        <EmailList account={selectedAccount} badgeFilter={activeBadge} />
      </div>
    </div>
  )
}
