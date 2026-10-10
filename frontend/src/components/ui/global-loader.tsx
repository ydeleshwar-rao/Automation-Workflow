"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

interface GlobalLoaderProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function GlobalLoader({ 
  isOpen, 
  title = "Processing...", 
  description = "Please wait while we complete your request.",
  icon
}: GlobalLoaderProps) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[250] flex items-center justify-center animate-in fade-in duration-500">
      <div className="bg-card p-12 rounded-3xl shadow-2xl flex flex-col items-center space-y-8 animate-in zoom-in-95 duration-300 max-w-[400px] w-full border border-border">
        
        {/* Animated Icon Container */}
        <div className="relative">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center relative overflow-hidden">
             {icon}
             <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 animate-[shimmer_2s_infinite]" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-card rounded-full shadow-md flex items-center justify-center border border-border">
             <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        </div>

        <div className="space-y-3 text-center">
          <h3 className="text-xl font-bold text-foreground tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed px-4">
            {description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2 pt-2">
          {[0, 1, 2].map((i) => (
            <div 
              key={i} 
              className="w-2.5 h-2.5 bg-primary/20 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
