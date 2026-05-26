"use client";

import React from "react";
import { 
  Home, 
  ArrowRightLeft, 
  X,
  Search
} from "lucide-react";
import { cn } from "@/src/lib/utils";

import { resolveIcon } from "@/src/lib/icon-registry";
import { IntegrationApp } from "@/src/components/work-flow/uiOrchestrator/types";
import { BUILT_IN_TOOLS, WORKFLOW_APPS } from "@/src/constants/intigrationApp.constants";

const apps: IntegrationApp[] = WORKFLOW_APPS.map(a => ({ ...a, icon: resolveIcon(a.iconName) }));
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-popover text-popover-foreground border border-border w-full max-w-[900px] h-[650px] rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.25)] flex overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-popover">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="relative flex-1 max-w-sm group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search apps"
                className="w-full h-10 pl-10 pr-4 bg-muted text-foreground border-none rounded-lg text-[13px] focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground font-medium transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-6">
              <button className="text-[12px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                Browse all
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-12 space-y-14">

            {/* Top Apps */}
            <>
              <div className="space-y-6">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">YOUR TOP APPS</h3>
                  <div className="flex flex-col gap-1">
                    {filteredApps.map((app: IntegrationApp) => (
                      <button
                        key={app.id}
                        onClick={() => onSelect?.(app)}
                        className="flex items-center gap-4 px-2 py-2 rounded-lg hover:bg-muted transition-all group text-left"
                      >
                        <div className={cn("flex items-center justify-center w-5 h-5", app.color.split(' ').pop())}>
                          <app.icon className="w-4.5 h-4.5" />
                        </div>
                        <span className="text-[14px] font-bold text-foreground">{app.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Built-in Tools */}
                <div className="space-y-6">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">POPULAR BUILT-IN TOOLS</h3>
                  <div className="flex flex-col gap-1">
                    {builtInTools.map((tool: IntegrationApp) => (
                      <button
                        key={tool.id}
                        onClick={() => onSelect?.(tool)}
                        className="flex items-center gap-4 px-2 py-2 rounded-lg hover:bg-muted transition-all group text-left"
                      >
                        <div className={cn("flex items-center justify-center w-5 h-5", tool.color.split(' ').pop())}>
                          <tool.icon className="w-4.5 h-4.5" />
                        </div>
                        <span className="text-[14px] font-bold text-foreground">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
            </>
          </div>
        </div>
      </div>
    </div>
  );
}
