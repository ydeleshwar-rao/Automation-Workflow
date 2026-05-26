"use client";

import { cn } from "@/src/lib/utils";
import { ExecutionStep } from "@/src/components/work-flow/uiOrchestrator/types";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    Clock,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useState } from "react";

// ── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    success: {
        icon: CheckCircle2,
        color: "text-green-600",
        bg: "bg-green-50 border-green-100",
        dot: "bg-green-500",
        label: "Success",
    },
    failed: {
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50 border-red-100",
        dot: "bg-red-500",
        label: "Failed",
    },
    running: {
        icon: Loader2,
        color: "text-blue-600",
        bg: "bg-blue-50 border-blue-100",
        dot: "bg-blue-500",
        label: "Running",
    },
    pending: {
        icon: Clock,
        color: "text-slate-400",
        bg: "bg-slate-50 border-slate-100",
        dot: "bg-slate-300",
        label: "Pending",
    },
};

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
    step: ExecutionStep;
    index: number;
}

export function ExecutionStepRow({ step, index }: Props) {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CONFIG[step.status] ?? STATUS_CONFIG.pending;
    const Icon = cfg.icon;

    const hasDetails =
        step.input_data || step.output_data || step.error_message;

    return (
        <div
            className={cn(
                "rounded-xl border transition-all overflow-hidden",
                cfg.bg
            )}
        >
            {/* ── Row header ── */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => hasDetails && setExpanded((v) => !v)}
            >
                {/* Step number */}
                <div className="w-6 h-6 rounded-full bg-white border flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {index + 1}
                </div>

                {/* Status icon */}
                <Icon
                    className={cn(
                        "h-4 w-4 shrink-0",
                        cfg.color,
                        step.status === "running" && "animate-spin"
                    )}
                />

                {/* Label */}
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-900 truncate">
                        {step.node_label ?? `Step ${index + 1}`}
                    </span>
                </div>

                {/* Status badge */}
                <span
                    className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        step.status === "success" && "bg-green-100 text-green-700",
                        step.status === "failed" && "bg-red-100 text-red-700",
                        step.status === "running" && "bg-blue-100 text-blue-700",
                        step.status === "pending" && "bg-slate-100 text-slate-500"
                    )}
                >
                    {cfg.label}
                </span>

                {/* Expand toggle */}
                {hasDetails && (
                    <button className="ml-1 text-slate-400 hover:text-slate-600 transition-colors">
                        {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>
                )}
            </div>

            {/* ── Expanded detail ── */}
            {expanded && (
                <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-100 pt-3">
                    {step.error_message && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500 mb-1">
                                Error
                            </p>
                            <pre className="text-xs text-red-700 bg-red-50 rounded-lg p-3 overflow-auto max-h-[120px] whitespace-pre-wrap break-all">
                                {step.error_message}
                            </pre>
                        </div>
                    )}

                    {step.input_data && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Input
                            </p>
                            <pre className="text-xs text-slate-700 bg-white rounded-lg p-3 overflow-auto max-h-[200px] whitespace-pre-wrap break-all border border-slate-100">
                                {JSON.stringify(step.input_data, null, 2)}
                            </pre>
                        </div>
                    )}

                    {step.output_data && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Output
                            </p>
                            <pre className="text-xs text-slate-700 bg-white rounded-lg p-3 overflow-auto max-h-[200px] whitespace-pre-wrap break-all border border-slate-100">
                                {JSON.stringify(step.output_data, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
