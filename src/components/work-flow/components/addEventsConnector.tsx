"use client";

import React from "react";

interface ConnectorProps {
  onClick?: () => void;
}

export function Connector({ onClick }: ConnectorProps) {
  return (
    <div className="flex flex-col items-center group relative py-2">
      <div className="w-0.5 h-12 bg-primary/30 group-hover:bg-primary transition-colors" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        aria-label="Add step"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-background border border-primary/40 text-primary shadow-sm hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all"
      >
        <span className="text-base font-light leading-none">+</span>
      </button>
    </div>
  );
}
