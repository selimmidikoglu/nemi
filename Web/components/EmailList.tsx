"use client";

import { useState, useEffect, useRef } from "react";
import { Star, Paperclip, ChevronRight, AtSign, Trash2, CheckSquare, Square, Archive, ArchiveRestore, Clock, AlarmClockOff, MailX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Email } from "@/types";
import Image from "next/image";
import EmailHtmlCard from "./EmailHtmlCard";
import { formatDistanceToNow, format, isToday, isYesterday, differenceInHours } from "date-fns";
import { useTheme } from "next-themes";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (email: Email) => void;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onDeleteEmails?: (ids: string[]) => Promise<void>;
  onArchiveEmail?: (id: string) => Promise<void>;
  onUnarchiveEmail?: (id: string) => Promise<void>;  // For unarchiving from archived view
  onSnoozeEmail?: (id: string, snoozeUntil: Date) => Promise<void>;
  onUnsnoozeEmail?: (id: string) => Promise<void>;
  onUnsubscribe?: (id: string) => Promise<void>;
  onHtmlCardLinkClick?: (emailId: string, url: string) => void;  // Track link clicks from HTML cards
  viewMode: "compact" | "detailed" | "minimal";
  isArchivedView?: boolean;  // When true, show unarchive instead of archive button
}

// Generate Gravatar URL from email address using MD5 hash
// We use a simple MD5 implementation for browser compatibility
const getGravatarUrl = (email: string, size: number = 24): string => {
  const cleanEmail = email.toLowerCase().trim();
  const hash = md5(cleanEmail);
  // Use 404 as default to detect if no gravatar exists, then fallback to initials
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
};

// Simple MD5 implementation for Gravatar (browser-compatible)
const md5 = (str: string): string => {
  const rotateLeft = (val: number, shift: number) => (val << shift) | (val >>> (32 - shift));

  const addUnsigned = (x: number, y: number) => {
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
    if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
    if (x4 | y4) {
      if (result & 0x40000000) return result ^ 0xC0000000 ^ x8 ^ y8;
      return result ^ 0x40000000 ^ x8 ^ y8;
    }
    return result ^ x8 ^ y8;
  };

  const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
  const H = (x: number, y: number, z: number) => x ^ y ^ z;
  const I = (x: number, y: number, z: number) => y ^ (x | ~z);

  const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, F(b, c, d)), addUnsigned(x, ac)), s), b);
  const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, G(b, c, d)), addUnsigned(x, ac)), s), b);
  const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, H(b, c, d)), addUnsigned(x, ac)), s), b);
  const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, I(b, c, d)), addUnsigned(x, ac)), s), b);

  const convertToWordArray = (str: string) => {
    let wordCount;
    const msgLength = str.length;
    const numWords = (((msgLength + 8) - ((msgLength + 8) % 64)) / 64 + 1) * 16;
    const wordArray = new Array(numWords - 1);
    let bytePos = 0;
    let byteCount = 0;
    while (byteCount < msgLength) {
      wordCount = (byteCount - (byteCount % 4)) / 4;
      bytePos = (byteCount % 4) * 8;
      wordArray[wordCount] = wordArray[wordCount] | (str.charCodeAt(byteCount) << bytePos);
      byteCount++;
    }
    wordCount = (byteCount - (byteCount % 4)) / 4;
    bytePos = (byteCount % 4) * 8;
    wordArray[wordCount] = wordArray[wordCount] | (0x80 << bytePos);
    wordArray[numWords - 2] = msgLength << 3;
    wordArray[numWords - 1] = msgLength >>> 29;
    return wordArray;
  };

  const wordToHex = (val: number) => {
    let result = '';
    for (let i = 0; i <= 3; i++) {
      const byte = (val >>> (i * 8)) & 255;
      result += ('0' + byte.toString(16)).slice(-2);
    }
    return result;
  };

  const x = convertToWordArray(str);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k], 7, 0xD76AA478); d = FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070DB); b = FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF); d = FF(d, a, b, c, x[k + 5], 12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], 17, 0xA8304613); b = FF(b, c, d, a, x[k + 7], 22, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098D8); d = FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1); b = FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], 7, 0x6B901122); d = FF(d, a, b, c, x[k + 13], 12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], 17, 0xA679438E); b = FF(b, c, d, a, x[k + 15], 22, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], 5, 0xF61E2562); d = GG(d, a, b, c, x[k + 6], 9, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], 14, 0x265E5A51); b = GG(b, c, d, a, x[k], 20, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], 5, 0xD62F105D); d = GG(d, a, b, c, x[k + 10], 9, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681); b = GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6); d = GG(d, a, b, c, x[k + 14], 9, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87); b = GG(b, c, d, a, x[k + 8], 20, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905); d = GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], 14, 0x676F02D9); b = GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942); d = HH(d, a, b, c, x[k + 8], 11, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122); b = HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44); d = HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60); b = HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6); d = HH(d, a, b, c, x[k], 11, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085); b = HH(b, c, d, a, x[k + 6], 23, 0x4881D05);
    a = HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039); d = HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8); b = HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665);
    a = II(a, b, c, d, x[k], 6, 0xF4292244); d = II(d, a, b, c, x[k + 7], 10, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], 15, 0xAB9423A7); b = II(b, c, d, a, x[k + 5], 21, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], 6, 0x655B59C3); d = II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D); b = II(b, c, d, a, x[k + 1], 21, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F); d = II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], 15, 0xA3014314); b = II(b, c, d, a, x[k + 13], 21, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], 6, 0xF7537E82); d = II(d, a, b, c, x[k + 11], 10, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB); b = II(b, c, d, a, x[k + 9], 21, 0xEB86D391);
    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
};

// Check if we should show company logo (trust backend validation)
const shouldShowCompanyLogo = (companyName: string | null | undefined): boolean => {
  // If we have a company name from the backend, trust it
  // The backend already validated this when saving the email
  return !!companyName;
};

// Parse sender string (e.g., "Name <email@example.com>" or just "email@example.com")
const parseSender = (fromField: string | { name?: string; email?: string } | undefined): { name: string; email: string } => {
  if (!fromField) {
    return { name: 'Unknown', email: '' };
  }

  // If it's an object with name/email
  if (typeof fromField === 'object') {
    return {
      name: fromField.name || fromField.email || 'Unknown',
      email: fromField.email || ''
    };
  }

  // If it's a string, parse "Name <email>" format
  const fromString = String(fromField);
  const match = fromString.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim()
    };
  }

  // Just an email address
  return {
    name: fromString,
    email: fromString
  };
};

// Get initials from name or email
const getInitials = (name: string, email: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }
  // Fallback to email
  return email[0]?.toUpperCase() || '?';
};

// Generate a consistent color based on email
const getAvatarColor = (email: string): string => {
  const colors = [
    '#F87171', '#FB923C', '#FBBF24', '#A3E635', '#4ADE80',
    '#34D399', '#22D3D8', '#38BDF8', '#60A5FA', '#818CF8',
    '#A78BFA', '#C084FC', '#E879F9', '#F472B6', '#FB7185'
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Helper function to convert hex color to RGB with opacity
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const getBadgeStyle = (color: string) => {
  const rgb = hexToRgb(color);
  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    color: color,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
  };
};

// Filter out non-meaningful badges (importance levels and generic categories)
const filterMeaningfulBadges = (badges: any[] | undefined, companyName?: string | null) => {
  if (!badges) return [];
  const excludedNames = ['low', 'normal', 'high', 'critical', 'other', 'general', 'misc'];
  return badges.filter((b: any) => {
    const name = b.name?.toLowerCase() || '';
    return !excludedNames.includes(name) && b.name !== companyName;
  });
};

// Helper to format email date (clean format without "about" or "ago")
const formatEmailDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const hoursAgo = differenceInHours(now, date);

  // Today: show time
  if (isToday(date)) {
    return format(date, "h:mm a");
  }

  // Yesterday
  if (isYesterday(date)) {
    return "Yesterday";
  }

  // Less than 7 days ago: show day name
  if (hoursAgo < 168) { // 7 days * 24 hours
    return format(date, "EEE"); // Mon, Tue, etc.
  }

  // Older: show short date format
  return format(date, "MMM d");
};

// Group emails into threads using Gmail's native threadId
// Falls back to treating each email as a single thread if no threadId
const groupEmailsIntoThreads = (emails: Email[]): Map<string, Email[]> => {
  const threads = new Map<string, Email[]>();

  emails.forEach((email) => {
    // Use Gmail's native threadId if available, otherwise treat as a single email thread
    // This ensures emails are only grouped together if Gmail says they're in the same conversation
    const threadKey = email.threadId || `single-${email.id}`;

    if (!threads.has(threadKey)) {
      threads.set(threadKey, []);
    }
    threads.get(threadKey)!.push(email);
  });

  // Sort emails within each thread by date (newest first)
  threads.forEach((threadEmails) => {
    threadEmails.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();
      return dateB - dateA; // Newest first
    });
  });

  return threads;
};

// Sender Avatar component: Profile Photo -> Company Logo -> Initials
// Gravatar removed as it causes too many failed requests
const SenderAvatar = ({
  email,
  name,
  size = 24,
  companyLogoUrl,
  companyName,
  senderProfilePhotoUrl
}: {
  email: string;
  name: string;
  size?: number;
  companyLogoUrl?: string | null;
  companyName?: string | null;
  senderProfilePhotoUrl?: string | null;
}) => {
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [companyLogoError, setCompanyLogoError] = useState(false);

  // Reset error states when props change
  useEffect(() => {
    setProfilePhotoError(false);
    setCompanyLogoError(false);
  }, [email, senderProfilePhotoUrl, companyLogoUrl]);

  const initials = getInitials(name, email);
  const bgColor = getAvatarColor(email);

  // Priority 1: Try Google People API profile photo (real profile picture)
  if (senderProfilePhotoUrl && !profilePhotoError) {
    return (
      <img
        src={senderProfilePhotoUrl}
        alt={name || email}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setProfilePhotoError(true)}
        title={name || email}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Priority 2: Try Company Logo
  if (companyLogoUrl && !companyLogoError) {
    return (
      <Image
        src={companyLogoUrl}
        alt={companyName || "Company logo"}
        width={size}
        height={size}
        className="rounded-full object-cover bg-white flex-shrink-0"
        unoptimized
        onError={() => setCompanyLogoError(true)}
      />
    );
  }

  // Priority 3: Show initials fallback (based on email address for unique colors)
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize: size * 0.4,
      }}
      title={name || email}
    >
      {initials}
    </div>
  );
};

export default function EmailList({ emails, selectedEmailId, onSelectEmail, onToggleStar, onDeleteEmails, onArchiveEmail, onUnarchiveEmail, onSnoozeEmail, onUnsnoozeEmail, onUnsubscribe, onHtmlCardLinkClick, viewMode, isArchivedView }: EmailListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hideBadges, setHideBadges] = useState(false);        // Hide badges when narrow
  const [stackLayout, setStackLayout] = useState(false);       // Stack HTML card below header when very narrow
  const [hoveredEmailId, setHoveredEmailId] = useState<string | null>(null);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // Use ResizeObserver for progressive width-based layout changes
  // Thresholds adapt based on screen size - smaller screens hide badges earlier
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const screenWidth = window.innerWidth;

        // Adaptive thresholds based on screen size:
        // - Large screens (≥1600px): hide badges at 600px container width
        // - Medium screens (1200-1600px): hide badges at 700px
        // - Small screens (<1200px, like 14" MacBook): hide badges at 800px
        const badgeThreshold = screenWidth >= 1600 ? 600 : screenWidth >= 1200 ? 700 : 800;
        const stackThreshold = 400;

        setHideBadges(containerWidth < badgeThreshold);
        setStackLayout(containerWidth < stackThreshold);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  const handleDeleteClick = () => {
    if (!onDeleteEmails || selectedIds.size === 0) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDeleteEmails) return;
    setShowDeleteModal(false);
    setIsDeleting(true);
    try {
      await onDeleteEmails(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsDeleting(false);
    }
  };

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">No emails found</p>
          <p className="text-sm mt-2">Try syncing your email accounts</p>
        </div>
      </div>
    );
  }
  // Group emails into threads
  const threads = groupEmailsIntoThreads(emails);
  const threadArray = Array.from(threads.values());

  // Sort threads by the date of their newest email (first email in each thread)
  threadArray.sort((a, b) => {
    const dateA = new Date(a[0].date || a[0].createdAt).getTime();
    const dateB = new Date(b[0].date || b[0].createdAt).getTime();
    return dateB - dateA; // Newest first
  });

  // Snooze time options
  const getSnoozeOptions = () => {
    const now = new Date();
    const laterToday = new Date(now);
    laterToday.setHours(18, 0, 0, 0); // 6 PM today

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0); // 9 AM next week

    return [
      { label: "Later today", time: laterToday, show: now.getHours() < 17 },
      { label: "Tomorrow", time: tomorrow, show: true },
      { label: "Next week", time: nextWeek, show: true },
    ].filter(opt => opt.show);
  };

  // Handle hover action clicks
  const handleQuickDelete = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDeleteEmails) {
      await onDeleteEmails([emailId]);
    }
  };

  const handleQuickArchive = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (onArchiveEmail) {
      await onArchiveEmail(emailId);
    }
  };

  const handleQuickUnarchive = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (onUnarchiveEmail) {
      await onUnarchiveEmail(emailId);
    }
  };

  const handleQuickSnooze = async (e: React.MouseEvent, emailId: string, snoozeUntil: Date) => {
    e.stopPropagation();
    e.preventDefault();
    setShowSnoozeMenu(null);
    if (onSnoozeEmail) {
      await onSnoozeEmail(emailId, snoozeUntil);
    }
  };

  const handleQuickUnsnooze = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (onUnsnoozeEmail) {
      await onUnsnoozeEmail(emailId);
    }
  };

  const handleQuickUnsubscribe = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (onUnsubscribe) {
      await onUnsubscribe(emailId);
    }
  };

  // Hover Actions Component - Responsive: top-center on large screens, top-right compact on small screens
  const HoverActions = ({ emailId, hasUnsubscribe, isRead, isSnoozed, compact }: { emailId: string; hasUnsubscribe?: boolean; isRead?: boolean; isSnoozed?: boolean; compact?: boolean }) => {
    const isDark = resolvedTheme === 'dark';

    // Vertical gradient for large screens (coming from top)
    const getVerticalGradient = () => {
      if (isDark) {
        return !isRead
          ? 'linear-gradient(to bottom, rgba(23, 37, 84, 0.95) 0%, rgba(23, 37, 84, 0.7) 70%, transparent 100%)'
          : 'linear-gradient(to bottom, rgba(17, 24, 39, 0.95) 0%, rgba(17, 24, 39, 0.7) 70%, transparent 100%)';
      }
      return !isRead
        ? 'linear-gradient(to bottom, rgba(239, 246, 255, 0.95) 0%, rgba(239, 246, 255, 0.7) 70%, transparent 100%)'
        : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.7) 70%, transparent 100%)';
    };

    // Horizontal gradient for small screens (coming from right)
    const getHorizontalGradient = () => {
      if (isDark) {
        return !isRead
          ? 'linear-gradient(to right, transparent 0%, rgba(23, 37, 84, 0.97) 25%)'
          : 'linear-gradient(to right, transparent 0%, rgba(17, 24, 39, 0.97) 25%)';
      }
      return !isRead
        ? 'linear-gradient(to right, transparent 0%, rgba(239, 246, 255, 0.97) 25%)'
        : 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.97) 25%)';
    };

    const isHovered = hoveredEmailId === emailId;

    return (
      <>
        {/* Large screen version - Top center dropdown */}
        <div
          className={cn(
            "hidden lg:flex absolute left-1/2 -translate-x-1/2 top-0 items-center gap-1 px-3 py-2 rounded-b-xl transition-all duration-500 ease-out z-10",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
          )}
          style={{ background: getVerticalGradient() }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Archive / Unarchive */}
          {isArchivedView && onUnarchiveEmail ? (
            <button
              onClick={(e) => handleQuickUnarchive(e, emailId)}
              className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-muted-foreground hover:text-green-600 transition-all duration-150 hover:scale-110"
              title="Unarchive"
            >
              <ArchiveRestore className="w-[18px] h-[18px]" />
            </button>
          ) : onArchiveEmail && (
            <button
              onClick={(e) => handleQuickArchive(e, emailId)}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-110"
              title="Archive"
            >
              <Archive className="w-[18px] h-[18px]" />
            </button>
          )}

          {/* Snooze / Unsnooze */}
          {isSnoozed && onUnsnoozeEmail ? (
            <button
              onClick={(e) => handleQuickUnsnooze(e, emailId)}
              className="p-2 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-500 hover:text-orange-600 transition-all duration-150 hover:scale-110"
              title="Unsnooze"
            >
              <AlarmClockOff className="w-[18px] h-[18px]" />
            </button>
          ) : onSnoozeEmail && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowSnoozeMenu(showSnoozeMenu === emailId ? null : emailId);
                }}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-110"
                title="Snooze"
              >
                <Clock className="w-[18px] h-[18px]" />
              </button>

              {/* Snooze dropdown */}
              {showSnoozeMenu === emailId && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                  {getSnoozeOptions().map((option) => (
                    <button
                      key={option.label}
                      onClick={(e) => handleQuickSnooze(e, emailId, option.time)}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unsubscribe */}
          {onUnsubscribe && hasUnsubscribe && (
            <button
              onClick={(e) => handleQuickUnsubscribe(e, emailId)}
              className="p-2 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 text-muted-foreground hover:text-orange-500 transition-all duration-150 hover:scale-110"
              title="Unsubscribe"
            >
              <MailX className="w-[18px] h-[18px]" />
            </button>
          )}

          {/* Delete */}
          {onDeleteEmails && (
            <button
              onClick={(e) => handleQuickDelete(e, emailId)}
              className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-all duration-150 hover:scale-110"
              title="Delete"
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        {/* Small screen version - Top right corner when compact, else right side slide */}
        <div
          className={cn(
            "lg:hidden absolute flex items-center transition-all duration-300 ease-out z-10",
            compact
              ? "right-2 top-1 gap-0 bg-card/95 rounded-lg shadow-sm border border-border/50 px-1 py-0.5"
              : "right-0 top-0 bottom-0 gap-0.5 pr-3 pl-10",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none",
            !compact && (isHovered ? "translate-x-0" : "translate-x-10")
          )}
          style={compact ? undefined : { background: getHorizontalGradient() }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Archive / Unarchive */}
          {isArchivedView && onUnarchiveEmail ? (
            <button
              onClick={(e) => handleQuickUnarchive(e, emailId)}
              className={cn(
                "rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-muted-foreground hover:text-green-600 transition-all duration-150",
                compact ? "p-1" : "p-2 hover:scale-110"
              )}
              title="Unarchive"
            >
              <ArchiveRestore className={compact ? "w-3.5 h-3.5" : "w-[18px] h-[18px]"} />
            </button>
          ) : onArchiveEmail && (
            <button
              onClick={(e) => handleQuickArchive(e, emailId)}
              className={cn(
                "rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-150",
                compact ? "p-1" : "p-2 hover:scale-110"
              )}
              title="Archive"
            >
              <Archive className={compact ? "w-3.5 h-3.5" : "w-[18px] h-[18px]"} />
            </button>
          )}

          {/* Snooze / Unsnooze */}
          {isSnoozed && onUnsnoozeEmail ? (
            <button
              onClick={(e) => handleQuickUnsnooze(e, emailId)}
              className={cn(
                "rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-500 hover:text-orange-600 transition-all duration-150",
                compact ? "p-1" : "p-2 hover:scale-110"
              )}
              title="Unsnooze"
            >
              <AlarmClockOff className={compact ? "w-3.5 h-3.5" : "w-[18px] h-[18px]"} />
            </button>
          ) : onSnoozeEmail && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowSnoozeMenu(showSnoozeMenu === emailId ? null : emailId);
                }}
                className={cn(
                  "rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-150",
                  compact ? "p-1" : "p-2 hover:scale-110"
                )}
                title="Snooze"
              >
                <Clock className={compact ? "w-3.5 h-3.5" : "w-[18px] h-[18px]"} />
              </button>

              {/* Snooze dropdown */}
              {showSnoozeMenu === emailId && (
                <div className={cn(
                  "absolute top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 py-1",
                  compact ? "right-0 min-w-[120px]" : "right-0 min-w-[140px]"
                )}>
                  {getSnoozeOptions().map((option) => (
                    <button
                      key={option.label}
                      onClick={(e) => handleQuickSnooze(e, emailId, option.time)}
                      className={cn(
                        "w-full px-3 text-left hover:bg-accent transition-colors",
                        compact ? "py-1 text-xs" : "py-1.5 text-sm"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete - always show in compact, skip unsubscribe to save space */}
          {onDeleteEmails && (
            <button
              onClick={(e) => handleQuickDelete(e, emailId)}
              className={cn(
                "rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-all duration-150",
                compact ? "p-1" : "p-2 hover:scale-110"
              )}
              title="Delete"
            >
              <Trash2 className={compact ? "w-3.5 h-3.5" : "w-[18px] h-[18px]"} />
            </button>
          )}

          {/* Unsubscribe - only show in non-compact mode */}
          {!compact && onUnsubscribe && hasUnsubscribe && (
            <button
              onClick={(e) => handleQuickUnsubscribe(e, emailId)}
              className="p-2 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 text-muted-foreground hover:text-orange-500 transition-all duration-150 hover:scale-110"
              title="Unsubscribe"
            >
              <MailX className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-2 flex items-center gap-3">
          <button onClick={selectAll} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
            {selectedIds.size === emails.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span>{selectedIds.size} selected</span>
          </button>
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Clear selection
          </button>
        </div>
      )}

      <div className="divide-y divide-border">
        {threadArray.map((threadEmails) => {
          const mainEmail = threadEmails[0]; // Newest email in thread
          const previousEmails = threadEmails.slice(1); // Older emails in thread

          // Parse sender info properly (handles "Name <email>" format)
          const sender = parseSender(mainEmail.from);
          const fromText = sender.name;
          const emailAddress = sender.email;

          // Only use company info if it actually matches the sender's domain
          const companyMatches = shouldShowCompanyLogo(mainEmail.companyName);
          const validCompanyName = companyMatches ? mainEmail.companyName : null;
          const validCompanyLogo = companyMatches ? mainEmail.companyLogoUrl : null;

          return (
            <div key={`thread-${mainEmail.id}`} className="w-full">
              {viewMode === "minimal" ? (
                /* MINIMAL VIEW - Clean one-liner with HTML summary content */
                (() => {
                  // Parse HTML snippet to extract emoji, title, description, button, and button color
                  let htmlEmoji: string | null = null;
                  let htmlTitle: string | null = null;
                  let htmlDescription: string | null = null;
                  let htmlButtonText: string | null = null;
                  let htmlButtonUrl: string | null = null;
                  let htmlButtonColor: string | null = null;

                  // Tailwind color class to hex mapping (from AI-generated HTML)
                  const tailwindColorMap: Record<string, string> = {
                    'bg-blue-500': '#3b82f6', 'bg-blue-600': '#2563eb', 'bg-blue-700': '#1d4ed8',
                    'bg-indigo-500': '#6366f1', 'bg-indigo-600': '#4f46e5', 'bg-indigo-700': '#4338ca',
                    'bg-purple-500': '#a855f7', 'bg-purple-600': '#9333ea', 'bg-purple-700': '#7e22ce',
                    'bg-green-500': '#22c55e', 'bg-green-600': '#16a34a', 'bg-green-700': '#15803d',
                    'bg-red-500': '#ef4444', 'bg-red-600': '#dc2626', 'bg-red-700': '#b91c1c',
                    'bg-amber-500': '#f59e0b', 'bg-amber-600': '#d97706', 'bg-amber-700': '#b45309',
                    'bg-orange-500': '#f97316', 'bg-orange-600': '#ea580c', 'bg-orange-700': '#c2410c',
                    'bg-pink-500': '#ec4899', 'bg-pink-600': '#db2777', 'bg-pink-700': '#be185d',
                    'bg-sky-500': '#0ea5e9', 'bg-sky-600': '#0284c7',
                    'bg-teal-500': '#14b8a6', 'bg-teal-600': '#0d9488',
                    'bg-cyan-500': '#06b6d4', 'bg-cyan-600': '#0891b2',
                    'bg-emerald-500': '#10b981', 'bg-emerald-600': '#059669',
                    'bg-rose-500': '#f43f5e', 'bg-rose-600': '#e11d48',
                    'bg-violet-500': '#8b5cf6', 'bg-violet-600': '#7c3aed',
                    'bg-fuchsia-500': '#d946ef', 'bg-fuchsia-600': '#c026d3',
                    'bg-gray-600': '#4b5563', 'bg-gray-700': '#374151', 'bg-gray-800': '#1f2937',
                  };

                  if (mainEmail.renderAsHtml && mainEmail.htmlSnippet) {
                    // Extract emoji from span with text-lg class (e.g., <span class="text-lg">📰</span>)
                    const emojiMatch = mainEmail.htmlSnippet.match(/<span[^>]*class="[^"]*text-lg[^"]*"[^>]*>([^<]+)<\/span>/i);
                    if (emojiMatch) htmlEmoji = emojiMatch[1].trim();

                    // Extract all p tags - first one is usually title, second is description
                    const pMatches = mainEmail.htmlSnippet.match(/<p[^>]*>([^<]+)<\/p>/gi);
                    if (pMatches && pMatches.length > 0) {
                      // First p tag is the title
                      const titleContent = pMatches[0].match(/<p[^>]*>([^<]+)<\/p>/i);
                      if (titleContent) htmlTitle = titleContent[1].trim();

                      // Second p tag is the description (if exists)
                      if (pMatches.length > 1) {
                        const descContent = pMatches[1].match(/<p[^>]*>([^<]+)<\/p>/i);
                        if (descContent) htmlDescription = descContent[1].trim();
                      }
                    }

                    // Extract button/link text, URL, and color (prioritize <a> tags with href)
                    const linkMatch = mainEmail.htmlSnippet.match(/<a[^>]+href="([^"]+)"([^>]*)>([^<]+)<\/a>/i);
                    if (linkMatch) {
                      htmlButtonUrl = linkMatch[1];
                      const linkAttributes = linkMatch[2];
                      htmlButtonText = linkMatch[3].trim();

                      // Extract bg-color class from the link's class attribute
                      const classMatch = linkAttributes.match(/class="([^"]*)"/i);
                      if (classMatch) {
                        const classes = classMatch[1];
                        // Find bg-{color}-{shade} pattern
                        const bgColorMatch = classes.match(/bg-[a-z]+-\d{3}/);
                        if (bgColorMatch && tailwindColorMap[bgColorMatch[0]]) {
                          htmlButtonColor = tailwindColorMap[bgColorMatch[0]];
                        }
                      }
                    } else {
                      // Fallback: look for span with bg- and px- classes (badge-style button)
                      const badgeMatch = mainEmail.htmlSnippet.match(/<span[^>]*class="([^"]*(?:px-\d|bg-)[^"]*)"[^>]*>([^<]+)<\/span>/i);
                      if (badgeMatch && !badgeMatch[2].match(/^[\u{1F300}-\u{1F9FF}]/u)) {
                        // Only use if it's not just an emoji
                        htmlButtonText = badgeMatch[2].trim();
                        const classes = badgeMatch[1];
                        const bgColorMatch = classes.match(/bg-[a-z]+-\d{3}/);
                        if (bgColorMatch && tailwindColorMap[bgColorMatch[0]]) {
                          htmlButtonColor = tailwindColorMap[bgColorMatch[0]];
                        }
                      }
                    }
                  }

                  const isHovered = hoveredEmailId === mainEmail.id;

                  return (
                    <div
                      className="relative group"
                      onMouseEnter={() => setHoveredEmailId(mainEmail.id)}
                      onMouseLeave={() => {
                        setHoveredEmailId(null);
                        setShowSnoozeMenu(null);
                      }}
                    >
                      <button
                        onClick={() => onSelectEmail(mainEmail)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1 text-left transition-all duration-150 h-8 focus:outline-none",
                          mainEmail.isRead ? "bg-white dark:bg-gray-900" : "bg-blue-50/50 dark:bg-blue-950/30",
                          selectedIds.has(mainEmail.id) && "bg-primary/10",
                          selectedEmailId === mainEmail.id
                            ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent shadow-[inset_2px_0_0_0_rgb(168,85,247)]"
                            : "hover:bg-accent/50"
                        )}
                      >
                        {/* Unread indicator dot */}
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          mainEmail.isRead ? "bg-transparent" : "bg-blue-500"
                        )} />

                        {/* Star */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStar(mainEmail.id, !mainEmail.isStarred);
                          }}
                          className={cn(
                            "flex-shrink-0 transition-colors",
                            mainEmail.isStarred ? "text-yellow-500" : "text-gray-300 dark:text-gray-600 hover:text-yellow-500"
                          )}
                        >
                          <Star className={cn("w-3.5 h-3.5", mainEmail.isStarred && "fill-current")} />
                        </button>

                        {/* Sender Avatar - Small */}
                        <div className="flex-shrink-0 ml-1">
                          <SenderAvatar
                            key={`avatar-minimal-${mainEmail.id}-${emailAddress}`}
                            email={emailAddress}
                            name={fromText}
                            size={20}
                            companyLogoUrl={validCompanyLogo}
                            companyName={validCompanyName}
                            senderProfilePhotoUrl={mainEmail.senderProfilePhotoUrl}
                          />
                        </div>

                        {/* Sender Name - Fixed width */}
                        <div className="flex-shrink-0 w-[130px] min-w-0 ml-1">
                          <span className={cn(
                            "text-[13px] truncate block",
                            mainEmail.isRead ? "text-muted-foreground" : "text-foreground font-medium"
                          )}>
                            {fromText}
                          </span>
                        </div>

                        {/* Content area: Subject - Preview */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                          {/* Subject */}
                          <span className={cn(
                            "text-[13px] truncate flex-shrink-0 max-w-[240px]",
                            mainEmail.isRead ? "text-muted-foreground" : "text-foreground font-medium"
                          )}>
                            {htmlTitle || mainEmail.subject || "(no subject)"}
                          </span>

                          {/* Preview */}
                          {(htmlDescription || mainEmail.summary || mainEmail.body) && (
                            <>
                              <span className="text-muted-foreground/30 flex-shrink-0">-</span>
                              <span className="text-[13px] text-muted-foreground/60 truncate">
                                {htmlDescription || mainEmail.summary || (typeof mainEmail.body === "string" ? mainEmail.body.replace(/\s+/g, ' ').substring(0, 80) : "")}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Date - hide on hover to make room for actions */}
                        <div className={cn(
                          "flex-shrink-0 text-[11px] text-muted-foreground w-[50px] text-right transition-opacity",
                          isHovered ? "opacity-0" : "opacity-100"
                        )}>
                          {formatEmailDate(mainEmail.date || mainEmail.createdAt)}
                        </div>
                      </button>

                      {/* Hover Actions - Right side */}
                      <div
                        className={cn(
                          "absolute right-1 top-0 bottom-0 flex items-center gap-0.5 transition-all duration-200",
                          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Archive / Unarchive */}
                        {isArchivedView && onUnarchiveEmail ? (
                          <button
                            onClick={(e) => handleQuickUnarchive(e, mainEmail.id)}
                            className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-muted-foreground hover:text-green-600 transition-colors"
                            title="Unarchive"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        ) : onArchiveEmail && (
                          <button
                            onClick={(e) => handleQuickArchive(e, mainEmail.id)}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        {/* Snooze / Unsnooze */}
                        {mainEmail.snoozedUntil && onUnsnoozeEmail ? (
                          <button
                            onClick={(e) => handleQuickUnsnooze(e, mainEmail.id)}
                            className="p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-500 hover:text-orange-600 transition-colors"
                            title="Unsnooze"
                          >
                            <AlarmClockOff className="w-4 h-4" />
                          </button>
                        ) : onSnoozeEmail && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setShowSnoozeMenu(showSnoozeMenu === mainEmail.id ? null : mainEmail.id);
                              }}
                              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                              title="Snooze"
                            >
                              <Clock className="w-4 h-4" />
                            </button>

                            {/* Snooze dropdown */}
                            {showSnoozeMenu === mainEmail.id && (
                              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                                {getSnoozeOptions().map((option) => (
                                  <button
                                    key={option.label}
                                    onClick={(e) => handleQuickSnooze(e, mainEmail.id, option.time)}
                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Delete */}
                        {onDeleteEmails && (
                          <button
                            onClick={(e) => handleQuickDelete(e, mainEmail.id)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : viewMode === "compact" ? (
                /* COMPACT VIEW - ONE LINER */
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredEmailId(mainEmail.id)}
                  onMouseLeave={() => {
                    setHoveredEmailId(null);
                    setShowSnoozeMenu(null);
                  }}
                >
                <button
                  onClick={() => onSelectEmail(mainEmail)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-1.5 text-left transition-all duration-200 relative overflow-visible focus:outline-none",
                    mainEmail.isRead ? "bg-white dark:bg-gray-900" : "bg-blue-50 dark:bg-blue-950/40",
                    selectedIds.has(mainEmail.id) && "bg-primary/10",
                    selectedEmailId === mainEmail.id
                      ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent shadow-[inset_2px_0_0_0_rgb(168,85,247),0_4px_6px_-1px_rgb(0_0_0_/0.1),0_2px_4px_-2px_rgb(0_0_0_/0.1)]"
                      : "hover:shadow-[inset_4px_0_0_0_hsl(var(--primary)),0_4px_6px_-1px_rgb(0_0_0_/0.1),0_2px_4px_-2px_rgb(0_0_0_/0.1)]"
                  )}
                >
                  {/* Read/Unread indicator dot - top left corner */}
                  <div
                    className={cn("absolute top-2 left-2 w-2 h-2 rounded-full", mainEmail.isRead ? "bg-green-500" : "bg-red-500")}
                    title={mainEmail.isRead ? "Read" : "Unread"}
                  />

                  {/* Sender Avatar (Profile Photo -> Company Logo -> Initials) */}
                  <div className="flex-shrink-0 ml-2">
                    <SenderAvatar
                      key={`avatar-${mainEmail.id}-${emailAddress}`}
                      email={emailAddress}
                      name={fromText}
                      size={28}
                      companyLogoUrl={validCompanyLogo}
                      companyName={validCompanyName}
                      senderProfilePhotoUrl={mainEmail.senderProfilePhotoUrl}
                    />
                  </div>

                  {/* Star icon - bottom left corner of the row */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(mainEmail.id, !mainEmail.isStarred);
                    }}
                    className={cn(
                      "absolute bottom-0.5 left-1 p-0.5 rounded-full transition-all duration-200 z-10",
                      hoveredEmailId === mainEmail.id || mainEmail.isStarred
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-75 pointer-events-none",
                      mainEmail.isStarred
                        ? "text-yellow-500"
                        : "text-muted-foreground hover:text-yellow-500"
                    )}
                    title={mainEmail.isStarred ? "Unstar" : "Star"}
                  >
                    <Star className={cn("w-3 h-3", mainEmail.isStarred && "fill-current")} />
                  </button>

                  {/* Selection checkbox */}
                  <button
                    onClick={(e) => toggleSelection(mainEmail.id, e)}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    {selectedIds.has(mainEmail.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>

                  {/* Sender - Fixed width, always show actual sender name */}
                  <div className="flex-shrink-0 w-32 min-w-0">
                    <div
                      className={cn("text-sm truncate", mainEmail.isRead ? "text-muted-foreground font-normal" : "text-foreground font-semibold")}
                      title={fromText}
                    >
                      {fromText}
                    </div>
                    {/* @YOU badge right under sender */}
                    {mainEmail.isAboutMe && (
                      <div className="mt-0.5">
                        <div
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded text-[9px] font-semibold"
                          title={mainEmail.mentionContext || "You are mentioned in this email"}
                        >
                          <AtSign className="w-2.5 h-2.5" />
                          <span>YOU</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content Preview - Subject/preview or HTML card inline (when not stacked) */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {/* When stacked layout OR no HTML card: show text summary */}
                    {stackLayout || !mainEmail.renderAsHtml || !mainEmail.htmlSnippet ? (
                      <div className="text-sm truncate flex items-center">
                        <span className={cn(
                          "flex-shrink-0",
                          mainEmail.isRead ? "text-muted-foreground/80 font-normal" : "text-foreground font-semibold"
                        )}>
                          {mainEmail.subject || "No subject"}
                        </span>
                        {(mainEmail.summary || mainEmail.body) && (
                          <>
                            <span className="text-muted-foreground/40 mx-1.5 flex-shrink-0">–</span>
                            <span className="text-muted-foreground/60 truncate">
                              {mainEmail.summary || (typeof mainEmail.body === "string" ? mainEmail.body.replace(/\s+/g, ' ').substring(0, 100) : "")}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Normal width: show HTML card inline */
                      <div className="max-w-[420px]">
                        <EmailHtmlCard htmlContent={mainEmail.htmlSnippet} onCardClick={() => onSelectEmail(mainEmail)} onLinkClick={(url) => onHtmlCardLinkClick?.(mainEmail.id, url)} />
                      </div>
                    )}
                  </div>

                  {/* Badges - Hidden when narrow */}
                  {!hideBadges && (
                    <div className="flex flex-wrap items-center gap-1 w-40 flex-shrink-0 overflow-hidden justify-end">
                      {/* Company badge FIRST with logo - only if company matches sender */}
                      {validCompanyName && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px] font-medium border flex items-center gap-1 max-w-[80px] h-auto"
                          style={getBadgeStyle("#6366F1")}
                        >
                          {validCompanyLogo && (
                            <Image
                              src={validCompanyLogo}
                              alt={validCompanyName}
                              width={10}
                              height={10}
                              className="rounded-sm object-contain flex-shrink-0"
                              unoptimized
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <span className="truncate">{validCompanyName}</span>
                        </Badge>
                      )}
                      {/* Show other badges, but skip if it's the same as company name */}
                      {filterMeaningfulBadges(mainEmail.badges, validCompanyName)
                        .slice(0, 2)
                        .map((badge: any, index: number) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="px-1.5 py-0 text-[10px] font-medium border max-w-[80px] h-auto"
                            style={getBadgeStyle(badge.color)}
                          >
                            <span className="truncate">{badge.name}</span>
                          </Badge>
                        ))}
                      {mainEmail.hasAttachment && <Paperclip className="size-4 text-muted-foreground" />}
                    </div>
                  )}

                  {/* Date / Snooze indicator - Compact when badges hidden */}
                  <div className={cn(
                    "flex-shrink-0 text-right flex items-center gap-1 justify-end",
                    hideBadges ? "text-[10px] w-20" : "text-xs w-28",
                    mainEmail.snoozedUntil ? "text-orange-500 dark:text-orange-400" : "text-muted-foreground"
                  )}>
                    {mainEmail.snoozedUntil ? (
                      <>
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span title={`Snoozed until ${format(new Date(mainEmail.snoozedUntil), 'PPp')}`}>
                          {format(new Date(mainEmail.snoozedUntil), hideBadges ? 'MMM d' : 'MMM d, h:mm a')}
                        </span>
                      </>
                    ) : (
                      formatEmailDate(mainEmail.date || mainEmail.createdAt)
                    )}
                  </div>

                  {/* Show attachment icon inline with date when badges hidden */}
                  {hideBadges && mainEmail.hasAttachment && (
                    <Paperclip className="size-3 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {/* HTML Card stacked below when very narrow */}
                {stackLayout && mainEmail.renderAsHtml && mainEmail.htmlSnippet && (
                  <div
                    className="px-4 pb-2 -mt-1 cursor-pointer max-w-[420px]"
                    onClick={() => onSelectEmail(mainEmail)}
                  >
                    <EmailHtmlCard
                      htmlContent={mainEmail.htmlSnippet}
                      onCardClick={() => onSelectEmail(mainEmail)}
                      onLinkClick={(url) => onHtmlCardLinkClick?.(mainEmail.id, url)}
                    />
                  </div>
                )}

                {/* Hover Actions */}
                <HoverActions emailId={mainEmail.id} hasUnsubscribe={mainEmail.badges?.some((b: any) => b.name === "Newsletter" || b.name === "Promotional")} isRead={mainEmail.isRead} isSnoozed={!!mainEmail.snoozedUntil} compact={hideBadges} />
                </div>
              ) : (
                /* DETAILED VIEW - VERTICAL LAYOUT */
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredEmailId(mainEmail.id)}
                  onMouseLeave={() => {
                    setHoveredEmailId(null);
                    setShowSnoozeMenu(null);
                  }}
                >
                <button
                  onClick={() => onSelectEmail(mainEmail)}
                  className={cn(
                    "flex flex-col w-full gap-1.5 px-4 py-2.5 text-left transition-all duration-200 relative focus:outline-none",
                    mainEmail.isRead ? "bg-white dark:bg-gray-900" : "bg-blue-50 dark:bg-blue-950/40",
                    selectedIds.has(mainEmail.id) && "bg-primary/10",
                    selectedEmailId === mainEmail.id
                      ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent shadow-[inset_2px_0_0_0_rgb(168,85,247),0_4px_6px_-1px_rgb(0_0_0_/0.1),0_2px_4px_-2px_rgb(0_0_0_/0.1)]"
                      : "hover:shadow-[inset_4px_0_0_0_hsl(var(--primary)),0_4px_6px_-1px_rgb(0_0_0_/0.1),0_2px_4px_-2px_rgb(0_0_0_/0.1)]"
                  )}
                >
                  {/* Read/Unread indicator dot - top left corner */}
                  <div
                    className={cn("absolute top-2 left-2 w-2 h-2 rounded-full", mainEmail.isRead ? "bg-green-500" : "bg-red-500")}
                    title={mainEmail.isRead ? "Read" : "Unread"}
                  />

                  {/* Star icon - bottom left corner of the row */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(mainEmail.id, !mainEmail.isStarred);
                    }}
                    className={cn(
                      "absolute bottom-2 left-2 p-0.5 rounded-full transition-all duration-200 z-10",
                      hoveredEmailId === mainEmail.id || mainEmail.isStarred
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-75 pointer-events-none",
                      mainEmail.isStarred
                        ? "text-yellow-500"
                        : "text-muted-foreground hover:text-yellow-500"
                    )}
                    title={mainEmail.isStarred ? "Unstar" : "Star"}
                  >
                    <Star className={cn("w-3.5 h-3.5", mainEmail.isStarred && "fill-current")} />
                  </button>

                  {/* Row 1: Sender with controls */}
                  <div className="flex items-center gap-3 w-full">
                    {/* Sender Avatar (Profile Photo -> Company Logo -> Initials) */}
                    <div className="flex-shrink-0 ml-2">
                      <SenderAvatar
                        key={`avatar-detail-${mainEmail.id}-${emailAddress}`}
                        email={emailAddress}
                        name={fromText}
                        size={32}
                        companyLogoUrl={validCompanyLogo}
                        companyName={validCompanyName}
                        senderProfilePhotoUrl={mainEmail.senderProfilePhotoUrl}
                      />
                    </div>

                    {/* Selection checkbox */}
                    <button
                      onClick={(e) => toggleSelection(mainEmail.id, e)}
                      className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    >
                      {selectedIds.has(mainEmail.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>

                    {/* Sender */}
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-sm", mainEmail.isRead ? "text-muted-foreground font-normal" : "text-foreground font-semibold")}>{fromText}</div>
                    </div>

                    {/* @YOU badge */}
                    {mainEmail.isAboutMe && (
                      <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded text-[9px] font-semibold">
                        <AtSign className="w-2.5 h-2.5" />
                        <span>YOU</span>
                      </div>
                    )}

                    {/* Date / Snooze indicator */}
                    <div className="flex-shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                      {mainEmail.snoozedUntil ? (
                        <span className="flex items-center gap-1 text-orange-500 dark:text-orange-400" title={`Snoozed until ${format(new Date(mainEmail.snoozedUntil), 'PPp')}`}>
                          <Clock className="w-3 h-3" />
                          {format(new Date(mainEmail.snoozedUntil), 'MMM d, h:mm a')}
                        </span>
                      ) : (
                        formatEmailDate(mainEmail.date || mainEmail.createdAt)
                      )}
                    </div>
                  </div>

                  {/* Row 2: Subject */}
                  <div className="pl-11">
                    <div className="text-sm font-medium text-foreground">
                      {typeof mainEmail.subject === "string" ? mainEmail.subject : "No Subject"}
                    </div>
                  </div>

                  {/* Row 3: AI Summary */}
                  {mainEmail.summary && typeof mainEmail.summary === "string" && (
                    <div className="pl-11">
                      <div className="text-sm text-indigo-900 dark:text-indigo-100 line-clamp-2 italic">{mainEmail.summary}</div>
                    </div>
                  )}

                  {/* Row 4: HTML Summary */}
                  {mainEmail.renderAsHtml && mainEmail.htmlSnippet ? (
                    <div className="pl-11 max-w-[420px]">
                      <EmailHtmlCard htmlContent={mainEmail.htmlSnippet} onCardClick={() => onSelectEmail(mainEmail)} onLinkClick={(url) => onHtmlCardLinkClick?.(mainEmail.id, url)} />
                    </div>
                  ) : (
                    /* Email Body Preview - Only show if NO HTML card */
                    mainEmail.body &&
                    typeof mainEmail.body === "string" && (
                      <div className="pl-11">
                        <div className="text-sm text-muted-foreground line-clamp-2">{mainEmail.body}</div>
                      </div>
                    )
                  )}

                  {/* Row 5: Badges and Attachment */}
                  <div className="pl-11 flex items-center gap-1 flex-wrap">
                    {/* Company badge - only if company matches sender */}
                    {validCompanyName && (
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px] font-medium border flex items-center gap-1 max-w-[100px] h-auto"
                        style={getBadgeStyle("#6366F1")}
                      >
                        {validCompanyLogo && (
                          <Image
                            src={validCompanyLogo}
                            alt={validCompanyName}
                            width={10}
                            height={10}
                            className="rounded-sm object-contain flex-shrink-0"
                            unoptimized
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                        <span className="truncate">{validCompanyName}</span>
                      </Badge>
                    )}

                    {/* Show other badges, but skip if it's the same as company name */}
                    {filterMeaningfulBadges(mainEmail.badges, validCompanyName)
                      .slice(0, 5)
                      .map((badge: any, index: number) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="px-1.5 py-0 text-[10px] font-medium border max-w-[100px] h-auto"
                          style={getBadgeStyle(badge.color)}
                        >
                          <span className="truncate">{badge.name}</span>
                        </Badge>
                      ))}
                    {mainEmail.hasAttachment && <Paperclip className="size-4 text-muted-foreground" />}
                  </div>
                </button>
                {/* Hover Actions */}
                <HoverActions emailId={mainEmail.id} hasUnsubscribe={mainEmail.badges?.some((b: any) => b.name === "Newsletter" || b.name === "Promotional")} isRead={mainEmail.isRead} isSnoozed={!!mainEmail.snoozedUntil} compact={hideBadges} />
                </div>
              )}

              {/* Previous Emails in Thread (Replies) */}
              {previousEmails.length > 0 && (
                viewMode === "minimal" ? (
                  /* MINIMAL VIEW - One-liner replies with tree branching */
                  <div className="relative ml-8 mr-4 mb-2">
                    {/* Vertical connector line from main email */}
                    <div className="absolute left-0 top-0 bottom-2 w-px bg-border/40" style={{ marginLeft: '-24px' }} />

                    {previousEmails.map((prevEmail, index) => {
                      const prevSender = parseSender(prevEmail.from);
                      const prevFromText = prevSender.name;
                      const prevEmailAddress = prevSender.email;
                      return (
                        <div key={prevEmail.id} className="relative flex items-center mt-0.5 first:mt-0">
                          {/* Horizontal branch from vertical line */}
                          <div className="absolute flex items-center" style={{ left: '-24px', top: '50%', transform: 'translateY(-50%)' }}>
                            <div className="w-5 h-px bg-border/40" />
                          </div>

                          {/* Number badge at branch connection */}
                          <div
                            className="absolute flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[9px] font-medium text-muted-foreground border border-border/50"
                            style={{ left: '-26px', top: '50%', transform: 'translateY(-50%)' }}
                          >
                            {index + 1}
                          </div>

                          {/* One-liner reply content */}
                          <button
                            onClick={() => onSelectEmail(prevEmail)}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-1 text-left transition-all duration-150 h-8 focus:outline-none rounded",
                              prevEmail.isRead ? "bg-white dark:bg-gray-900" : "bg-blue-50/50 dark:bg-blue-950/30",
                              selectedEmailId === prevEmail.id
                                ? "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent shadow-[inset_2px_0_0_0_rgb(168,85,247)]"
                                : "hover:bg-accent/50"
                            )}
                          >
                            {/* Unread indicator dot */}
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              prevEmail.isRead ? "bg-transparent" : "bg-blue-500"
                            )} />

                            {/* Star */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleStar(prevEmail.id, !prevEmail.isStarred);
                              }}
                              className={cn(
                                "flex-shrink-0 transition-colors",
                                prevEmail.isStarred ? "text-yellow-500" : "text-gray-300 dark:text-gray-600 hover:text-yellow-500"
                              )}
                            >
                              <Star className={cn("w-3.5 h-3.5", prevEmail.isStarred && "fill-current")} />
                            </button>

                            {/* Sender Avatar */}
                            <div className="flex-shrink-0 ml-1">
                              <SenderAvatar
                                key={`avatar-minimal-reply-${prevEmail.id}-${prevEmailAddress}`}
                                email={prevEmailAddress}
                                name={prevFromText}
                                size={20}
                              />
                            </div>

                            {/* Sender Name - Fixed width */}
                            <div className="flex-shrink-0 w-[130px] min-w-0 ml-1">
                              <span className={cn(
                                "text-[13px] truncate block",
                                prevEmail.isRead ? "text-muted-foreground" : "text-foreground font-medium"
                              )}>
                                {prevFromText}
                              </span>
                            </div>

                            {/* Content area: Subject - Preview */}
                            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                              <span className={cn(
                                "text-[13px] truncate flex-shrink-0 max-w-[240px]",
                                prevEmail.isRead ? "text-muted-foreground" : "text-foreground font-medium"
                              )}>
                                {prevEmail.subject || "(no subject)"}
                              </span>

                              {(prevEmail.summary || prevEmail.body) && (
                                <>
                                  <span className="text-muted-foreground/30 flex-shrink-0">-</span>
                                  <span className="text-[13px] text-muted-foreground/60 truncate">
                                    {prevEmail.summary || (typeof prevEmail.body === "string" ? prevEmail.body.replace(/\s+/g, ' ').substring(0, 80) : "")}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Date */}
                            <div className="flex-shrink-0 text-[11px] text-muted-foreground w-[50px] text-right">
                              {formatEmailDate(prevEmail.date || prevEmail.createdAt)}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* COMPACT/DETAILED VIEW - Tree View with cards */
                  <div className="relative ml-10 mr-4 mb-3">
                    {/* Vertical connector line from main email */}
                    <div className="absolute left-0 top-0 bottom-4 w-px bg-border/40" style={{ marginLeft: '-24px' }} />

                    {previousEmails.map((prevEmail, index) => {
                      const prevSender = parseSender(prevEmail.from);
                      const prevFromText = prevSender.name;
                      const prevEmailAddress = prevSender.email;
                      return (
                        <div key={prevEmail.id} className="relative flex items-start mt-2 first:mt-0">
                          {/* Horizontal branch from vertical line */}
                          <div className="absolute flex items-center" style={{ left: '-24px', top: '14px' }}>
                            <div className="w-5 h-px bg-border/40" />
                          </div>

                          {/* Number badge at branch connection */}
                          <div
                            className="absolute flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[9px] font-medium text-muted-foreground border border-border/50"
                            style={{ left: '-28px', top: '10px' }}
                          >
                            {index + 1}
                          </div>

                          {/* Reply content card */}
                          <button
                            onClick={() => onSelectEmail(prevEmail)}
                            className={cn(
                              "flex items-center gap-3 w-full text-left py-2 px-3 rounded-lg transition-all duration-200",
                              "bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50"
                            )}
                          >
                            <SenderAvatar key={`avatar-reply-${prevEmail.id}-${prevEmailAddress}`} email={prevEmailAddress} name={prevFromText} size={20} />

                            <div className="flex-shrink-0 w-24 min-w-0">
                              <div className="text-xs font-medium text-foreground/80 truncate">
                                {prevFromText}
                              </div>
                              {prevEmail.isAboutMe && (
                                <div className="mt-0.5">
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded text-[8px] font-semibold">
                                    <AtSign className="w-2 h-2" />
                                    YOU
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              {prevEmail.renderAsHtml && prevEmail.htmlSnippet ? (
                                <div onClick={(e) => e.stopPropagation()} className="max-w-[420px]">
                                  <EmailHtmlCard
                                    htmlContent={prevEmail.htmlSnippet}
                                    className="scale-[0.85] origin-top-left"
                                    onCardClick={() => onSelectEmail(prevEmail)}
                                    onLinkClick={(url) => onHtmlCardLinkClick?.(prevEmail.id, url)}
                                  />
                                </div>
                              ) : prevEmail.summary && typeof prevEmail.summary === "string" ? (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  <span className="text-indigo-500 dark:text-indigo-400 mr-1">✦</span>
                                  {prevEmail.summary}
                                </div>
                              ) : prevEmail.body && typeof prevEmail.body === "string" ? (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {prevEmail.body.substring(0, 100)}...
                                </div>
                              ) : null}
                            </div>

                            {!hideBadges && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {filterMeaningfulBadges(prevEmail.badges, prevEmail.companyName).slice(0, 2).map((badge: any, badgeIndex: number) => (
                                  <Badge
                                    key={badgeIndex}
                                    variant="outline"
                                    className="px-1.5 py-0 text-[9px] font-medium border h-auto"
                                    style={getBadgeStyle(badge.color)}
                                  >
                                    <span className="truncate max-w-[60px]">{badge.name}</span>
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex-shrink-0 text-[10px] text-muted-foreground/60 w-16 text-right">
                              {formatEmailDate(prevEmail.date || prevEmail.createdAt)}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Emails</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete {selectedIds.size} email{selectedIds.size > 1 ? "s" : ""}? This will also permanently remove them from
              Gmail.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
