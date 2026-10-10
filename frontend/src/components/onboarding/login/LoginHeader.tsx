"use client";

import Link from "next/link";

export function LoginHeader() {
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 z-10">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-foreground font-bold text-lg tracking-tight">
          Job Management
        </span>
      </Link>
      <div className="flex items-center gap-2 bg-accent/50 border border-border rounded-full px-4 py-1.5">
        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </div>
        <span className="text-foreground/80 text-sm font-medium">
          You are signing into Job Management
        </span>
      </div>
    </div>
  );
}
