"use client";

import React, { useState } from "react";
import {
  Search, Plus, ChevronRight, ChevronDown,
  MoveUp, MoveDown, ArrowLeftRight, RotateCcw, CircleDashed,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { SidePopup } from "./side-popup";

export interface SelectionItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  metadata?: any;
}

export interface SelectionSection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  items: SelectionItem[];
  defaultOpen?: boolean;
}

export interface SelectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SelectionItem) => void;
  items?: SelectionItem[];
  selectedId?: string;
  placeholder?: string;
  title?: string;
  footerAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  position?: { top: number; right: number };
  showTabs?: boolean;
  type?: "variable" | "value";
  sections?: SelectionSection[];
  onRefresh?: () => void;
  isLoading?: boolean;
  width?: string;
}

// ── Collapsible section ────────────────────────────────────────────────────────
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  hasResults = false,
  searchQuery = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isHeader?: boolean;
  hasResults?: boolean;
  searchQuery?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  React.useEffect(() => {
    if (searchQuery && hasResults) setIsOpen(true);
  }, [searchQuery, hasResults]);

  return (
    <div className="border-b border-black/8 dark:border-white/5 last:border-0">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary/5 rounded-xl transition-colors group"
      >
        <div className="nm-inset w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
          {icon || <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <span className="text-[13px] font-semibold text-foreground flex-1 text-left truncate">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {hasResults && searchQuery && (
            <span className="text-[9px] font-bold bg-success/10 text-success px-1.5 py-0.5 rounded border border-success/20 uppercase">
              Match
            </span>
          )}
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          }
        </div>
      </button>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main SelectionPopup ────────────────────────────────────────────────────────
export function SelectionPopup({
  isOpen,
  onClose,
  onSelect,
  items = [],
  selectedId,
  placeholder = "Search",
  title = "Select",
  footerAction,
  position = { top: 400, right: 445 },
  showTabs = false,
  type = "variable",
  sections,
  onRefresh,
  isLoading,
  width = "w-[300px]",
}: SelectionPopupProps) {
  const [search, setSearch] = useState("");

  const renderList = (data: SelectionItem[]) => {
    const filtered = data.filter(
      (item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()) ||
        item.id?.toLowerCase().includes(search.toLowerCase())
    );

    if (filtered.length === 0 && search) return null;

    return (
      <div className="py-1 px-2 space-y-0.5">
        {filtered.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onSelect(item); onClose(); }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 group",
                isSelected
                  ? "nm-inset"
                  : "nm-btn"
              )}
            >
              {/* Dot indicator */}
              <div className={cn(
                "nm-card w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  isSelected ? "bg-primary" : "bg-muted-foreground/40 group-hover:bg-primary/60"
                )} />
              </div>

              {type === "value" && (
                <div className={cn(
                  "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors",
                  isSelected ? "border-primary" : "border-border group-hover:border-primary/60"
                )}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
              )}

              {type === "value" ? (
                <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                  <span className={cn(
                    "text-[13px] font-semibold shrink-0",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-[12px] text-muted-foreground truncate">
                      {`ID: ${item.id}`}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className={cn(
                    "text-[13px] font-semibold leading-tight",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-[11.5px] text-muted-foreground leading-snug whitespace-normal break-words">
                      {item.description}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <SidePopup
      isOpen={isOpen}
      onClose={onClose}
      title={showTabs ? undefined : title}
      position={position}
      width={width}
    >
      {/* ── Tabs ── */}
      {showTabs && (
        <div className="flex items-center border-b border-black/8 dark:border-white/5 px-3 shrink-0">
          {[
            { label: "Data", active: true },
            { label: "Dynamic", active: false },
            { label: "Formulas", active: false, badge: "Beta" },
          ].map(({ label, active, badge }) => (
            <button
              key={label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold border-b-2 transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {badge && (
                <span className="text-[9px] font-bold nm-inset px-1 py-0.5 rounded text-muted-foreground">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Search ── */}
      <div className="px-3 py-2.5 border-b border-black/8 dark:border-white/5 sticky top-0 z-10 bg-[hsl(var(--surface))]">
        <div className="nm-inset rounded-xl flex items-center gap-2 px-3 h-8">
          <Search className="shrink-0 w-3.5 h-3.5 text-muted-foreground/60" />
          <input
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none font-medium"
            autoFocus
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex flex-col min-h-0 py-1">
          <div className="flex-1">
            {sections ? (
              sections.map((section) => {
                const listContent = renderList(section.items);
                if (search && !listContent) return null;
                return (
                  <CollapsibleSection
                    key={section.id}
                    title={section.title}
                    icon={section.icon}
                    defaultOpen={section.defaultOpen}
                    isHeader
                    hasResults={!!listContent}
                    searchQuery={search}
                  >
                    {listContent}
                  </CollapsibleSection>
                );
              })
            ) : (
              <div>
                {renderList(items) || (
                  <div className="m-3 p-8 text-center nm-inset rounded-2xl border border-dashed border-border/40">
                    <div className="w-10 h-10 nm-card rounded-full flex items-center justify-center mx-auto mb-3">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-bold text-foreground mb-1">No matches found</p>
                    <p className="text-[10px] text-muted-foreground max-w-[150px] mx-auto">
                      Try a different search term or check previous steps for data.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Value footer (Load more / Refresh / Clear) ── */}
          {type === "value" && (
            <div className="px-3 py-2.5 border-t border-black/8 dark:border-white/5 flex items-center gap-2 sticky bottom-0 bg-[hsl(var(--surface))] z-20">
              <button className="nm-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-primary transition-all">
                <Plus className="w-3 h-3" />
                Load more
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRefresh?.(); }}
                disabled={isLoading}
                className={cn(
                  "nm-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-primary transition-all",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <RotateCcw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
              <button className="nm-btn ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-destructive transition-all">
                <CircleDashed className="w-3 h-3" />
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer action ── */}
      {footerAction && (
        <div className="p-2.5 border-t border-black/8 dark:border-white/5">
          <button
            onClick={() => { footerAction.onClick(); onClose(); }}
            className="nm-btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-primary hover:text-primary/80 transition-all group"
          >
            {footerAction.icon || <Plus className="w-4 h-4" />}
            <span>{footerAction.label}</span>
          </button>
        </div>
      )}

      {/* ── Tabs nav footer ── */}
      {showTabs && (
        <div className="px-3 py-2 border-t border-black/8 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button className="nm-btn p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <MoveUp className="w-3 h-3" />
            </button>
            <button className="nm-btn p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <MoveDown className="w-3 h-3" />
            </button>
            <span className="text-[11px] text-muted-foreground ml-1">Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="nm-btn p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowLeftRight className="w-3 h-3 rotate-90" />
            </button>
            <span className="text-[11px] text-muted-foreground">Expand / Collapse</span>
          </div>
        </div>
      )}
    </SidePopup>
  );
}
