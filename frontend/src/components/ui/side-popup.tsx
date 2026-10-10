"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { createPortal } from "react-dom";

interface SidePopupProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: string;
  position?: { top: number; right: number };
}

export function SidePopup({
  isOpen,
  onClose,
  children,
  title,
  width = "w-80",
  position = { top: 240, right: 445 },
}: SidePopupProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Click-outside overlay */}
      <div
        className="fixed inset-0 z-[90] cursor-default"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed nm-card rounded-2xl z-[100] animate-in fade-in slide-in-from-right-4 duration-200 origin-right pointer-events-auto overflow-hidden flex flex-col",
          width
        )}
        style={{
          top: `${position.top}px`,
          right: `${position.right}px`,
          maxHeight: `calc(100vh - ${position.top + 24}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/8 dark:border-white/5 bg-[hsl(var(--surface))] shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {title}
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="nm-btn flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[hsl(var(--surface))]">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
