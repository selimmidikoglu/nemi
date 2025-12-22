"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Inbox, Send, AlertOctagon, Mail, Plus, Bot, Megaphone, Newspaper, ShoppingCart, Archive, Clock, Trash2, Star, Edit3, BarChart3, Tags, MailX, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface EmailAccount {
  id: string;
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
  onFolderChange: (folder: string, accountId?: string | null) => void;
  onCompose?: () => void;
  selectedAccountId?: string | null;
}

interface CategoryCount {
  category: string;
  count: string;
}

export default function EmailSidebar({ activeFolder, onFolderChange, onCompose, selectedAccountId }: EmailSidebarProps) {
  const router = useRouter();
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string | 'all'>>(new Set(['all']));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [allEmailsCategoryCounts, setAllEmailsCategoryCounts] = useState<Record<string, number>>({});
  const [accountCategoryCounts, setAccountCategoryCounts] = useState<Record<string, Record<string, number>>>({});
  const [aboutYouCount, setAboutYouCount] = useState<number>(0);
  const [accountAboutYouCounts, setAccountAboutYouCounts] = useState<Record<string, number>>({});

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

  // Fetch category counts for all emails (aggregate)
  useEffect(() => {
    const fetchAllCategoryCounts = async () => {
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
          setAllEmailsCategoryCounts(counts);
          setCategoryCounts(counts); // Default to all
        }
      } catch (error) {
        console.error('Failed to fetch category counts:', error);
      }
    };

    fetchAllCategoryCounts();

    // Refetch every 30 seconds to keep counts updated
    const interval = setInterval(fetchAllCategoryCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch category counts per account
  useEffect(() => {
    const fetchAccountCategoryCounts = async () => {
      if (emailAccounts.length === 0) return;

      const token = localStorage.getItem('accessToken');
      const accountCountsMap: Record<string, Record<string, number>> = {};

      for (const account of emailAccounts) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/emails/categories/stats?emailAccountId=${account.id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data: CategoryCount[] = await response.json();
            const counts: Record<string, number> = {};
            data.forEach((item) => {
              counts[item.category.toLowerCase()] = parseInt(item.count, 10);
            });
            accountCountsMap[account.id] = counts;
          }
        } catch (error) {
          console.error(`Failed to fetch category counts for account ${account.id}:`, error);
        }
      }

      setAccountCategoryCounts(accountCountsMap);
    };

    fetchAccountCategoryCounts();

    // Refetch every 30 seconds
    const interval = setInterval(fetchAccountCategoryCounts, 30000);
    return () => clearInterval(interval);
  }, [emailAccounts]);

  // Fetch "About You" counts (personally relevant emails)
  useEffect(() => {
    const fetchAboutYouCounts = async () => {
      try {
        const token = localStorage.getItem('accessToken');

        // Fetch total "About You" count
        const allResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/emails?isPersonallyRelevant=true&limit=1`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (allResponse.ok) {
          const data = await allResponse.json();
          setAboutYouCount(data.total || 0);
        }

        // Fetch per-account "About You" counts
        if (emailAccounts.length > 0) {
          const accountCounts: Record<string, number> = {};
          for (const account of emailAccounts) {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/emails?isPersonallyRelevant=true&emailAccountId=${account.id}&limit=1`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (response.ok) {
              const data = await response.json();
              accountCounts[account.id] = data.total || 0;
            }
          }
          setAccountAboutYouCounts(accountCounts);
        }
      } catch (error) {
        console.error('Failed to fetch About You counts:', error);
      }
    };

    fetchAboutYouCounts();
    const interval = setInterval(fetchAboutYouCounts, 30000);
    return () => clearInterval(interval);
  }, [emailAccounts]);

  const toggleAccount = (accountId: string | 'all') => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const toggleCategories = (key: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCategories(newExpanded);
  };

  // Get category counts for a specific account or all emails
  const getCategoryCounts = (accountId: string | null): Record<string, number> => {
    if (accountId === null) {
      return allEmailsCategoryCounts;
    }
    return accountCategoryCounts[accountId] || {};
  };

  // Get "About You" count for a specific account or all emails
  const getAboutYouCount = (accountId: string | null): number => {
    if (accountId === null) {
      return aboutYouCount;
    }
    return accountAboutYouCounts[accountId] || 0;
  };

  const folders: FolderType[] = [
    { id: 'all', name: 'All', icon: <Inbox className="size-[18px]" /> },
    { id: 'about-you', name: 'About You', icon: <Star className="size-[18px] text-amber-500 fill-amber-500" /> }, // Premium feature - personally relevant emails
    { id: 'starred', name: 'Starred', icon: <Star className="size-[18px]" /> },
    { id: 'snoozed', name: 'Snoozed', icon: <Clock className="size-[18px]" /> },
    { id: 'sent', name: 'Sent', icon: <Send className="size-[18px]" /> },
    { id: 'archived', name: 'Archived', icon: <Archive className="size-[18px]" /> },
    { id: 'deleted', name: 'Deleted', icon: <Trash2 className="size-[18px]" /> },
    { id: 'spam', name: 'Spam', icon: <AlertOctagon className="size-[18px]" /> },
  ];

  // Category folders for generic email types (shown under each account)
  const categoryFolders: FolderType[] = [
    { id: 'automated', name: 'Automated', icon: <Bot className="size-[18px]" /> },
    { id: 'promotional', name: 'Promotional', icon: <Megaphone className="size-[18px]" /> },
    { id: 'newsletter', name: 'Newsletter', icon: <Newspaper className="size-[18px]" /> },
    { id: 'shopping', name: 'Shopping', icon: <ShoppingCart className="size-[18px]" /> },
  ];

  // Navigation links removed - Analytics, Badges, Unsubscribe now only accessible from Settings

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

  // Show simplified view when no accounts are connected
  if (emailAccounts.length === 0) {
    return (
      <div className="w-60 border-r border-border bg-card flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to NEMI</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Connect your email account to get started
          </p>
          <button
            onClick={handleAddAccount}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="size-5" />
            Add Email Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 border-r border-border bg-card flex flex-col">
      {/* Header with Compose Button */}
      <div className="p-3 border-b border-border">
        {/* Compose Button - Gmail-style prominent button */}
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-3 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <Edit3 className="size-4" />
          Compose
        </button>

        <button
          onClick={handleAddAccount}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <Plus className="size-4" />
          Add Account
        </button>
      </div>

      {/* Email Accounts List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* All Emails Section (Aggregate) */}
        <div className="mb-2">
          <button
            onClick={() => toggleAccount('all')}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold rounded-lg transition-colors",
              selectedAccountId === null && expandedAccounts.has('all')
                ? "bg-primary/10 text-primary"
                : expandedAccounts.has('all')
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            )}
          >
            {expandedAccounts.has('all') ? (
              <ChevronDown className="size-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="size-4 flex-shrink-0" />
            )}
            <Inbox className="size-5 flex-shrink-0" />
            <span className="truncate flex-1 text-left">All Emails</span>
          </button>

          {/* All Emails Folders */}
          {expandedAccounts.has('all') && (
            <div className="ml-3 mt-1 space-y-0.5">
              {folders.map((folder) => {
                const isAboutYou = folder.id === 'about-you';
                const aboutYouCountValue = isAboutYou ? getAboutYouCount(null) : 0;
                return (
                  <button
                    key={`all-${folder.id}`}
                    onClick={() => onFolderChange(folder.id, null)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors",
                      activeFolder === `all-${folder.id}` || (activeFolder === folder.id && selectedAccountId === null)
                        ? "bg-primary/10 text-primary font-medium"
                        : isAboutYou
                        ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <span className="flex-shrink-0">{folder.icon}</span>
                    <span className="flex-1 text-left">{folder.name}</span>
                    {isAboutYou && aboutYouCountValue > 0 && (
                      <span className="text-[11px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                        {aboutYouCountValue}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Categories Dropdown */}
              <div className="mt-1">
                <button
                  onClick={() => toggleCategories('all')}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors",
                    expandedCategories.has('all')
                      ? "bg-accent/50 text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {expandedCategories.has('all') ? (
                    <ChevronDown className="size-3.5 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="size-3.5 flex-shrink-0" />
                  )}
                  <Layers className="size-[18px] flex-shrink-0" />
                  <span className="flex-1 text-left">Categories</span>
                  {(() => {
                    const counts = getCategoryCounts(null);
                    const totalCount = categoryFolders.reduce((sum, f) => sum + (counts[f.id] || 0), 0);
                    return totalCount > 0 ? (
                      <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full">
                        {totalCount}
                      </span>
                    ) : null;
                  })()}
                </button>

                {/* Category folders inside dropdown */}
                {expandedCategories.has('all') && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {categoryFolders.map((folder) => {
                      const counts = getCategoryCounts(null);
                      const count = counts[folder.id] || 0;
                      return (
                        <button
                          key={`all-${folder.id}`}
                          onClick={() => onFolderChange(folder.id, null)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] rounded-lg transition-colors",
                            activeFolder === `all-${folder.id}` || (activeFolder === folder.id && selectedAccountId === null)
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                          )}
                        >
                          <span className="flex-shrink-0">{folder.icon}</span>
                          <span className="flex-1 text-left">{folder.name}</span>
                          {count > 0 && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator between All Emails and individual accounts */}
        {emailAccounts.length > 0 && (
          <div className="border-t border-border my-2 mx-2" />
        )}

        {/* Individual Email Accounts */}
        {emailAccounts.map((account) => (
            <div key={account.id} className="mb-1">
              {/* Account Header */}
              <button
                onClick={() => toggleAccount(account.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors",
                  selectedAccountId === account.id
                    ? "bg-primary/10 text-primary"
                    : expandedAccounts.has(account.id)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                {expandedAccounts.has(account.id) ? (
                  <ChevronDown className="size-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="size-4 flex-shrink-0" />
                )}
                <Mail className="size-5 flex-shrink-0" />
                <span className="truncate flex-1 text-left">{account.email}</span>
              </button>

              {/* Folders (Sub-buttons) */}
              {expandedAccounts.has(account.id) && (
                <div className="ml-3 mt-1 space-y-0.5">
                  {folders.map((folder) => {
                    const isAboutYou = folder.id === 'about-you';
                    const aboutYouCountValue = isAboutYou ? getAboutYouCount(account.id) : 0;
                    return (
                      <button
                        key={`${account.id}-${folder.id}`}
                        onClick={() => onFolderChange(folder.id, account.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors",
                          activeFolder === `${account.id}-${folder.id}`
                            ? "bg-primary/10 text-primary font-medium"
                            : isAboutYou
                            ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <span className="flex-shrink-0">{folder.icon}</span>
                        <span className="flex-1 text-left">{folder.name}</span>
                        {isAboutYou && aboutYouCountValue > 0 && (
                          <span className="text-[11px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                            {aboutYouCountValue}
                          </span>
                        )}
                        {!isAboutYou && folder.count !== undefined && (
                          <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full">
                            {folder.count}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Categories Dropdown */}
                  <div className="mt-1">
                    <button
                      onClick={() => toggleCategories(account.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors",
                        expandedCategories.has(account.id)
                          ? "bg-accent/50 text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      {expandedCategories.has(account.id) ? (
                        <ChevronDown className="size-3.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="size-3.5 flex-shrink-0" />
                      )}
                      <Layers className="size-[18px] flex-shrink-0" />
                      <span className="flex-1 text-left">Categories</span>
                      {(() => {
                        const counts = getCategoryCounts(account.id);
                        const totalCount = categoryFolders.reduce((sum, f) => sum + (counts[f.id] || 0), 0);
                        return totalCount > 0 ? (
                          <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full">
                            {totalCount}
                          </span>
                        ) : null;
                      })()}
                    </button>

                    {/* Category folders inside dropdown */}
                    {expandedCategories.has(account.id) && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {categoryFolders.map((folder) => {
                          const counts = getCategoryCounts(account.id);
                          const count = counts[folder.id] || 0;
                          return (
                            <button
                              key={`${account.id}-${folder.id}`}
                              onClick={() => onFolderChange(folder.id, account.id)}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] rounded-lg transition-colors",
                                activeFolder === `${account.id}-${folder.id}`
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              )}
                            >
                              <span className="flex-shrink-0">{folder.icon}</span>
                              <span className="flex-1 text-left">{folder.name}</span>
                              {count > 0 && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
