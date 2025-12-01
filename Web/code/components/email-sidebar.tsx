"use client"

import { Mail, User, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailSidebarProps {
  selectedAccount: string
  onSelectAccount: (account: string) => void
}

const accounts = [
  { email: "work@company.com", name: "Work Account", unread: 12 },
  { email: "personal@gmail.com", name: "Personal", unread: 5 },
  { email: "freelance@design.co", name: "Freelance", unread: 3 },
]

export function EmailSidebar({ selectedAccount, onSelectAccount }: EmailSidebarProps) {
  return (
    <div className="flex w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <Mail className="size-6 text-sidebar-primary" />
        <span className="text-lg font-semibold text-sidebar-foreground">MailBox</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Accounts</div>
        <div className="space-y-1">
          {accounts.map((account) => (
            <button
              key={account.email}
              onClick={() => onSelectAccount(account.email)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                selectedAccount === account.email
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent/50">
                <User className="size-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium">{account.name}</div>
                <div className="truncate text-xs opacity-80">{account.email}</div>
              </div>
              {account.unread > 0 && (
                <div className="flex size-6 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {account.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
          <Settings className="size-5" />
          <span className="text-sm font-medium">Settings</span>
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
          <LogOut className="size-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
