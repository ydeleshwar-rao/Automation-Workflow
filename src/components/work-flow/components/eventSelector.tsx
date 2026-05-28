"use client";

import React from "react";
import { ArrowRightLeft, X, Search } from "lucide-react";
import { cn } from "@/src/lib/utils";

import { resolveIcon } from "@/src/lib/icon-registry";
import { IntegrationApp } from "@/src/components/work-flow/uiOrchestrator/types";
import { BUILT_IN_TOOLS, WORKFLOW_APPS } from "@/src/constants/intigrationApp.constants";

const apps: IntegrationApp[]  = WORKFLOW_APPS.map(a => ({ ...a, icon: resolveIcon(a.iconName) }));
const tools: IntegrationApp[] = BUILT_IN_TOOLS.map(t => ({ ...t, icon: resolveIcon(t.iconName) }));

interface EventSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (app: { label: string; icon: any; color: string }) => void;
}

export function EventSelector({ isOpen, onClose, onSelect }: EventSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredApps = apps.filter((app: IntegrationApp) =>
    app.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const builtInTools = tools.filter((tool: IntegrationApp) =>
    tool.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative nm-card w-full max-w-[680px] h-[560px] rounded-2xl flex overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/8 dark:border-white/5 shrink-0">

            {/* Search — nm-inset pill */}
            <div className="relative flex-1 max-w-[340px]">
              <div className="nm-inset flex items-center gap-2.5 rounded-xl px-3 h-9">
                <Search className="shrink-0 w-3.5 h-3.5 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Search apps"
                  className="flex-1 bg-transparent text-foreground text-[13px] font-medium placeholder:text-muted-foreground focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              {/* Browse all */}
              <button className="nm-btn flex items-center gap-1.5 rounded-xl px-3 h-8 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-all">
                Browse all
                <ArrowRightLeft className="w-3 h-3" />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="nm-btn flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Scrollable list ── */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

            {/* Your Top Apps */}
            <div className="space-y-3">
              <h3 className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                Your Top Apps
              </h3>
              <div className="flex flex-col gap-2">
                {filteredApps.map((app: IntegrationApp) => (
                  <AppRow
                    key={app.id}
                    app={app}
                    onClick={() => onSelect?.(app)}
                  />
                ))}
              </div>
            </div>

            {/* Popular Built-in Tools */}
            <div className="space-y-3">
              <h3 className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                Popular Built-in Tools
              </h3>
              <div className="flex flex-col gap-2">
                {builtInTools.map((tool: IntegrationApp) => (
                  <AppRow
                    key={tool.id}
                    app={tool}
                    onClick={() => onSelect?.(tool)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App / Tool row ────────────────────────────────────────────
function AppRow({
  app,
  onClick,
}: {
  app: IntegrationApp;
  onClick: () => void;
}) {
  // Extract only the text-color class from app.color string
  const iconColor = app.color.split(" ").pop() ?? "";

  return (
    <button
      onClick={onClick}
      className="group nm-btn flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-all"
    >
      {/* Icon badge — nm-inset so it looks carved into the raised row */}
      <div className="nm-inset flex shrink-0 items-center justify-center w-9 h-9 rounded-xl">
        <app.icon className={cn("w-4.5 h-4.5", iconColor)} />
      </div>

      <span className="text-[13.5px] font-semibold text-foreground group-hover:text-primary transition-colors leading-none">
        {app.label}
      </span>
    </button>
  );
}
