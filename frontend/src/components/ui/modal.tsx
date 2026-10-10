"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  className,
  maxWidth = "max-w-[560px]",
}: ModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-[3px] z-[200] flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={cn(
          "nm-card w-full rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col",
          maxWidth,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        {title && (
          <div className="relative flex items-center justify-center px-6 pt-6 pb-4 border-b border-black/8 dark:border-white/5 shrink-0">
            <h2 className="text-[15px] font-bold text-foreground tracking-tight pr-8 text-center leading-snug">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="nm-btn absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Content ── */}
        <div className="px-6 py-5 flex flex-col min-h-0 flex-1 overflow-y-auto no-scrollbar">
          {!title && (
            <button
              onClick={onClose}
              className="nm-btn absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
