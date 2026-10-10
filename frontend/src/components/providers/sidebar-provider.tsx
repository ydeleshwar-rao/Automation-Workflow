"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  isOpen: boolean;
  isPinned: boolean;
  toggle: () => void;
  setIsOpen: (value: boolean) => void;
  setPinned: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Default to true (expanded) on desktop, false on mobile
  const [isOpen, setIsOpen] = useState(true);
  const [isPinned, setPinned] = useState(true);

  // Handle initial state and resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
        setPinned(false);
      } else {
        setIsOpen(true);
        setPinned(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggle = () => {
    setIsOpen((prev) => !prev);
    // If we're on desktop, also toggle pinning
    if (window.innerWidth >= 1024) {
      setPinned((prev) => !prev);
    }
  };

  return (
    <SidebarContext.Provider
      value={{ isOpen, isPinned, toggle, setIsOpen, setPinned }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
