"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Inbox, Send, AlertOctagon, Mail, Plus, Bot, Megaphone, Newspaper, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface EmailAccount {
  id: number;
  email: string;
  provider: string;
  isActive: boolean;
}

interface FolderType {
  id: string;
  name: string;
  icon: React.ReactNode;
  count?: number;
}

interface EmailSidebarProps {
  activeFolder: string;
  onFolderChange: (folder: string, accountId?: number) => void;
}

interface CategoryCount {
  category: string;
  count: string;
}

export default function EmailSidebar({ activeFolder, onFolderChange }: EmailSidebarProps) {
  const router = useRouter();
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Fetch email accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        console.log('Fetching email accounts with token:', token ? 'exists' : 'missing');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/email-accounts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Email accounts response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Email accounts fetched:', data);

          // The API returns { email_accounts: [...] }
          const accounts = data.email_accounts || [];

          // Map to the format we need
          const mappedAccounts = accounts.map((account: any) => ({
            id: account.id,
            email: account.email_address,
            provider: account.provider,
            isActive: account.is_active
          }));

          setEmailAccounts(mappedAccounts);
          // Expand first account by default
          if (mappedAccounts.length > 0) {
            setExpandedAccounts(new Set([mappedAccounts[0].id]));
          }
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch email accounts:', errorData);
        }
      } catch (error) {
        console.error('Failed to fetch email accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // Fetch category counts
  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/emails/categories/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data: CategoryCount[] = await response.json();
          const counts: Record<string, number> = {};
          data.forEach((item) => {
            counts[item.category.toLowerCase()] = parseInt(item.count, 10);
          });
          setCategoryCounts(counts);
        }
      } catch (error) {
        console.error('Failed to fetch category counts:', error);
      }
    };

    fetchCategoryCounts();

    // Refetch every 30 seconds to keep counts updated
    const interval = setInterval(fetchCategoryCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleAccount = (accountId: number) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const folders: FolderType[] = [
    { id: 'all', name: 'All', icon: <Inbox className="size-4" /> },
    { id: 'sent', name: 'Sent', icon: <Send className="size-4" /> },
    { id: 'spam', name: 'Spam', icon: <AlertOctagon className="size-4" /> },
  ];

  // Category folders for generic email types (shown under each account)
  const categoryFolders: FolderType[] = [
    { id: 'automated', name: 'Automated', icon: <Bot className="size-4" /> },
    { id: 'promotional', name: 'Promotional', icon: <Megaphone className="size-4" /> },
    { id: 'newsletter', name: 'Newsletter', icon: <Newspaper className="size-4" /> },
    { id: 'shopping', name: 'Shopping', icon: <ShoppingCart className="size-4" /> },
  ];

  const handleAddAccount = () => {
    router.push('/accounts');
  };

  if (isLoading) {
    return (
      <div className="w-64 border-r border-border bg-card p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground mb-3">Email Accounts</h2>
        <button
          onClick={handleAddAccount}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <Plus className="size-4" />
          Add Account
        </button>
      </div>

      {/* Email Accounts List */}
      <div className="flex-1 overflow-y-auto p-2">
        {emailAccounts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No email accounts added yet
          </div>
        ) : (
          emailAccounts.map((account) => (
            <div key={account.id} className="mb-1">
              {/* Account Header */}
              <button
                onClick={() => toggleAccount(account.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                  expandedAccounts.has(account.id) ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                {expandedAccounts.has(account.id) ? (
                  <ChevronDown className="size-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="size-3 flex-shrink-0" />
                )}
                <Mail className="size-4 flex-shrink-0" />
                <span className="truncate flex-1 text-left">{account.email}</span>
              </button>

              {/* Folders (Sub-buttons) */}
              {expandedAccounts.has(account.id) && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {folders.map((folder) => (
                    <button
                      key={`${account.id}-${folder.id}`}
                      onClick={() => onFolderChange(folder.id, account.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-[10px] rounded-lg transition-colors",
                        activeFolder === `${account.id}-${folder.id}`
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      {folder.icon}
                      <span className="flex-1 text-left">{folder.name}</span>
                      {folder.count !== undefined && (
                        <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">
                          {folder.count}
                        </span>
                      )}
                    </button>
                  ))}

                  {/* Separator */}
                  <div className="border-t border-border my-2" />

                  {/* Category folders (Automated, Promotional, Newsletter, Shopping) */}
                  {categoryFolders.map((folder) => {
                    const count = categoryCounts[folder.id] || 0;
                    return (
                      <button
                        key={`${account.id}-${folder.id}`}
                        onClick={() => onFolderChange(folder.id, account.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 text-[10px] rounded-lg transition-colors",
                          activeFolder === `${account.id}-${folder.id}`
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        {folder.icon}
                        <span className="flex-1 text-left">{folder.name}</span>
                        {count > 0 && (
                          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
