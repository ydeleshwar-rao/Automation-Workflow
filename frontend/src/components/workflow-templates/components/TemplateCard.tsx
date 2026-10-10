"use client";

import { Archive, Globe2, MoreHorizontal, Pencil, Play, Trash2, User2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/src/lib/utils";
import type { WorkflowTemplate } from "../types";

interface Props {
  template: WorkflowTemplate;
  onApply: (template: WorkflowTemplate) => void;
  onEdit: (template: WorkflowTemplate) => void;
  onArchive: (template: WorkflowTemplate) => void;
  onDelete: (template: WorkflowTemplate) => void;
}

export function TemplateCard({ template, onApply, onEdit, onArchive, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isArchived = template.status === "archived";

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border/60 bg-background p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
        isArchived && "opacity-70"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground" title={template.name}>
            {template.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {template.category && (
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                {template.category}
              </span>
            )}
            {template.is_public ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                <Globe2 className="h-2.5 w-2.5" />
                Public
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                <User2 className="h-2.5 w-2.5" />
                Private
              </span>
            )}
            {isArchived && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                <Archive className="h-2.5 w-2.5" />
                Archived
              </span>
            )}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-border bg-background shadow-lg">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(template);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onArchive(template);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
              >
                <Archive className="h-3.5 w-3.5" />
                {isArchived ? "Unarchive" : "Archive"}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(template);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground">
        {template.description || "No description"}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-[11px] text-muted-foreground">
          Used <span className="font-semibold text-foreground">{template.usage_count}</span>×
        </span>

        <button
          onClick={() => onApply(template)}
          disabled={isArchived}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            isArchived
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          title={isArchived ? "Archived templates cannot be applied" : "Use this template"}
        >
          <Play className="h-3 w-3" />
          Use template
        </button>
      </div>
    </div>
  );
}
