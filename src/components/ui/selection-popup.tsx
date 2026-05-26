"use client";

import React, { useState } from "react";
import { Search, Plus, ChevronRight, ChevronDown, MoveUp, MoveDown, ArrowLeftRight, RotateCcw, CircleDashed, Sparkles } from "lucide-react";
import { Input } from "@/src/components/ui/input";
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

function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  isHeader = false,
  hasResults = false,
  searchQuery = ""
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
    if (searchQuery && hasResults) {
      setIsOpen(true);
    }
  }, [searchQuery, hasResults]);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors group"
      >
        {/* Step icon */}
        <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          {icon || <div className="w-3 h-3 rounded-full bg-primary" />}
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
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
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
    const filtered = data.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.id?.toLowerCase().includes(search.toLowerCase())
    );

    if (filtered.length === 0 && search) return null;

    return (
      <div className="py-1">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item);
              onClose();
            }}
            className={cn(
              "w-full text-left px-3 py-2.5 transition-all hover:bg-muted/60 flex items-start gap-2.5 group",
              selectedId === item.id && "bg-primary/10"
            )}
          >
            {/* Step / webhook icon */}
            <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>

            {type === "value" && (
              <div className={cn(
                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors",
                selectedId === item.id ? "border-primary" : "border-border group-hover:border-primary/60"
              )}>
                {selectedId === item.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
            )}

            {type === "value" ? (
              /* Value-picker rows: keep compact single-line layout (label + ID) */
              <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                <span className={cn(
                  "text-[13px] font-semibold shrink-0",
                  selectedId === item.id ? "text-primary" : "text-foreground"
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
              /* Description rows (triggers / actions): stack label + wrapped description */
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className={cn(
                  "text-[13px] font-semibold leading-tight",
                  selectedId === item.id ? "text-primary" : "text-foreground"
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
        ))}
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
      {/* Tabs */}
      {showTabs && (
        <div className="flex items-center border-b border-border bg-popover px-3">
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
                <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1 py-0.5 rounded">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-border bg-popover sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:bg-background transition-all text-[13px]"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar bg-popover">
        <div className="flex flex-col min-h-0">
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
                    isHeader={true}
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
                  <div className="p-8 text-center m-2 rounded-xl border border-dashed border-border bg-card shadow-sm">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
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

          {type === "value" && (
            <div className="p-3 border-t border-border bg-popover/95 backdrop-blur-sm flex items-center gap-2 sticky bottom-0 shadow-[0_-8px_15px_-5px_hsl(var(--foreground)/0.05)] z-20">
              <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all flex items-center gap-1.5 border border-border bg-background">
                <Plus className="w-3 h-3" />
                Load more
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh?.();
                }}
                disabled={isLoading}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all flex items-center gap-1.5 border border-border bg-background",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <RotateCcw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
              <button className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all flex items-center gap-1.5 border border-border bg-background shadow-sm">
                <CircleDashed className="w-3 h-3" />
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {footerAction && (
        <div className="p-1.5 border-t border-border bg-popover">
           <button
            onClick={() => {
              footerAction.onClick();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/40 transition-all shadow-sm group"
          >
            {footerAction.icon || <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
            <span className="text-sm font-bold text-foreground group-hover:text-primary">
              {footerAction.label}
            </span>
          </button>
        </div>
      )}

      {showTabs && (
        <div className="px-3 py-2 border-t border-border bg-popover flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button className="p-1 rounded hover:bg-muted transition-colors">
              <MoveUp className="w-3 h-3 text-muted-foreground" />
            </button>
            <button className="p-1 rounded hover:bg-muted transition-colors">
              <MoveDown className="w-3 h-3 text-muted-foreground" />
            </button>
            <span className="text-[11px] text-muted-foreground ml-1">Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded hover:bg-muted transition-colors">
              <ArrowLeftRight className="w-3 h-3 text-muted-foreground rotate-90" />
            </button>
            <span className="text-[11px] text-muted-foreground">Expand / Collapse</span>
          </div>
        </div>
      )}
    </SidePopup>
  );
}
