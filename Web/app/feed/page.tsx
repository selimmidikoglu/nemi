"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, List, Rows, X } from "lucide-react";
import { useAuthStore, useEmailStore } from "@/lib/store";
import EmailList from "@/components/EmailList";
import EmailDetail from "@/components/EmailDetail";
import EmailFilters from "@/components/EmailFilters";
import EmailSidebar from "@/components/EmailSidebar";
import { useEmailPolling } from "@/hooks/useEmailPolling";
import { useGmailPush } from "@/hooks/useGmailPush";
import { useNotifications } from "@/hooks/useNotifications";
import { useEmailTracking } from "@/hooks/useEmailTracking";
import type { SendEmailData } from "@/components/EmailCompose";

export default function FeedPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, checkAuth, logout, user } = useAuthStore();
  const {
    emails,
    selectedEmail,
    isLoading: emailsLoading,
    fetchEmails,
    selectEmail,
    markAsRead,
    toggleStar,
    deleteEmail,
    deleteEmails,
    syncEmails,
    setFilters,
    filters,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    page,
    totalPages,
    totalEmails,
    allEmailsCount,
    setPage,
    addPushedEmails,
  } = useEmailStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [emailListWidth, setEmailListWidth] = useState(35); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // const [analysisProgress, setAnalysisProgress] = useState<{ analyzed: number; total: number } | null>(null);
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Email tracking for analytics
  const { trackLinkClick } = useEmailTracking(selectedEmail?.id?.toString() || null);

  // Desktop notifications
  const { permission: notificationPermission } = useNotifications();

  // Email polling for new emails (fallback)
  const pollingInterval = typeof window !== "undefined" ? parseInt(localStorage.getItem("email_polling_interval") || "30") * 1000 : 30000;

  const { newEmailCount: pollingEmailCount, resetCount: resetPollingCount } = useEmailPolling({
    enabled: isAuthenticated && notificationPermission === "granted",
    interval: pollingInterval,
    onNewEmails: (newEmails) => {
      console.log(`${newEmails.length} new email(s) received via polling`);
      // Refresh the email list
      fetchEmails();
    },
  });

  // Gmail push notifications (instant, real-time)
  const {
    isConnected: isPushConnected,
    newEmailCount: pushEmailCount,
    resetCount: resetPushCount,
  } = useGmailPush({
    userId: user?.id?.toString(),
    enabled: isAuthenticated,
    onNewEmails: (pushedEmails, messageIds, count, emailAddress) => {
      console.log(`${count} new email(s) received via push from ${emailAddress}`, pushedEmails);

      // If we have full email data from the push, add them directly to the list
      if (pushedEmails && pushedEmails.length > 0) {
        // Transform pushed emails to match the Email type expected by the store
        const transformedEmails = pushedEmails.map((email) => ({
          id: email.id,
          messageId: email.messageId,
          threadId: email.threadId || undefined,
          subject: email.subject,
          from: email.fromName || email.fromEmail || 'Unknown',
          fromEmail: email.fromEmail,
          fromName: email.fromName || undefined,
          to: email.to || [],
          body: email.body || '',
          htmlBody: email.htmlBody || undefined,
          snippet: email.snippet || '',
          date: email.date,
          createdAt: email.date,
          isRead: email.isRead,
          isStarred: email.isStarred,
          hasAttachment: email.hasAttachments,
          hasAttachments: email.hasAttachments,
          category: email.category,
          importance: email.importance,
          isPersonallyRelevant: email.isPersonallyRelevant,
          summary: email.summary || undefined,
          masterImportanceScore: email.masterImportanceScore || undefined,
          badges: email.badges || [],
          companyName: email.companyName || undefined,
          companyLogoUrl: email.companyLogoUrl || undefined,
          senderProfilePhotoUrl: email.senderProfilePhotoUrl || undefined,
          isAboutMe: email.isAboutMe,
          mentionContext: email.mentionContext || undefined,
          htmlSnippet: email.htmlSnippet || undefined,
          renderAsHtml: email.renderAsHtml,
        }));

        addPushedEmails(transformedEmails as any);
      } else {
        // Fallback: refresh the email list if no email data was provided
        fetchEmails();
      }
    },
    onConnected: () => {
      console.log("Connected to Gmail push notifications");
    },
    onDisconnected: () => {
      console.log("Disconnected from Gmail push notifications");
    },
  });

  // Combined new email count (from both polling and push)
  const newEmailCount = pollingEmailCount + pushEmailCount;
  const resetCount = () => {
    resetPollingCount();
    resetPushCount();
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    } else if (isAuthenticated) {
      fetchEmails();
    }
  }, [isAuthenticated, authLoading, router, fetchEmails]);

  // Poll for analysis progress - COMMENTED OUT
  // useEffect(() => {
  //   if (!isAuthenticated) return;

  //   const checkAnalysisProgress = async () => {
  //     try {
  //       const response = await fetch("http://localhost:3000/api/emails/analysis-progress", {
  //         headers: {
  //           Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  //         },
  //       });
  //       if (response.ok) {
  //         const data = await response.json();
  //         if (data.total > 0 && data.analyzed < data.total) {
  //           setAnalysisProgress(data);
  //         } else {
  //           setAnalysisProgress(null);
  //         }
  //       }
  //     } catch (error) {
  //       // Silently fail
  //     }
  //   };

  //   checkAnalysisProgress();
  //   const interval = setInterval(checkAnalysisProgress, 2000); // Check every 2 seconds

  //   return () => clearInterval(interval);
  // }, [isAuthenticated]);

  // Debounce search input and trigger backend search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchQuery]);

  // Handle badge filter change - fetch from server with badge filter
  const handleBadgeChange = (badgeName: string | null) => {
    setActiveBadge(badgeName);

    if (badgeName) {
      // setFilters already resets page to 1 and calls fetchEmails
      setFilters({ ...filters, badgeName });
    } else {
      // Remove badgeName from filters
      const { badgeName: _, ...restFilters } = filters;
      setFilters(restFilters);
    }
  };

  // Use emails directly from store (server-side filtered)
  const filteredEmails = emails;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncEmails();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleFolderChange = (folder: string, accountId?: number) => {
    setActiveFolder(`${accountId}-${folder}`);
    setSelectedAccountId(accountId);

    // Update filters based on folder selection
    const newFilters: any = {};

    if (accountId) {
      newFilters.emailAccountId = accountId;
    }

    if (folder === "sent") {
      // TODO: Add sent folder filter when backend supports it
      newFilters.isSent = true;
    } else if (folder === "spam") {
      // TODO: Add spam folder filter when backend supports it
      newFilters.isSpam = true;
    } else if (folder === "automated") {
      // Filter by Automated badge
      newFilters.badgeName = "Automated";
    } else if (folder === "promotional") {
      // Filter by Promotional badge
      newFilters.badgeName = "Promotional";
    } else if (folder === "newsletter") {
      // Filter by Newsletter badge
      newFilters.badgeName = "Newsletter";
    }

    setFilters(newFilters);
    fetchEmails();
  };

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const container = document.querySelector(".main-content-container") as HTMLElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left - 256) / (containerRect.width - 256)) * 100; // 256px is sidebar width
    setEmailListWidth(Math.max(20, Math.min(80, newWidth))); // Clamp between 20% and 80%
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  const handleSendEmail = async (emailData: SendEmailData) => {
    try {
      const response = await fetch("http://localhost:3000/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      const result = await response.json();
      console.log("Email sent successfully:", result);

      // Optionally refresh emails to show sent email
      // fetchEmails();
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove as any);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove as any);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/feed" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/main-logo.png" alt="NEMI Logo" width={32} height={32} className="rounded" priority />
              <h1 className="text-2xl font-bold text-foreground">NEMI</h1>
            </Link>

            {/* View Toggle */}
            <button
              onClick={() => setViewMode(viewMode === "compact" ? "detailed" : "compact")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              title={viewMode === "compact" ? "Switch to detailed view" : "Switch to compact view"}
            >
              {viewMode === "compact" ? <Rows className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </button>
          </div>

          {/* Search Bar - Centered */}
          <div className="flex-1 flex items-center justify-center px-8 max-w-2xl mx-auto">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* New Email Notification Badge */}
          {newEmailCount > 0 && (
            <button
              onClick={() => {
                resetCount();
                fetchEmails();
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors animate-pulse"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="font-medium">{newEmailCount} new</span>
            </button>
          )}

          {/* Analysis Progress Indicator - COMMENTED OUT */}
          {/* {analysisProgress && (
            <div className="flex-1 flex items-center justify-center px-8">
              <div className="flex flex-col items-center gap-1 min-w-[200px] max-w-[400px] w-full">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>
                    Analyzing emails: {analysisProgress.analyzed} / {analysisProgress.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(analysisProgress.analyzed / analysisProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )} */}

          <div className="flex items-center gap-3">
            {/* Sync Button - Icon Only */}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="p-2.5 text-foreground hover:bg-accent rounded-full transition-colors disabled:opacity-50"
              title="Sync emails"
            >
              <svg className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Settings Button - Icon Only */}
            <button
              onClick={() => router.push("/settings")}
              className="p-2.5 text-foreground hover:bg-accent rounded-full transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Profile Button (opens accounts) - Icon Only */}
            <button
              onClick={() => router.push("/accounts")}
              className="p-2.5 text-foreground hover:bg-accent rounded-full transition-colors"
              title="Profile & Accounts"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden main-content-container">
        {/* Sidebar */}
        {isSidebarOpen && <EmailSidebar activeFolder={activeFolder} onFolderChange={handleFolderChange} />}

        {/* Email list section - single bordered container like Gmail */}
        <div
          className="bg-card border border-border rounded-lg m-2 flex flex-col overflow-hidden shadow-sm"
          style={{
            width: selectedEmail ? `${emailListWidth}%` : "100%",
            minWidth: selectedEmail ? "350px" : undefined,
          }}
        >
          {/* Email Filters inside the container */}
          <div className="border-b border-border">
            <EmailFilters emails={emails} activeBadge={activeBadge} onBadgeChange={handleBadgeChange} totalEmailCount={allEmailsCount || totalEmails} />
          </div>
          {/* Email list */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {emailsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <EmailList
                emails={filteredEmails}
                selectedEmailId={selectedEmail?.id || null}
                onSelectEmail={selectEmail}
                onToggleStar={toggleStar}
                onDeleteEmails={deleteEmails}
                viewMode={viewMode}
              />
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="border-t border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          page === pageNum ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resizer */}
        {selectedEmail && <div className="w-1 hover:bg-primary cursor-col-resize transition-colors" onMouseDown={handleMouseDown} />}

        {/* Email detail */}
        {selectedEmail && (
          <div className="flex-1 overflow-hidden bg-card border border-border rounded-lg m-2 ml-0 shadow-sm">
            <EmailDetail
              email={selectedEmail}
              onClose={() => selectEmail(null)}
              onDelete={deleteEmail}
              onToggleStar={toggleStar}
              onMarkAsRead={markAsRead}
              onSendEmail={handleSendEmail}
              onLinkClick={trackLinkClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
