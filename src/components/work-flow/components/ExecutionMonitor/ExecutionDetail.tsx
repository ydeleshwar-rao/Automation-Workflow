"use client";

import { useGetExecutionDetailQuery } from "../../apiIntegrations/workflowApi";
import { ExecutionStepRow } from "./ExecutionStepRow";
import { cn } from "@/src/lib/utils";
import { X, CheckCircle2, XCircle, Loader2, Clock, Zap } from "lucide-react";

interface Props {
    executionId: string;
    onClose: () => void;
}

const STATUS_META: Record<
    string,
    { icon: any; label: string; badgeCls: string; headerCls: string }
> = {
    success: {
        icon: CheckCircle2,
        label: "Success",
        badgeCls: "bg-green-100 text-green-700",
        headerCls: "border-green-200 bg-green-50",
    },
    failed: {
        icon: XCircle,
        label: "Failed",
        badgeCls: "bg-red-100 text-red-700",
        headerCls: "border-red-200 bg-red-50",
    },
    running: {
        icon: Loader2,
        label: "Running",
        badgeCls: "bg-blue-100 text-blue-700",
        headerCls: "border-blue-200 bg-blue-50",
    },
};

function formatDuration(start: string, end?: string) {
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const ms = e - s;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

export function ExecutionDetail({ executionId, onClose }: Props) {
    const { data: rawData, isLoading, isError } = useGetExecutionDetailQuery(executionId);
    const data = rawData?.data;

    const meta = data ? STATUS_META[data.status] ?? STATUS_META.running : null;
    const Icon = meta?.icon ?? Clock;

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200 w-[420px] shrink-0">
            {/* Header */}
            <div
                className={cn(
                    "flex items-center justify-between px-5 py-4 border-b",
                    meta?.headerCls ?? "bg-slate-50 border-slate-200"
                )}
            >
                <div className="flex items-center gap-2">
                    <Icon
                        className={cn(
                            "h-5 w-5",
                            data?.status === "success" && "text-green-600",
                            data?.status === "failed" && "text-red-600",
                            data?.status === "running" && "text-blue-600 animate-spin"
                        )}
                    />
                    <div>
                        <h3 className="font-semibold text-sm text-slate-900">
                            Execution Detail
                        </h3>
                        {data && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Duration:{" "}
                                <strong>
                                    {formatDuration(data.started_at, data.finished_at)}
                                </strong>
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                        <p className="text-sm text-slate-500">Loading execution…</p>
                    </div>
                )}

                {isError && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <XCircle className="h-8 w-8 text-red-400" />
                        <p className="text-sm text-red-600">Failed to load execution</p>
                    </div>
                )}

                {data && (
                    <div className="flex flex-col gap-3">
                        {/* Execution info banner */}
                        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 flex flex-col gap-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Status</span>
                                <span
                                    className={cn(
                                        "font-semibold px-2 py-0.5 rounded-full",
                                        meta?.badgeCls
                                    )}
                                >
                                    {meta?.label}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Started</span>
                                <span className="text-slate-700 font-medium">
                                    {new Date(data.started_at).toLocaleString()}
                                </span>
                            </div>
                            {data.finished_at && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Finished</span>
                                    <span className="text-slate-700 font-medium">
                                        {new Date(data.finished_at).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Trigger payload */}
                        {data.trigger_payload && (
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                    Trigger Payload
                                </p>
                                <pre className="text-xs text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100 overflow-auto max-h-[160px] whitespace-pre-wrap break-all">
                                    {JSON.stringify(data.trigger_payload, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Step list */}
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Steps ({data.steps.length})
                            </p>
                            <div className="flex flex-col gap-2">
                                {data.steps.length === 0 ? (
                                    <div className="text-sm text-slate-400 text-center py-8">
                                        No steps recorded
                                    </div>
                                ) : (
                                    data.steps.map((step, i) => (
                                        <ExecutionStepRow key={step.id} step={step} index={i} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
