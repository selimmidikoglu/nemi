"use client";

import { useState, useEffect, useRef } from "react";
import { Star, Paperclip, ChevronRight, AtSign, Trash2, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Email } from "@/types";
import Image from "next/image";
import EmailHtmlCard from "./EmailHtmlCard";
import { formatDistanceToNow, format, isToday, isYesterday, differenceInHours } from "date-fns";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: number | null;
  onSelectEmail: (email: Email) => void;
  onToggleStar: (id: number, isStarred: boolean) => void;
  onDeleteEmails?: (ids: number[]) => Promise<void>;
  viewMode: "compact" | "detailed";
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

// Helper to format email date (combined format)
const formatEmailDate = (dateString: string): string => {
  const date = new Date(dateString);
  const hoursAgo = differenceInHours(new Date(), date);

  // Less than 24 hours: show relative time
  if (hoursAgo < 24) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  // More than 24 hours: show short date
  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  if (isYesterday(date)) {
    return "Yesterday";
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

// Sender Avatar component: Profile Photo -> Gravatar -> Company Logo -> Initials
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
  const [gravatarError, setGravatarError] = useState(false);
  const [companyLogoError, setCompanyLogoError] = useState(false);
  const initials = getInitials(name, email);
  const bgColor = getAvatarColor(email);
  const gravatarUrl = getGravatarUrl(email, size * 2); // 2x for retina

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

  // Priority 2: Try Gravatar
  if (!gravatarError) {
    return (
      <img
        src={gravatarUrl}
        alt={name || email}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setGravatarError(true)}
        title={name || email}
      />
    );
  }

  // Priority 3: Try Company Logo
  if (companyLogoUrl && !companyLogoError) {
    return (
      <Image
        src={companyLogoUrl}
        alt={companyName || "Company logo"}
        width={size}
        height={size}
        className="rounded object-contain bg-white flex-shrink-0"
        unoptimized
        onError={() => setCompanyLogoError(true)}
      />
    );
  }

  // Priority 4: Show initials fallback
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

export default function EmailList({ emails, selectedEmailId, onSelectEmail, onToggleStar, onDeleteEmails, viewMode }: EmailListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isCompactWidth, setIsCompactWidth] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use ResizeObserver to detect container width and switch to compact mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // If width is less than 650px, switch to compact mode (hide badges and HTML cards)
        setIsCompactWidth(entry.contentRect.width < 650);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const toggleSelection = (id: number, e: React.MouseEvent) => {
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

          const fromText =
            typeof mainEmail.from === "string" ? mainEmail.from : (mainEmail.from as any)?.name || (mainEmail.from as any)?.email || "Unknown";
          const emailAddress = typeof mainEmail.from === "string" ? mainEmail.from : (mainEmail.from as any)?.email || "";

          return (
            <div key={`thread-${mainEmail.id}`} className="w-full">
              {viewMode === "compact" ? (
                /* COMPACT VIEW - ONE LINER */
                <button
                  onClick={() => onSelectEmail(mainEmail)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-left transition-all duration-200 relative overflow-hidden",
                    mainEmail.isRead ? "bg-white dark:bg-gray-900" : "bg-blue-50 dark:bg-blue-950/30",
                    selectedIds.has(mainEmail.id) && "bg-primary/10",
                    "hover:shadow-[inset_4px_0_0_0_hsl(var(--primary)),0_4px_6px_-1px_rgb(0_0_0_/0.1),0_2px_4px_-2px_rgb(0_0_0_/0.1)]"
                  )}
                >
                  {/* Read/Unread indicator dot - top left corner */}
                  <div
                    className={cn("absolute top-2 left-2 w-2 h-2 rounded-full", mainEmail.isRead ? "bg-green-500" : "bg-red-500")}
                    title={mainEmail.isRead ? "Read" : "Unread"}
                  />

                  {/* Sender Avatar (Profile Photo -> Gravatar -> Company Logo -> Initials) */}
                  <div className="flex-shrink-0 ml-2">
                    <SenderAvatar
                      email={emailAddress}
                      name={fromText}
                      size={28}
                      companyLogoUrl={mainEmail.companyLogoUrl}
                      companyName={mainEmail.companyName}
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

                  {/* Sender - Fixed width, show company name if available, otherwise sender */}
                  <div className="flex-shrink-0 w-28 min-w-0">
                    <div
                      className={cn("text-sm font-medium truncate", mainEmail.isRead ? "text-muted-foreground" : "text-foreground")}
                      title={mainEmail.companyName || fromText}
                    >
                      {mainEmail.companyName || fromText}
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

                  {/* Content Preview - Flexible width */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {/* In compact mode: always show text summary, never HTML card */}
                    {isCompactWidth ? (
                      <div className="text-sm text-muted-foreground truncate">
                        {mainEmail.summary || (mainEmail.body && typeof mainEmail.body === "string" ? mainEmail.body.substring(0, 80) : mainEmail.subject)}
                      </div>
                    ) : (
                      /* Full width mode: show HTML card if available */
                      mainEmail.renderAsHtml && mainEmail.htmlSnippet ? (
                        <div className="overflow-hidden">
                          <EmailHtmlCard htmlContent={mainEmail.htmlSnippet} />
                        </div>
                      ) : (
                        /* Email Body Preview - Only show if NO HTML card */
                        mainEmail.body &&
                        typeof mainEmail.body === "string" && (
                          <div className="text-sm text-muted-foreground truncate">{mainEmail.body.substring(0, 150)}...</div>
                        )
                      )
                    )}
                  </div>

                  {/* Badges - Hidden when width is compact */}
                  {!isCompactWidth && (
                    <div className="flex flex-wrap items-center gap-1 w-40 flex-shrink-0 overflow-hidden justify-end">
                      {/* Company badge FIRST with logo */}
                      {mainEmail.companyName && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px] font-medium border flex items-center gap-1 max-w-[80px] h-auto"
                          style={getBadgeStyle("#6366F1")}
                        >
                          {mainEmail.companyLogoUrl && (
                            <Image
                              src={mainEmail.companyLogoUrl}
                              alt={mainEmail.companyName}
                              width={10}
                              height={10}
                              className="rounded-sm object-contain flex-shrink-0"
                              unoptimized
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <span className="truncate">{mainEmail.companyName}</span>
                        </Badge>
                      )}
                      {/* Show other badges, but skip if it's the same as company name */}
                      {mainEmail.badges
                        ?.filter((b: any) => b.name !== mainEmail.companyName)
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

                  {/* Date - Compact when width is small */}
                  <div className={cn(
                    "flex-shrink-0 text-muted-foreground text-right",
                    isCompactWidth ? "text-[10px] w-14" : "text-xs w-20"
                  )}>
                    {formatEmailDate(mainEmail.date || mainEmail.createdAt)}
                  </div>

                  {/* Show attachment icon inline with date in compact mode */}
                  {isCompactWidth && mainEmail.hasAttachment && (
                    <Paperclip className="size-3 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              ) : (
                /* DETAILED VIEW - VERTICAL LAYOUT */
                <button
                  onClick={() => onSelectEmail(mainEmail)}
                  className={cn(
                    "flex flex-col w-full gap-2 px-4 py-3 text-left transition-all duration-200 relative",
                    mainEmail.isRead ? "bg-white dark:bg-gray-900" : "bg-blue-50 dark:bg-blue-950/30",
                    selectedIds.has(mainEmail.id) && "bg-primary/10",
                    "hover:shadow-[inset_4px_0_0_0_hsl(var(--primary)),0_4px_6px_-1px_rgb(0_0_0_/0.1),0_2px_4px_-2px_rgb(0_0_0_/0.1)]"
                  )}
                >
                  {/* Read/Unread indicator dot - top left corner */}
                  <div
                    className={cn("absolute top-2 left-2 w-2 h-2 rounded-full", mainEmail.isRead ? "bg-green-500" : "bg-red-500")}
                    title={mainEmail.isRead ? "Read" : "Unread"}
                  />

                  {/* Row 1: Sender with controls */}
                  <div className="flex items-center gap-3 w-full">
                    {/* Sender Avatar (Profile Photo -> Gravatar -> Company Logo -> Initials) */}
                    <div className="flex-shrink-0 ml-2">
                      <SenderAvatar
                        email={emailAddress}
                        name={fromText}
                        size={32}
                        companyLogoUrl={mainEmail.companyLogoUrl}
                        companyName={mainEmail.companyName}
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
                      <div className={cn("text-sm font-semibold", mainEmail.isRead ? "text-muted-foreground" : "text-foreground")}>{fromText}</div>
                    </div>

                    {/* @YOU badge */}
                    {mainEmail.isAboutMe && (
                      <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded text-[9px] font-semibold">
                        <AtSign className="w-2.5 h-2.5" />
                        <span>YOU</span>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex-shrink-0 text-xs text-muted-foreground">{formatEmailDate(mainEmail.date || mainEmail.createdAt)}</div>
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
                    <div className="pl-11 overflow-hidden">
                      <EmailHtmlCard htmlContent={mainEmail.htmlSnippet} />
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
                    {/* Company badge ALWAYS comes first */}
                    {mainEmail.companyName && (
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px] font-medium border flex items-center gap-1 max-w-[100px] h-auto"
                        style={getBadgeStyle("#6366F1")}
                      >
                        {mainEmail.companyLogoUrl && (
                          <Image
                            src={mainEmail.companyLogoUrl}
                            alt={mainEmail.companyName}
                            width={10}
                            height={10}
                            className="rounded-sm object-contain flex-shrink-0"
                            unoptimized
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                        <span className="truncate">{mainEmail.companyName}</span>
                      </Badge>
                    )}

                    {/* Show other badges, but skip if it's the same as company name */}
                    {mainEmail.badges
                      ?.filter((b: any) => b.name !== mainEmail.companyName)
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
              )}

              {/* Previous Emails in Thread (Replies) */}
              {previousEmails.length > 0 && (
                <div className="ml-6 mr-4 mb-3 space-y-2 border-l-2 border-primary/30 pl-3">
                  <div className="flex items-center gap-2 py-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      {previousEmails.length} previous {previousEmails.length === 1 ? 'reply' : 'replies'}
                    </div>
                  </div>
                  {previousEmails.map((prevEmail) => {
                    const prevFromText =
                      typeof prevEmail.from === "string"
                        ? prevEmail.from
                        : (prevEmail.from as any)?.name || (prevEmail.from as any)?.email || "Unknown";
                    const prevEmailAddress =
                      typeof prevEmail.from === "string"
                        ? prevEmail.from
                        : (prevEmail.from as any)?.email || "";
                    return (
                      <button
                        key={prevEmail.id}
                        onClick={() => onSelectEmail(prevEmail)}
                        className={cn(
                          "flex items-center gap-3 w-full text-left py-2.5 px-3 rounded-lg transition-all duration-200",
                          "bg-card/80 hover:bg-card border border-border/50 hover:border-primary/30",
                          "hover:shadow-sm"
                        )}
                      >
                        {/* Sender Avatar for reply */}
                        <SenderAvatar email={prevEmailAddress} name={prevFromText} size={20} />

                        {/* From / Sender Name */}
                        <div className="flex-shrink-0 w-28 min-w-0">
                          <div className="text-xs font-medium text-foreground/80 truncate">
                            {prevFromText}
                          </div>
                          {/* @YOU badge */}
                          {prevEmail.isAboutMe && (
                            <div className="mt-0.5">
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded text-[8px] font-semibold">
                                <AtSign className="w-2 h-2" />
                                YOU
                              </span>
                            </div>
                          )}
                        </div>

                        {/* AI Summary */}
                        <div className="flex-1 min-w-0">
                          {prevEmail.summary && typeof prevEmail.summary === "string" ? (
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

                        {/* Badges */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {prevEmail.badges?.slice(0, 2).map((badge: any, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="px-1.5 py-0 text-[9px] font-medium border h-auto"
                              style={getBadgeStyle(badge.color)}
                            >
                              <span className="truncate max-w-[60px]">{badge.name}</span>
                            </Badge>
                          ))}
                        </div>

                        {/* Date */}
                        <div className="flex-shrink-0 text-[10px] text-muted-foreground w-16 text-right">
                          {formatEmailDate(prevEmail.date || prevEmail.createdAt)}
                        </div>
                      </button>
                    );
                  })}
                </div>
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
