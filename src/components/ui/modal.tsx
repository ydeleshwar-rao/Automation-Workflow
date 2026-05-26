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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-card text-foreground w-full rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col",
          maxWidth,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 relative flex flex-col min-h-0 flex-1">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {title && (
            <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4 pr-8 text-center">
              {title}
            </h2>
          )}

          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
