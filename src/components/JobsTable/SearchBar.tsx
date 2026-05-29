"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search clients, emails, or job numbers...",
}: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2
                         h-4 w-4 text-muted-foreground"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 text-sm border border-border
                   rounded-lg bg-background text-foreground
                   placeholder:text-muted-foreground
                   focus:outline-none focus:ring-2
                   focus:ring-ring focus:border-transparent"
      />
    </div>
  );
}
