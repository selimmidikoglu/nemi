"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Undo2, Trash2, Archive, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastAction {
  id: string;
  type: "delete" | "archive" | "snooze";
  message: string;
  emailId: string;
  emailSubject?: string;
  onUndo: () => Promise<void>;
  createdAt: number;
}

interface UndoToastProps {
  action: ToastAction | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

const icons = {
  delete: Trash2,
  archive: Archive,
  snooze: Clock,
};

const colors = {
  delete: {
    bg: "bg-red-50 dark:bg-red-950/50",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-500 dark:text-red-400",
    progress: "bg-red-500",
  },
  archive: {
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-500 dark:text-amber-400",
    progress: "bg-amber-500",
  },
  snooze: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-500 dark:text-blue-400",
    progress: "bg-blue-500",
  },
};

export default function UndoToast({ action, onDismiss, autoDismissMs = 8000 }: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [progress, setProgress] = useState(100);

  // Handle visibility animation
  useEffect(() => {
    if (action) {
      // Small delay for enter animation
      const showTimer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(showTimer);
    } else {
      setIsVisible(false);
    }
  }, [action]);

  // Auto-dismiss with progress bar
  useEffect(() => {
    if (!action || isUndoing) return;

    const startTime = Date.now();
    const endTime = startTime + autoDismissMs;

    const progressInterval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const newProgress = (remaining / autoDismissMs) * 100;
      setProgress(newProgress);

      if (remaining <= 0) {
        clearInterval(progressInterval);
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [action, autoDismissMs, isUndoing]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for exit animation
  }, [onDismiss]);

  const handleUndo = useCallback(async () => {
    if (!action || isUndoing) return;

    setIsUndoing(true);
    try {
      await action.onUndo();
      handleDismiss();
    } catch (error) {
      console.error("Failed to undo action:", error);
      setIsUndoing(false);
    }
  }, [action, isUndoing, handleDismiss]);

  if (!action) return null;

  const Icon = icons[action.type];
  const colorScheme = colors[action.type];

  return (
    <div
      className={cn(
        "fixed bottom-6 left-6 z-50 transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm",
          "min-w-[320px] max-w-[420px]",
          colorScheme.bg,
          colorScheme.border
        )}
      >
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
          <div
            className={cn("h-full transition-all duration-50 ease-linear", colorScheme.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4 pr-12">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={cn(
                "flex-shrink-0 p-2 rounded-lg",
                action.type === "delete" && "bg-red-100 dark:bg-red-900/30",
                action.type === "archive" && "bg-amber-100 dark:bg-amber-900/30",
                action.type === "snooze" && "bg-blue-100 dark:bg-blue-900/30"
              )}
            >
              <Icon className={cn("w-5 h-5", colorScheme.icon)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{action.message}</p>
              {action.emailSubject && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate" title={action.emailSubject}>
                  {action.emailSubject}
                </p>
              )}

              {/* Undo button */}
              <button
                onClick={handleUndo}
                disabled={isUndoing}
                className={cn(
                  "mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg",
                  "transition-all duration-200",
                  "bg-foreground text-background hover:bg-foreground/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground/50"
                )}
              >
                <Undo2 className="w-3.5 h-3.5" />
                {isUndoing ? "Undoing..." : "Undo"}
              </button>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className={cn(
            "absolute top-3 right-3 p-1.5 rounded-lg",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-black/5 dark:hover:bg-white/10",
            "transition-colors duration-150"
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Toast manager for multiple toasts (if needed in future)
export function useUndoToast() {
  const [currentAction, setCurrentAction] = useState<ToastAction | null>(null);

  const showToast = useCallback((action: Omit<ToastAction, "id" | "createdAt">) => {
    setCurrentAction({
      ...action,
      id: Math.random().toString(36).substring(7),
      createdAt: Date.now(),
    });
  }, []);

  const dismissToast = useCallback(() => {
    setCurrentAction(null);
  }, []);

  return {
    currentAction,
    showToast,
    dismissToast,
  };
}
