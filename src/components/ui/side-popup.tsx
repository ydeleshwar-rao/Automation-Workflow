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
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Invisible Overlay to capture clicks outside */}
      <div
        className="fixed inset-0 z-[90] cursor-default"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      <div
        className={cn(
          "fixed bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl z-[100] animate-in fade-in slide-in-from-right-4 duration-200 origin-right pointer-events-auto overflow-hidden flex flex-col",
          width
        )}
        style={{ top: `${position.top}px`, right: `${position.right}px`, maxHeight: `calc(100vh - ${position.top + 24}px)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="p-3 border-b border-border flex items-center justify-between bg-muted/40">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
              {title}
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
