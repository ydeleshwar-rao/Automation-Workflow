"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, GitBranch, Play, Trash2, Clock, CheckCircle2, PauseCircle, Circle, Zap, Search, Loader2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import {
  useGetAiWorkflowsQuery,
  useCreateAiWorkflowMutation,
  useDeleteAiWorkflowMutation,
} from "./aiWorkflowApi";
import type { AiWorkflowListItem } from "@/src/lib/ai-workflow/types";
import { getActiveUserId } from "@/src/store/localStorage";

// ── useCurrentUser ─────────────────────────────────────────────────────────
// Reads user_id from the current auth session.
function useUserId(): string | null {
  if (typeof window === "undefined") return null;
  return getActiveUserId() || null;
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS = {
  draft:  { label: "Draft",  Icon: Circle,        className: "text-muted-foreground bg-muted/40" },
  active: { label: "Active", Icon: CheckCircle2,  className: "text-success bg-success/15" },
  paused: { label: "Paused", Icon: PauseCircle,   className: "text-warning bg-warning/20" },
} as const;

function StatusChip({ status }: { status: AiWorkflowListItem["status"] }) {
  const { label, Icon, className } = STATUS[status];
  return (
    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold", className)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Workflow card ─────────────────────────────────────────────────────────────
function WorkflowCard({
  wf,
  onOpen,
  onDelete,
}: {
  wf: AiWorkflowListItem;
  onOpen:  (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="nm-card rounded-2xl p-5 flex flex-col gap-3 group transition-all hover:scale-[1.01]">
      {/* Icon + status */}
      <div className="flex items-start justify-between">
        <div className="nm-inset w-10 h-10 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <StatusChip status={wf.status} />
      </div>

      {/* Name */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground leading-tight">{wf.name}</h3>
        {wf.description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{wf.description}</p>
        )}
      </div>

      {/* Date */}
      <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
        <Clock className="w-3 h-3" />
        {new Date(wf.updated_at).toLocaleDateString("en-AU", {
          day: "numeric", month: "short", year: "numeric",
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        <button
          onClick={() => onOpen(wf.id)}
          className="flex-1 h-9 nm-btn rounded-xl text-[12px] font-bold text-foreground hover:text-primary transition-all"
        >
          Open Editor
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(wf.id); }}
          className="nm-btn h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── AiWorkflowList ────────────────────────────────────────────────────────────
export function AiWorkflowList() {
  const router   = useRouter();
  const userId   = useUserId();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetAiWorkflowsQuery(
    { userId: userId! },
    { skip: !userId }
  );
  const [createWf, { isLoading: isCreating }] = useCreateAiWorkflowMutation();
  const [deleteWf] = useDeleteAiWorkflowMutation();

  const workflows: AiWorkflowListItem[] = (data?.data ?? []) as AiWorkflowListItem[];

  const filtered = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!userId) { toast.error("User not found"); return; }
    try {
      const res = await createWf({ user_id: userId, name: "Untitled AI Workflow" }).unwrap();
      const newId = (res as any)?.data?.id ?? (res as any)?.id;
      if (newId) router.push(`/dashboard/ai-workflow/${newId}`);
    } catch {
      toast.error("Failed to create workflow");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWf(id).unwrap();
      toast.success("Workflow deleted");
    } catch {
      toast.error("Failed to delete workflow");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--surface))]">
      {/* Page header */}
      <div className="px-8 pt-8 pb-6 border-b border-black/8 dark:border-white/5 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="nm-inset w-8 h-8 rounded-xl flex items-center justify-center">
                <GitBranch className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">AI Workflows</h1>
            </div>
            <p className="text-[13px] text-muted-foreground max-w-lg">
              Build visual AI automations — drag &amp; drop nodes, connect them, and deploy in seconds.
            </p>
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className={cn(
              "flex items-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold text-primary-foreground shrink-0",
              "bg-primary border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]",
              "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_hsl(var(--foreground))]",
              "transition-all dark:border-border dark:shadow-[4px_4px_0_hsl(var(--border))] dark:hover:shadow-[6px_6px_0_hsl(var(--border))]",
              isCreating && "opacity-70 cursor-not-allowed"
            )}
          >
            {isCreating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Plus className="w-4 h-4" />
            }
            New Workflow
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 nm-inset rounded-xl flex items-center gap-2 px-3 h-9 max-w-sm">
          <Search className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <input
            placeholder="Search workflows…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none font-medium"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-6">
        {isLoading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="nm-card rounded-2xl p-5 h-[176px] animate-pulse">
                <div className="w-10 h-10 rounded-xl nm-inset mb-3" />
                <div className="h-4 rounded-lg nm-inset mb-2 w-3/4" />
                <div className="h-3 rounded-lg nm-inset w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="nm-inset w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-primary/60" />
            </div>
            <h2 className="text-[15px] font-bold text-foreground mb-1">
              {search ? "No workflows match your search" : "No AI Workflows yet"}
            </h2>
            <p className="text-[12px] text-muted-foreground mb-6 max-w-xs">
              {search
                ? "Try a different search term."
                : "Create your first AI automation workflow — drag and drop nodes to build it visually."}
            </p>
            {!search && (
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex items-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold text-primary-foreground bg-primary border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_hsl(var(--foreground))] transition-all dark:border-border dark:shadow-[4px_4px_0_hsl(var(--border))] dark:hover:shadow-[6px_6px_0_hsl(var(--border))]"
              >
                <Plus className="w-4 h-4" />
                Create First Workflow
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((wf) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                onOpen={(id) => router.push(`/dashboard/ai-workflow/${id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
