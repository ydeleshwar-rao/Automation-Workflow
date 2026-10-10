"use client";

import React from "react";
import { cn } from "@/src/lib/utils";

interface ConnectorProps {
  onClick?: () => void;
}

export function Connector({ onClick }: ConnectorProps) {
  return (
    <div className="flex flex-col items-center group relative py-2">
      <div className="w-0.5 h-12 bg-primary/25 group-hover:bg-primary/60 transition-colors" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        aria-label="Add step"
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "flex items-center justify-center w-7 h-7 rounded-full",
          "nm-card text-primary hover:bg-primary hover:text-primary-foreground",
          "transition-all hover:scale-110",
        )}
      >
        <span className="text-base font-light leading-none">+</span>
      </button>
    </div>
  );
}
