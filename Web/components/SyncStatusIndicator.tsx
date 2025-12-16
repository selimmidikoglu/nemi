'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, Check, Mail } from 'lucide-react';
import { useEmailStore } from '@/lib/store';

interface AccountSyncStatus {
  id: string;
  emailAddress: string;
  initialSyncComplete: boolean;
  lastSyncAt: string | null;
  emailCount: number;
}

interface SyncStatus {
  accounts: AccountSyncStatus[];
  hasAccountsSyncing: boolean;
}

export default function SyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isSyncComplete, setIsSyncComplete] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const previousEmailCount = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedOnce = useRef(false);
  const fetchEmails = useEmailStore((state) => state.fetchEmails);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/email-accounts/sync-status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const data: SyncStatus = await response.json();
          const currentEmailCount = data.accounts.reduce((sum, a) => sum + a.emailCount, 0);

          // Refresh email list when new emails are synced
          if (currentEmailCount > previousEmailCount.current && previousEmailCount.current > 0) {
            fetchEmails();
          }
          previousEmailCount.current = currentEmailCount;

          setSyncStatus(data);

          // Show indicator if any account is still syncing
          if (data.hasAccountsSyncing) {
            setIsVisible(true);
            hasCheckedOnce.current = true;
          } else {
            // Only show completion if we were previously syncing
            if (hasCheckedOnce.current) {
              // Refresh one final time when sync completes
              if (currentEmailCount > 0) {
                fetchEmails();
              }
              setIsSyncComplete(true);
              setIsVisible(true);

              // Stop polling - sync is done
              stopPolling();

              // Hide after 3 seconds
              setTimeout(() => setIsVisible(false), 3000);
            } else {
              // First check and sync is already complete - don't show anything, stop polling
              stopPolling();
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch sync status:', error);
      }
    };

    // Initial fetch
    fetchSyncStatus();

    // Poll every 3 seconds while syncing
    intervalRef.current = setInterval(fetchSyncStatus, 3000);

    return () => stopPolling();
  }, [fetchEmails, stopPolling]);

  if (!isVisible || !syncStatus) return null;

  const totalEmails = syncStatus.accounts.reduce((sum, a) => sum + a.emailCount, 0);

  // If sync is complete, show completion message briefly
  if (isSyncComplete) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full animate-fade-in cursor-default transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
          <Check size={12} className="text-green-500" />
        </div>
        <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${isHovered ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'}`}>
          <span className="text-xs font-medium text-green-500 whitespace-nowrap">Sync complete!</span>
        </div>
        <span className="text-xs text-green-500/70 font-medium">{totalEmails}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 bg-primary/10 border border-primary/20 rounded-full animate-fade-in cursor-default transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated icon */}
      <div className="relative">
        <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
          <Mail size={12} className="text-primary" />
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
          <RefreshCw size={6} className="text-white animate-spin" />
        </div>
      </div>

      {/* Status text - only visible on hover */}
      <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${isHovered ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'}`}>
        <span className="text-xs font-medium text-foreground whitespace-nowrap">Syncing...</span>
      </div>

      {/* Email count - always visible */}
      {totalEmails > 0 && (
        <span className="text-xs text-muted-foreground font-medium">{totalEmails}</span>
      )}
    </div>
  );
}
