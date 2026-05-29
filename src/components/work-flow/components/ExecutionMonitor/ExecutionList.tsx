"use client";

import { Execution } from "@/src/components/work-flow/uiOrchestrator/types";
import { cn } from "@/src/lib/utils";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    Clock,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useGetExecutionsQuery } from "../../apiIntegrations/workflowApi";

// ── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    success: {
        icon: CheckCircle2,
        color: "text-green-600",
        badge: "bg-green-100 text-green-700",
        label: "Success",
    },
    failed: {
        icon: XCircle,
        color: "text-red-600",
        badge: "bg-red-100 text-red-700",
        label: "Failed",
    },
    running: {
        icon: Loader2,
        color: "text-blue-600",
        badge: "bg-blue-100 text-blue-700",
        label: "Running",
    },
};

function formatRelative(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(dateStr).toLocaleDateString();
}

function formatDuration(start: string, end?: string) {
    if (!end) return "—";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
    workflowId: string;
    activeExecutionId: string | null;
    onSelectExecution: (id: string) => void;
}

export function ExecutionList({
    workflowId,
    activeExecutionId,
    onSelectExecution,
}: Props) {
    const { data: rawData, isLoading, isError, refetch } =
        useGetExecutionsQuery(workflowId);

    const executions = rawData?.data ?? [];

    return (
        <div className="flex flex-col h-full">
            {/* List header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                <div>
                    <h2 className="font-semibold text-slate-900">Execution History</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {executions.length} run{executions.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={refetch}
                    className="w-8 h-8 text-slate-500"
                    title="Refresh"
                >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                        <p className="text-sm text-slate-500">Loading executions…</p>
                    </div>
                )}

                {isError && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <XCircle className="h-8 w-8 text-red-400" />
                        <p className="text-sm text-red-600 text-center">
                            Failed to load executions.
                            <br />
                            <button
                                onClick={refetch}
                                className="text-indigo-600 underline mt-1"
                            >
                                Retry
                            </button>
                        </p>
                    </div>
                )}

                {!isLoading && !isError && executions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Clock className="h-10 w-10 text-slate-200" />
                        <div className="text-center">
                            <p className="text-sm font-medium text-slate-700">
                                No executions yet
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Publish the workflow and trigger it to see runs here.
                            </p>
                        </div>
                    </div>
                )}

                {executions.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {executions.map((exec) => {
                            const cfg =
                                STATUS_CONFIG[exec.status] ?? STATUS_CONFIG.running;
                            const Icon = cfg.icon;
                            const isActive = exec.id === activeExecutionId;

                            return (
                                <button
                                    key={exec.id}
                                    onClick={() => onSelectExecution(exec.id)}
                                    className={cn(
                                        "w-full text-left rounded-xl border p-4 transition-all flex items-center gap-4 group",
                                        isActive
                                            ? "border-indigo-300 bg-indigo-50 shadow-sm"
                                            : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "h-5 w-5 shrink-0",
                                            cfg.color,
                                            exec.status === "running" && "animate-spin"
                                        )}
                                    />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-800 truncate">
                                                {formatRelative(exec.started_at)}
                                            </span>
                                            <span
                                                className={cn(
                                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                                                    cfg.badge
                                                )}
                                            >
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Duration:{" "}
                                            {formatDuration(exec.started_at, exec.finished_at)}
                                        </p>
                                    </div>

                                    {isActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
