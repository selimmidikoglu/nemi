"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, List, Rows, X, SlidersHorizontal, ChevronDown, Minus } from "lucide-react";
import UndoToast, { useUndoToast } from "@/components/UndoToast";
import UnsubscribeNotification from "@/components/UnsubscribeNotification";
import SyncStatusIndicator from "@/components/SyncStatusIndicator";
import { useAuthStore, useEmailStore } from "@/lib/store";
import { apiService } from "@/lib/api";
import EmailList from "@/components/EmailList";
import EmailDetail from "@/components/EmailDetail";
import EmailFilters from "@/components/EmailFilters";
import EmailSidebar from "@/components/EmailSidebar";
import RightSidebar from "@/components/RightSidebar";
import { SendEmailData } from "@/components/EmailCompose";
import GmailCompose from "@/components/GmailCompose";
import AdvancedSearchModal from "@/components/AdvancedSearchModal";
import SendUndoToast, { useSendUndoToast } from "@/components/SendUndoToast";
import { useEmailPolling } from "@/hooks/useEmailPolling";
import { useGmailPush } from "@/hooks/useGmailPush";
import { useNotifications } from "@/hooks/useNotifications";
import { useEmailTracking, trackHtmlCardLinkClick } from "@/hooks/useEmailTracking";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function FeedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    archiveEmail: removeEmailFromList,
    snoozeEmail: removeSnoozeEmailFromList,
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
    refreshKey,
  } = useEmailStore();

  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>(() => {
    // Initialize from URL params
    const folder = searchParams.get('folder');
    const accountId = searchParams.get('accountId');
    if (folder && accountId) {
      return `${accountId}-${folder}`;
    }
    return "all";
  });

  // Undo toast for delete/archive/snooze actions
  const { currentAction, showToast, dismissToast } = useUndoToast();
  // Undo toast for email send
  const { toastData: sendUndoData, showUndoToast: showSendUndoToast, hideToast: hideSendUndoToast } = useSendUndoToast();

  // Search input ref for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<{ id: string; email: string }[]>([]);
  const [emailListWidth, setEmailListWidth] = useState(35); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // const [analysisProgress, setAnalysisProgress] = useState<{ analyzed: number; total: number } | null>(null);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedSearchFilters, setAdvancedSearchFilters] = useState<any>(null);
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<'calendar' | 'your_life' | 'reminders'>('your_life');

  // Full-screen email view (for calendar/action clicks)
  const [fullScreenEmail, setFullScreenEmail] = useState<typeof selectedEmail>(null);
  const [isLoadingFullScreenEmail, setIsLoadingFullScreenEmail] = useState(false);

  // Fetch email accounts on mount to enable compose
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/email-accounts`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const accounts = (data.email_accounts || []).map((a: any) => ({ id: a.id, email: a.email_address }));
          setEmailAccounts(accounts);
          // Don't auto-select - keep "All Emails" as default (selectedAccountId = null)
        }
      } catch (error) {
        console.error('Failed to fetch email accounts:', error);
      }
    };
    if (isAuthenticated) {
      fetchAccounts();
    }
  }, [isAuthenticated]);

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

  // Keyboard shortcuts
  useKeyboardShortcuts({
    // Navigation - j/k for next/prev email
    onNextEmail: () => {
      if (emails.length === 0) return;
      const currentIndex = selectedEmail
        ? emails.findIndex(e => e.id === selectedEmail.id)
        : -1;
      const nextIndex = currentIndex + 1;
      if (nextIndex < emails.length) {
        selectEmail(emails[nextIndex]);
      }
    },
    onPrevEmail: () => {
      if (emails.length === 0) return;
      const currentIndex = selectedEmail
        ? emails.findIndex(e => e.id === selectedEmail.id)
        : emails.length;
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        selectEmail(emails[prevIndex]);
      }
    },
    onOpenEmail: () => {
      // If no email selected, select the first one
      if (!selectedEmail && emails.length > 0) {
        selectEmail(emails[0]);
      }
    },
    onCloseEmail: () => {
      if (selectedEmail) {
        selectEmail(null);
      }
    },
    // Actions
    onArchive: () => {
      if (selectedEmail) {
        handleArchiveEmail(selectedEmail.id);
        // Move to next email after archive
        const currentIndex = emails.findIndex(e => e.id === selectedEmail.id);
        if (currentIndex < emails.length - 1) {
          selectEmail(emails[currentIndex + 1]);
        } else if (currentIndex > 0) {
          selectEmail(emails[currentIndex - 1]);
        } else {
          selectEmail(null);
        }
      }
    },
    onDelete: () => {
      if (selectedEmail) {
        handleSoftDeleteEmails([selectedEmail.id]);
        selectEmail(null);
      }
    },
    onReply: () => {
      if (selectedEmail) {
        setShowReplyBox(true);
      }
    },
    onToggleStar: () => {
      if (selectedEmail) {
        toggleStar(selectedEmail.id);
      }
    },
    onMarkRead: () => {
      if (selectedEmail && !selectedEmail.isRead) {
        markAsRead(selectedEmail.id, true);
      }
    },
    onMarkUnread: () => {
      if (selectedEmail && selectedEmail.isRead) {
        markAsRead(selectedEmail.id, false);
      }
    },
    // Global actions
    onCompose: () => {
      setShowComposeModal(true);
    },
    onSearch: () => {
      searchInputRef.current?.focus();
    },
    onRefresh: () => {
      fetchEmails();
    },
    // State
    hasSelectedEmail: !!selectedEmail,
    isComposeOpen: showComposeModal,
    isSearchFocused
  });

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

  // Track which email ID we've already loaded to prevent re-fetches
  const loadedEmailIdRef = useRef<string | null>(null);

  // Handle emailId URL parameter for full-screen email view
  useEffect(() => {
    const emailId = searchParams.get('emailId');

    if (!emailId) {
      // No emailId in URL - clear the full screen view
      setFullScreenEmail(null);
      loadedEmailIdRef.current = null;
      return;
    }

    if (!isAuthenticated) return;

    // Skip if we already loaded this email
    if (loadedEmailIdRef.current === emailId && fullScreenEmail?.id === emailId) {
      return;
    }

    // Load the email for full-screen view
    const loadEmail = async () => {
      // First check if it's in current list (instant, no loading state)
      const existingEmail = emails.find(e => e.id === emailId);
      if (existingEmail) {
        setFullScreenEmail(existingEmail);
        loadedEmailIdRef.current = emailId;
        return;
      }

      // Need to fetch from API
      setIsLoadingFullScreenEmail(true);
      try {
        const fetchedEmail = await apiService.getEmailById(emailId);
        setFullScreenEmail(fetchedEmail);
        loadedEmailIdRef.current = emailId;
      } catch (error) {
        console.error('Failed to load email:', error);
        router.replace('/feed', { scroll: false });
      } finally {
        setIsLoadingFullScreenEmail(false);
      }
    };
    loadEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated]);

  // Function to open email in full-screen mode (updates URL)
  const openFullScreenEmail = (emailId: string) => {
    // Check if email is already in list for instant display
    const existingEmail = emails.find(e => e.id === emailId);
    if (existingEmail) {
      setFullScreenEmail(existingEmail);
      loadedEmailIdRef.current = emailId;
    }
    router.push(`/feed?emailId=${emailId}`, { scroll: false });
  };

  // Function to close full-screen email view
  const closeFullScreenEmail = () => {
    setFullScreenEmail(null);
    loadedEmailIdRef.current = null;
    router.push('/feed', { scroll: false });
  };

  // Sync URL params with folder state on mount (run once when authenticated)
  const hasInitializedFromUrl = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || hasInitializedFromUrl.current) return;

    const folder = searchParams.get('folder');
    const accountId = searchParams.get('accountId');

    if (folder && accountId) {
      hasInitializedFromUrl.current = true;
      setActiveFolder(`${accountId}-${folder}`);
      setSelectedAccountId(accountId);

      // Apply filters based on URL folder
      const newFilters: any = { emailAccountId: accountId };

      if (folder === "sent") {
        newFilters.specialFolder = "sent";
      } else if (folder === "spam") {
        newFilters.specialFolder = "spam";
      } else if (folder === "automated") {
        newFilters.badgeName = "Automated";
      } else if (folder === "promotional") {
        newFilters.badgeName = "Promotional";
      } else if (folder === "newsletter") {
        newFilters.badgeName = "Newsletter";
      } else if (folder === "starred") {
        newFilters.specialFolder = "starred";
      } else if (folder === "snoozed") {
        newFilters.specialFolder = "snoozed";
      } else if (folder === "archived") {
        newFilters.specialFolder = "archived";
      } else if (folder === "deleted") {
        newFilters.specialFolder = "deleted";
      } else if (folder === "shopping") {
        newFilters.badgeName = "Shopping";
      }

      setFilters(newFilters);
    }
  }, [isAuthenticated, searchParams, setFilters]);

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

  // Close view mode dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showViewModeDropdown) {
        setShowViewModeDropdown(false);
      }
    };
    if (showViewModeDropdown) {
      // Delay adding listener to avoid immediate close
      setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showViewModeDropdown]);

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
      // Clicking "All" clears all filters including search
      setSearchInput("");
      setAdvancedSearchFilters(null);
      setFilters({});
    }
  };

  // Use emails directly from store (server-side filtered)
  const filteredEmails = emails;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleFolderChange = (folder: string, accountId?: string | null) => {
    // Handle navigation links (no accountId)
    if (folder === "analytics") {
      router.push("/analytics");
      return;
    } else if (folder === "badges") {
      router.push("/settings?tab=badges");
      return;
    } else if (folder === "unsubscribe") {
      router.push("/unsubscribe");
      return;
    }

    // Set active folder - use "all-folder" format for all emails, "accountId-folder" for specific accounts
    if (accountId === null || accountId === undefined) {
      setActiveFolder(`all-${folder}`);
      setSelectedAccountId(null);
    } else {
      setActiveFolder(`${accountId}-${folder}`);
      setSelectedAccountId(accountId);
    }

    // Update URL to persist folder selection
    if (accountId && folder) {
      const params = new URLSearchParams();
      params.set('folder', folder);
      params.set('accountId', String(accountId));
      router.replace(`/feed?${params.toString()}`, { scroll: false });
    } else {
      // Clear URL params when going to "all" or no specific folder
      router.replace('/feed', { scroll: false });
    }

    // Update filters based on folder selection
    const newFilters: any = {};

    // Only add emailAccountId filter if a specific account is selected
    if (accountId !== null && accountId !== undefined) {
      newFilters.emailAccountId = accountId;
    }
    // When accountId is null, don't add emailAccountId - shows all accounts

    console.log('📁 handleFolderChange:', { folder, accountId, newFilters });

    if (folder === "sent") {
      newFilters.specialFolder = "sent";
    } else if (folder === "spam") {
      newFilters.specialFolder = "spam";
    } else if (folder === "about-you") {
      newFilters.isPersonallyRelevant = true; // Premium feature - AI-detected personally relevant emails
    } else if (folder === "automated") {
      newFilters.badgeName = "Automated";
    } else if (folder === "promotional") {
      newFilters.badgeName = "Promotional";
    } else if (folder === "newsletter") {
      newFilters.badgeName = "Newsletter";
    } else if (folder === "starred") {
      newFilters.specialFolder = "starred";
    } else if (folder === "snoozed") {
      newFilters.specialFolder = "snoozed";
    } else if (folder === "archived") {
      newFilters.specialFolder = "archived";
    } else if (folder === "deleted") {
      newFilters.specialFolder = "deleted";
    } else if (folder === "shopping") {
      newFilters.badgeName = "Shopping";
    }

    console.log('📁 Final newFilters:', newFilters);
    // setFilters already calls fetchEmails internally
    setFilters(newFilters);
  };

  // Handle advanced search
  const handleAdvancedSearch = async (searchFilters: any) => {
    setAdvancedSearchFilters(searchFilters);

    // Build query string for API
    const params = new URLSearchParams();
    if (searchFilters.from) params.set('from', searchFilters.from);
    if (searchFilters.to) params.set('to', searchFilters.to);
    if (searchFilters.subject) params.set('subject', searchFilters.subject);
    if (searchFilters.hasWords) params.set('hasWords', searchFilters.hasWords);
    if (searchFilters.doesntHave) params.set('doesntHave', searchFilters.doesntHave);
    if (searchFilters.hasAttachment !== undefined) params.set('hasAttachment', String(searchFilters.hasAttachment));
    if (searchFilters.dateWithin) params.set('dateWithin', String(searchFilters.dateWithin));
    if (searchFilters.dateFrom) params.set('dateFrom', searchFilters.dateFrom);
    if (searchFilters.dateTo) params.set('dateTo', searchFilters.dateTo);

    // Update search input to show what's being searched
    const searchTerms = [];
    if (searchFilters.from) searchTerms.push(`from:${searchFilters.from}`);
    if (searchFilters.to) searchTerms.push(`to:${searchFilters.to}`);
    if (searchFilters.subject) searchTerms.push(`subject:${searchFilters.subject}`);
    if (searchFilters.hasWords) searchTerms.push(searchFilters.hasWords);
    if (searchFilters.hasAttachment) searchTerms.push('has:attachment');
    if (searchFilters.dateWithin) searchTerms.push(`within:${searchFilters.dateWithin}d`);
    setSearchInput(searchTerms.join(' '));

    // Set advanced filters in the store - setFilters already calls fetchEmails internally
    setFilters({
      ...filters,
      advancedSearch: searchFilters
    });
    // Note: Don't call fetchEmails() here - setFilters already triggers it
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

  const handleSnoozeEmail = async (id: string, snoozeUntil: Date) => {
    // Optimistically remove from UI immediately
    removeSnoozeEmailFromList(id);

    try {
      const response = await fetch(`http://localhost:3000/api/emails/${id}/snooze`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ snoozeUntil: snoozeUntil.toISOString() }),
      });

      if (!response.ok) {
        const error = await response.json();
        // On error, refresh to restore the email
        fetchEmails();
        throw new Error(error.message || "Failed to snooze email");
      }

      console.log("Email snoozed successfully");
    } catch (error) {
      console.error("Error snoozing email:", error);
      throw error;
    }
  };

  const handleUnsnoozeEmail = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/emails/${id}/snooze`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to unsnooze email");
      }

      console.log("Email unsnoozed successfully");
      fetchEmails(); // Refresh to update UI
    } catch (error) {
      console.error("Error unsnoozing email:", error);
      throw error;
    }
  };

  const handleArchiveEmail = async (id: string) => {
    // Find email subject before removing from list
    const email = emails.find(e => e.id === id);
    const emailSubject = email?.subject || "Email";

    // Optimistically remove from UI immediately
    removeEmailFromList(id);

    try {
      const response = await fetch(`http://localhost:3000/api/emails/${id}/archive`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        // On error, refresh to restore the email
        fetchEmails();
        throw new Error(error.message || "Failed to archive email");
      }

      console.log("Email archived successfully");

      // Show undo toast
      showToast({
        type: "archive",
        message: "Email archived",
        emailId: id,
        emailSubject,
        onUndo: async () => {
          await handleUnarchiveEmail(id);
          fetchEmails(); // Refresh to show restored email
        },
      });
    } catch (error) {
      console.error("Error archiving email:", error);
      throw error;
    }
  };

  const handleUnarchiveEmail = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/emails/${id}/archive`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to unarchive email");
      }

      console.log("Email unarchived successfully");
      fetchEmails(); // Refresh to update UI
    } catch (error) {
      console.error("Error unarchiving email:", error);
      throw error;
    }
  };

  // Soft delete (move to trash) with undo functionality
  const handleSoftDeleteEmails = async (ids: string[]) => {
    // Find email info before removing from list
    const emailsToDelete = emails.filter(e => ids.includes(e.id));
    const firstEmail = emailsToDelete[0];
    const emailSubject = firstEmail?.subject || "Email";
    const message = ids.length === 1 ? "Email moved to trash" : `${ids.length} emails moved to trash`;

    // Optimistically remove from UI immediately
    ids.forEach(id => removeEmailFromList(id));

    try {
      // Use soft delete for each email
      const promises = ids.map(id =>
        fetch(`http://localhost:3000/api/emails/${id}/trash`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        })
      );

      const responses = await Promise.all(promises);
      const failedResponses = responses.filter(r => !r.ok);

      if (failedResponses.length > 0) {
        // On error, refresh to restore emails
        fetchEmails();
        throw new Error("Failed to delete some emails");
      }

      console.log("Emails moved to trash successfully");

      // Show undo toast
      showToast({
        type: "delete",
        message,
        emailId: ids[0],
        emailSubject: ids.length === 1 ? emailSubject : undefined,
        onUndo: async () => {
          // Restore all emails from trash
          const restorePromises = ids.map(id =>
            fetch(`http://localhost:3000/api/emails/${id}/trash`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            })
          );
          await Promise.all(restorePromises);
          fetchEmails(); // Refresh to show restored emails
        },
      });
    } catch (error) {
      console.error("Error moving emails to trash:", error);
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
    <div className="h-screen flex flex-col bg-background overflow-x-hidden select-none">
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
            <div
              onClick={() => router.push('/feed')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Image src="/Nemi-logo.png" alt="NEMI Logo" width={32} height={32} className="rounded" priority />
              <span className="text-2xl font-bold text-foreground pointer-events-none">NEMI</span>
            </div>

            {/* View Mode Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                title="Change view mode"
              >
                {viewMode === "minimal" ? <Minus className="w-4 h-4" /> : viewMode === "compact" ? <List className="w-4 h-4" /> : <Rows className="w-4 h-4" />}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showViewModeDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                  <button
                    onClick={() => { setViewMode("minimal"); setShowViewModeDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${viewMode === "minimal" ? "bg-accent text-primary" : "text-foreground"}`}
                  >
                    <Minus className="w-4 h-4" />
                    Minimal
                  </button>
                  <button
                    onClick={() => { setViewMode("compact"); setShowViewModeDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${viewMode === "compact" ? "bg-accent text-primary" : "text-foreground"}`}
                  >
                    <List className="w-4 h-4" />
                    Compact
                  </button>
                  <button
                    onClick={() => { setViewMode("detailed"); setShowViewModeDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${viewMode === "detailed" ? "bg-accent text-primary" : "text-foreground"}`}
                  >
                    <Rows className="w-4 h-4" />
                    Detailed
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar - Centered */}
          <div className="flex-1 flex items-center justify-center px-8 max-w-2xl mx-auto">
            <div className="relative w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search emails... (press / to focus)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full pl-10 pr-10 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                {(searchInput || advancedSearchFilters) && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setAdvancedSearchFilters(null);
                      setFilters({});
                      fetchEmails();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Advanced Search Button */}
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className={`p-2 rounded-lg transition-colors ${
                  advancedSearchFilters
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                title="Advanced search"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
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
            {/* Sync Status Indicator */}
            <SyncStatusIndicator />

            {/* Unsubscribe Recommendations Notification */}
            <UnsubscribeNotification />

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
        {isSidebarOpen && (
          <EmailSidebar
            activeFolder={activeFolder}
            onFolderChange={handleFolderChange}
            onCompose={() => setShowComposeModal(true)}
            selectedAccountId={selectedAccountId}
          />
        )}

        {/* Full-screen email view (when opened from calendar/actions) */}
        {fullScreenEmail ? (
          <div className="flex-1 bg-card border border-border rounded-lg m-2 flex flex-col overflow-hidden shadow-sm">
            {isLoadingFullScreenEmail ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <EmailDetail
                email={fullScreenEmail}
                onClose={closeFullScreenEmail}
                onDelete={(id) => {
                  deleteEmail(id);
                  closeFullScreenEmail();
                }}
                onToggleStar={toggleStar}
                onMarkAsRead={markAsRead}
                onSendEmail={handleSendEmail}
                onLinkClick={trackLinkClick}
                onSnooze={async (id, date) => {
                  await handleSnoozeEmail(id, date);
                  closeFullScreenEmail();
                }}
                onUnsnooze={handleUnsnoozeEmail}
                onArchive={async (id) => {
                  await handleArchiveEmail(id);
                  closeFullScreenEmail();
                }}
                onUnarchive={handleUnarchiveEmail}
              />
            )}
          </div>
        ) : (
          <>
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
                <EmailFilters emails={emails} activeBadge={activeBadge} onBadgeChange={handleBadgeChange} totalEmailCount={totalEmails} refreshKey={refreshKey} emailAccountId={selectedAccountId} />
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
                    onDeleteEmails={handleSoftDeleteEmails}
                    onArchiveEmail={handleArchiveEmail}
                    onUnarchiveEmail={handleUnarchiveEmail}
                    onSnoozeEmail={handleSnoozeEmail}
                    onUnsnoozeEmail={handleUnsnoozeEmail}
                    onHtmlCardLinkClick={trackHtmlCardLinkClick}
                    viewMode={viewMode}
                    isArchivedView={filters.specialFolder === 'archived'}
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
                  threadEmails={
                    // Get all emails in the same thread, sorted by date (newest first)
                    selectedEmail.threadId
                      ? emails
                          .filter(e => e.threadId === selectedEmail.threadId)
                          .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
                      : undefined
                  }
                  onClose={() => selectEmail(null)}
                  onDelete={deleteEmail}
                  onToggleStar={toggleStar}
                  onMarkAsRead={markAsRead}
                  onSendEmail={handleSendEmail}
                  onLinkClick={trackLinkClick}
                  onSnooze={handleSnoozeEmail}
                  onUnsnooze={handleUnsnoozeEmail}
                  onArchive={handleArchiveEmail}
                  onUnarchive={handleUnarchiveEmail}
                />
              </div>
            )}
          </>
        )}

        {/* Right Sidebar - Calendar/Your Life/Reminders */}
        <RightSidebar
          isOpen={isRightSidebarOpen}
          onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          activeTab={rightSidebarTab}
          onTabChange={setRightSidebarTab}
          onEmailClick={openFullScreenEmail}
        />
      </div>

      {/* Undo Toast for delete/archive/snooze actions */}
      <UndoToast action={currentAction} onDismiss={dismissToast} />

      {/* Gmail-style Compose Modal - bottom right */}
      {showComposeModal && selectedAccountId !== null && (
        <GmailCompose
          emailAccountId={String(selectedAccountId)}
          onClose={() => setShowComposeModal(false)}
          onSend={async (emailData) => {
            await handleSendEmail({
              to: emailData.to,
              cc: emailData.cc,
              bcc: emailData.bcc,
              subject: emailData.subject,
              text: emailData.text,
              emailAccountId: emailData.emailAccountId,
            });
          }}
          onScheduledSend={(scheduledEmailId, subject, to) => {
            showSendUndoToast({ scheduledEmailId, subject, to });
          }}
        />
      )}

      {/* Send Undo Toast - for undo send feature */}
      {sendUndoData && (
        <SendUndoToast
          scheduledEmailId={sendUndoData.scheduledEmailId}
          subject={sendUndoData.subject}
          to={sendUndoData.to}
          undoDelay={sendUndoData.undoDelay}
          onUndo={() => {
            console.log('Email send cancelled');
          }}
          onSent={() => {
            console.log('Email sent successfully');
          }}
          onDismiss={hideSendUndoToast}
        />
      )}

      {/* Show account selection if no account selected (All Emails view) */}
      {showComposeModal && selectedAccountId === null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {emailAccounts.length === 0 ? 'No email accounts' : 'Select an email account'}
            </h2>
            {emailAccounts.length === 0 ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Please add an email account first to compose emails.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowComposeModal(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setShowComposeModal(false); router.push('/accounts'); }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                  >
                    Add Account
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Choose which account to send from:
                </p>
                <div className="space-y-2 mb-4">
                  {emailAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccountId(account.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                        {account.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white">{account.email}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
        initialQuery={searchInput}
      />
    </div>
  );
}
