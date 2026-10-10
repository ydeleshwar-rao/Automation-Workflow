"use client";

import React from "react";
import {
  ChevronRight,
  Webhook,
  Pencil,
  Save,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { WebhookRequest, WebhookTestStatus } from "../../../uiOrchestrator/types";

// ─── DataField ───────────────────────────────────────────────────────────────

interface DataFieldProps {
  label: string;
  value: any;
  depth?: number;
  path?: string;
  editedValues?: Record<string, any>;
  onEdit?: (path: string, value: string) => void;
}

function DataField({ label, value, depth = 0, path = "", editedValues, onEdit }: DataFieldProps) {
  const isObject = typeof value === "object" && value !== null;
  const currentPath = path ? `${path}.${label}` : label;

  if (isObject && !Array.isArray(value)) {
    return (
      <div className="space-y-2" style={{ paddingLeft: depth > 0 ? "1rem" : "0" }}>
        <div className="bg-muted/60 border border-border rounded-md px-2 py-1 w-fit">
          <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
        </div>
        <div className="space-y-2 border-l-2 border-border/40 ml-4 pl-3">
          {Object.entries(value).map(([k, v]) => (
            <DataField
              key={k}
              label={k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1").trim()}
              value={v}
              depth={depth + 1}
              path={currentPath}
              editedValues={editedValues}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>
    );
  }

  const displayValue =
    editedValues && currentPath in editedValues
      ? editedValues[currentPath]
      : isObject
      ? JSON.stringify(value)
      : String(value ?? "");

  const [isEditing, setIsEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isEdited = editedValues && currentPath in editedValues;

  return (
    <div className="flex items-center gap-2" style={{ paddingLeft: depth > 0 ? "1rem" : "0" }}>
      <div className="bg-muted/60 border border-border rounded-md px-2 py-0.5 min-w-[80px] text-center shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">{label}</span>
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-1 group/field">
        {isEditing ? (
          <input
            ref={inputRef}
            value={displayValue}
            onChange={(e) => onEdit?.(currentPath, e.target.value)}
            onBlur={() => setIsEditing(false)}
            className="flex-1 text-[13px] text-foreground font-medium bg-background border border-primary/50 ring-1 ring-primary/20 rounded-md px-2 py-0.5 outline-none"
          />
        ) : (
          <span
            onClick={() => { if (onEdit) { setIsEditing(true); setTimeout(() => inputRef.current?.focus(), 0); } }}
            className={cn(
              "flex-1 min-w-0 text-[13px] font-medium break-words cursor-text rounded-md px-2 py-0.5 transition-all",
              isEdited
                ? "text-primary bg-primary/10 border border-primary/20"
                : "text-foreground hover:bg-muted/50 border border-transparent"
            )}
          >
            {displayValue || <span className="text-muted-foreground/40 italic">empty</span>}
          </span>
        )}
        {onEdit && !isEditing && (
          <Pencil
            onClick={() => { setIsEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer hover:text-primary shrink-0"
          />
        )}
      </div>
    </div>
  );
}

// ─── WebhookTestStep ──────────────────────────────────────────────────────────

interface WebhookTestStepProps {
  webhookUrl: string;
  testStatus: WebhookTestStatus;
  requests: WebhookRequest[];
  onFindNewRecords: () => void;
  onCopyUrl: () => void;
  onSkipTest: () => void;
  onSaveData?: (responseId: string, data: Record<string, any>) => void;
}

export function WebhookTestStep({
  webhookUrl,
  testStatus,
  requests,
  onFindNewRecords,
  onCopyUrl,
  onSkipTest,
  onSaveData,
}: WebhookTestStepProps) {
  const [copied, setCopied] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [editedValues, setEditedValues] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    if (requests.length > 0 && !expandedId) {
      setExpandedId(requests[0].id);
    }
  }, [requests.length]);

  React.useEffect(() => {
    setEditedValues({});
  }, [expandedId]);

  const handleCopy = () => {
    onCopyUrl();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const buildUpdatedData = (original: Record<string, any>): Record<string, any> => {
    const result = JSON.parse(JSON.stringify(original));
    for (const [dotPath, newValue] of Object.entries(editedValues)) {
      const parts = dotPath.split(".");
      let cursor: any = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const rawKey =
          Object.keys(cursor).find(
            (k) => k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1").trim() === parts[i]
          ) ?? parts[i];
        cursor = cursor[rawKey];
        if (!cursor || typeof cursor !== "object") break;
      }
      if (cursor && typeof cursor === "object") {
        const lastPart = parts[parts.length - 1];
        const rawKey =
          Object.keys(cursor).find(
            (k) => k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1").trim() === lastPart
          ) ?? lastPart;
        cursor[rawKey] = newValue;
      }
    }
    return result;
  };

  const handleSaveEdits = (request: WebhookRequest) => {
    const updated = buildUpdatedData(request.data);
    onSaveData?.(request.id, updated);
    setEditedValues({});
  };

  const hasEdits = Object.keys(editedValues).length > 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      {/* Header: Webhook URL */}
      <div className="flex-shrink-0 p-6 space-y-3 border-b border-black/8 dark:border-white/5 bg-[hsl(var(--surface))]">
        <div>
          <h4 className="text-sm font-bold text-foreground">Your webhook URL</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure your application to POST to this URL.
          </p>
        </div>
        <div className="flex items-center gap-2 p-1.5 pl-3 nm-inset rounded-xl">
          <code className="text-[11px] text-muted-foreground font-medium truncate flex-1 leading-none">
            {webhookUrl}
          </code>
          <button
            onClick={handleCopy}
            className={cn(
              "nm-btn flex h-8 items-center rounded-xl px-3 text-xs font-bold transition-all",
              copied ? "text-emerald-500" : "text-primary"
            )}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">

        {/* Idle state */}
        {testStatus === "idle" && (
          <div className="space-y-4">
            <div className="nm-inset rounded-2xl p-5 text-center space-y-2 border border-dashed border-border/40">
              <Webhook className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No records yet</p>
              <p className="text-xs text-muted-foreground">
                Send a request to your webhook URL, then click below to load it.
              </p>
            </div>
            <button
              onClick={onFindNewRecords}
              className="w-full h-10 font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_hsl(var(--foreground))] dark:border-border dark:shadow-[3px_3px_0_hsl(var(--border))] dark:hover:shadow-[5px_5px_0_hsl(var(--border))]"
            >
              Find new records
            </button>
            <button
              onClick={onSkipTest}
              className="w-full text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Skip test for now
            </button>
          </div>
        )}

        {/* Records list */}
        {testStatus === "success" && (
          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-400">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {requests.length} record{requests.length !== 1 ? "s" : ""} found
              </p>
              <button
                onClick={onFindNewRecords}
                className="text-xs text-primary hover:text-primary/70 font-medium transition-colors"
              >
                Refresh
              </button>
            </div>

            {requests.map((request) => {
              const isExpanded = expandedId === request.id;
              const fieldKeys = Object.keys(request.data || {});

              return (
                <div
                  key={request.id}
                  className={cn(
                    "rounded-2xl transition-all duration-200",
                    isExpanded
                      ? "nm-inset outline outline-1 outline-primary/30"
                      : "nm-card"
                  )}
                >
                  {/* Card header */}
                  <button
                    onClick={() => handleToggleExpand(request.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-foreground block">{request.name}</span>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {fieldKeys.length} fields · {request.timestamp}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform duration-200 shrink-0",
                        isExpanded ? "rotate-90 text-primary" : "text-muted-foreground/40"
                      )}
                    />
                  </button>

                  {/* Expanded data */}
                  {isExpanded && (
                    <div className="border-t border-border/40 px-4 pb-4 space-y-3 animate-in slide-in-from-top-1 duration-200">
                      <div className="space-y-2 pt-3">
                        {request.data && fieldKeys.length > 0 ? (
                          fieldKeys.map((key) => (
                            <DataField
                              key={key}
                              label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1").trim()}
                              value={request.data[key]}
                              path=""
                              editedValues={editedValues}
                              onEdit={(path, val) => setEditedValues((prev) => ({ ...prev, [path]: val }))}
                            />
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-4">No payload data</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                        {hasEdits && (
                          <>
                            <span className="text-[11px] text-primary font-medium mr-auto">
                              {Object.keys(editedValues).length} field{Object.keys(editedValues).length !== 1 ? "s" : ""} edited
                            </span>
                            <button
                              onClick={() => setEditedValues({})}
                              className="nm-btn flex h-8 items-center rounded-xl px-3 text-xs text-muted-foreground hover:text-foreground transition-all"
                            >
                              Discard
                            </button>
                            <button
                              onClick={() => handleSaveEdits(request)}
                              className="flex h-8 items-center gap-1.5 rounded-xl px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all"
                            >
                              <Save className="w-3 h-3" />
                              Save edits
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
