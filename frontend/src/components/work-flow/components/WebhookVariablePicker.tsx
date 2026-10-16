"use client";
import React, { useState, useCallback } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Webhook,
  X,
} from "lucide-react";
import { SidePopup } from "@/src/components/ui/side-popup";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";
import { useGetWebhookResponseQuery } from "@/src/components/work-flow/appEvents/webhook/apiIntegrations/webhookApi";
import { parseRequestBodyFromWebhookRow } from "@/src/components/work-flow/appEvents/webhook/apiIntegrations/parseWebhookRequestBody";
import { GetWebhookResponse } from "@/src/components/work-flow/appEvents/webhook/apiIntegrations/types/webhookApis.type";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariableField {
  id: string;
  label: string;
  description: string;
}

export interface WebhookVariablePickerProps {
  /** Whether the popup is open */
  isOpen: boolean;
  /** Label shown in the popup header (name of the field being populated) */
  fieldLabel: string;
  /** Position of the popup relative to the viewport */
  position: { top: number; right: number };
  /** ID of the webhook to fetch requests from (webhook triggers only) */
  webhookId?: string;
  /**
   * Fallback trigger sample when no webhookId exists — used for polling
   * triggers like ServiceM8 / Commusoft whose samples live in
   * `trigger.config.testPayload`.
   */
  triggerTestPayload?: unknown;
  /**
   * Full multi-record list of trigger samples (preferred over triggerTestPayload
   * when populated). Each entry becomes one row in the picker.
   */
  triggerTestSamples?: unknown[];
  /** Called when the user selects a variable field */
  onSelect: (field: VariableField) => void;
  /** Called when the popup should close */
  onClose: () => void;
}

type NormalizedRecord = {
  id: string;
  label: string;
  body: Record<string, unknown>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flattenBody(
  body: Record<string, unknown>,
  prefix = "",
  result: VariableField[] = []
): VariableField[] {
  if (!body || typeof body !== "object") return result;
  for (const [key, value] of Object.entries(body)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const readableLabel = path
      .split(".")
      .map((labelPart) => labelPart.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim())
      .map((labelPart) => labelPart.charAt(0).toUpperCase() + labelPart.slice(1))
      .join(" › ");
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flattenBody(value as Record<string, unknown>, path, result);
    } else {
      result.push({ id: path, label: readableLabel, description: String(value ?? "") });
    }
  }
  return result;
}

const PREVIEW_PRIORITY_KEYS = [
  "name",
  "full_name",
  "first_name",
  "title",
  "subject",
  "company",
  "email",
  "uuid",
  "id",
];

/** Pick the best single-line summary field for a record card. */
function getRecordHeadline(body: Record<string, unknown>): { key: string; value: string } | null {
  for (const priority of PREVIEW_PRIORITY_KEYS) {
    const hit = Object.entries(body).find(
      ([key, value]) => key.toLowerCase() === priority && value != null && value !== ""
    );
    if (hit) {
      return { key: hit[0], value: String(hit[1]).slice(0, 48) };
    }
  }
  const firstLeaf = Object.entries(body).find(
    ([, value]) => value != null && value !== "" && typeof value !== "object"
  );
  return firstLeaf ? { key: firstLeaf[0], value: String(firstLeaf[1]).slice(0, 48) } : null;
}

function getPreviewPairs(
  body: Record<string, unknown>
): Array<{ key: string; value: string }> {
  return Object.entries(body)
    .filter(([, value]) => value != null && value !== "" && typeof value !== "object")
    .slice(0, 2)
    .map(([key, value]) => ({ key: key, value: String(value).slice(0, 36) }));
}

const PANEL_MIN_H = 420;
const PANEL_WIDTH = "w-[360px]";

// ─── Component ────────────────────────────────────────────────────────────────

export function WebhookVariablePicker({
  isOpen,
  fieldLabel,
  position,
  webhookId,
  triggerTestPayload,
  triggerTestSamples,
  onSelect,
  onClose,
}: WebhookVariablePickerProps) {
  const hasWebhook = !!webhookId;
  const hasSampleList =
    !hasWebhook &&
    Array.isArray(triggerTestSamples) &&
    triggerTestSamples.length > 0;
  const hasSingleSample =
    !hasWebhook &&
    !hasSampleList &&
    !!triggerTestPayload &&
    typeof triggerTestPayload === "object" &&
    !Array.isArray(triggerTestPayload);
  const hasSample = hasSampleList || hasSingleSample;

  const { data: responseData, isFetching: requestsLoading, isError, refetch } = useGetWebhookResponseQuery(
    webhookId ?? "",
    { skip: !hasWebhook }
  );

  const records: NormalizedRecord[] = React.useMemo(() => {
    if (hasWebhook) {
      const rows: GetWebhookResponse[] = responseData?.data ?? [];
      return rows.map((row, index) => ({
        id: row.id,
        label: `Request ${index + 1}`,
        body: (parseRequestBodyFromWebhookRow(row) ?? {}) as Record<string, unknown>,
      }));
    }
    if (hasSampleList) {
      return (triggerTestSamples as unknown[])
        .filter((sample) => sample && typeof sample === "object" && !Array.isArray(sample))
        .map((sample, index) => ({
          id: `sample-${index}`,
          label: `Record ${index + 1}`,
          body: sample as Record<string, unknown>,
        }));
    }
    if (hasSingleSample) {
      return [
        {
          id: "sample-0",
          label: "Record 1",
          body: triggerTestPayload as Record<string, unknown>,
        },
      ];
    }
    return [];
  }, [hasWebhook, hasSampleList, hasSingleSample, responseData, triggerTestPayload, triggerTestSamples]);

  const fetchError = hasWebhook && isError ? "Could not load webhook requests" : null;

  // null = request-list panel; string = field-list panel (value is request id)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Persists across popup open/close — once a request is picked, future popups
  // open directly on its field list.
  const [lockedRequestId, setLockedRequestId] = useState<string | null>(null);

  const [fieldSearch, setFieldSearch] = useState("");

  const fetchRequests = useCallback(() => { refetch(); }, [refetch]);

  // Reset panel on open
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRequestId(lockedRequestId);
      setFieldSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedRecord = records.find((record) => record.id === selectedRequestId);
  const selectedIndex = records.findIndex((record) => record.id === selectedRequestId);
  const allFields = selectedRecord ? flattenBody(selectedRecord.body) : [];
  const filteredFields = fieldSearch
    ? allFields.filter(
        (field) =>
          field.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
          field.description.toLowerCase().includes(fieldSearch.toLowerCase())
      )
    : allFields;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SidePopup isOpen={isOpen} onClose={onClose} position={position} width={PANEL_WIDTH}>
      {/* Header */}
      <div className="shrink-0 bg-popover border-b border-border">
        {/* Title row */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Webhook className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-0.5">
                Insert data
              </p>
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {fieldLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Breadcrumb + locked-record badge */}
        <div className="flex items-center justify-between px-3.5 pb-2.5 gap-2">
          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <button
              onClick={() => { setSelectedRequestId(null); setFieldSearch(""); }}
              className={cn(
                "transition-colors",
                selectedRequestId
                  ? "hover:text-foreground cursor-pointer"
                  : "text-primary font-semibold cursor-default"
              )}
            >
              {hasSample ? "Records" : "Requests"}
            </button>
            {selectedRequestId && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-primary font-semibold">
                  {selectedRecord?.label ?? `Record ${selectedIndex + 1}`}
                </span>
              </>
            )}
          </div>

          {lockedRequestId && (
            <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 shrink-0">
              <Lock className="w-2.5 h-2.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary">
                {(() => {
                  const pinnedIndex = records.findIndex((record) => record.id === lockedRequestId);
                  if (pinnedIndex < 0) return "Pinned";
                  return hasSample ? `Record ${pinnedIndex + 1} pinned` : `Req ${pinnedIndex + 1} pinned`;
                })()}
              </span>
              <button
                onClick={() => { setLockedRequestId(null); setSelectedRequestId(null); setFieldSearch(""); }}
                className="ml-0.5 text-primary/60 hover:text-primary transition-colors"
                title="Unpin — show all records next time"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sliding panels */}
      <div className="relative overflow-hidden" style={{ minHeight: `${PANEL_MIN_H}px` }}>
        <div
          className="flex transition-transform duration-300 ease-in-out absolute inset-0"
          style={{
            width: "200%",
            transform: selectedRequestId ? "translateX(-50%)" : "translateX(0)",
          }}
        >
          {/* Panel 1: Request list */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            {requestsLoading && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-[12px] text-muted-foreground">Loading requests…</span>
              </div>
            )}

            {!requestsLoading && fetchError && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 px-5 py-12 text-center">
                <p className="text-[12px] text-destructive font-medium">{fetchError}</p>
                <button
                  onClick={fetchRequests}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            )}

            {!requestsLoading && !fetchError && !hasWebhook && !hasSample && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 px-5 py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                  <Webhook className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-[12px] text-foreground font-medium">No trigger data yet</p>
                <p className="text-[11px] text-muted-foreground max-w-[220px]">
                  Run &quot;Test trigger&quot; on your trigger step first, then come back.
                </p>
              </div>
            )}

            {!requestsLoading && !fetchError && hasWebhook && records.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 px-5 py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Webhook className="w-5 h-5 text-primary/70" />
                </div>
                <p className="text-[12px] text-foreground font-semibold">No requests yet</p>
                <p className="text-[11px] text-muted-foreground max-w-[220px]">
                  Send a request to your webhook URL then refresh.
                </p>
                <button
                  onClick={fetchRequests}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 transition-colors mt-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>
            )}

            {!requestsLoading && !fetchError && records.length > 0 && (
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40 border-b border-border shrink-0">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {hasSample
                      ? `${records.length} record${records.length !== 1 ? "s" : ""} from trigger test`
                      : `${records.length} request${records.length !== 1 ? "s" : ""} received`}
                  </span>
                  {hasWebhook && (
                    <button
                      onClick={fetchRequests}
                      className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: `${PANEL_MIN_H - 40}px` }}>
                  {records.map((record, index) => {
                    const headline = getRecordHeadline(record.body);
                    const pairs = getPreviewPairs(record.body);
                    const fieldCount = Object.keys(record.body).length;
                    const isLocked = lockedRequestId === record.id;
                    return (
                      <button
                        key={record.id}
                        onClick={() => {
                          setSelectedRequestId(record.id);
                          setLockedRequestId(record.id);
                          setFieldSearch("");
                        }}
                        className={cn(
                          "w-full text-left px-3.5 py-3 transition-colors border-b border-border last:border-0 group",
                          isLocked
                            ? "bg-primary/10 hover:bg-primary/15"
                            : "hover:bg-muted/60 active:bg-muted"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5",
                            isLocked
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/15 text-primary"
                          )}>
                            {isLocked ? <Lock className="w-3.5 h-3.5" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-semibold text-foreground truncate">
                                {record.label}
                              </span>
                              <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                                {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {headline && (
                              <div className="mt-0.5 text-[12px] text-foreground font-medium truncate">
                                <span className="text-muted-foreground font-normal">{headline.key}: </span>
                                {headline.value}
                              </div>
                            )}
                            {pairs.length > 0 && (
                              <div className="mt-1.5 flex flex-col gap-0.5">
                                {pairs.map(({ key, value }) => (
                                  <div key={key} className="flex items-baseline gap-1.5 min-w-0">
                                    <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                                      {key}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground truncate">
                                      {value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-2" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Panel 2: Field list */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40 shrink-0">
              <button
                onClick={() => { setSelectedRequestId(null); setFieldSearch(""); }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              {selectedRecord && (
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {allFields.length} field{allFields.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="px-3 py-2 border-b border-border bg-popover shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search fields…"
                  value={fieldSearch}
                  onChange={(event) => setFieldSearch(event.target.value)}
                  className="pl-8 h-8 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:bg-background text-[13px]"
                  autoFocus={!!selectedRequestId}
                />
              </div>
            </div>

            <div className="overflow-y-auto no-scrollbar flex-1" style={{ maxHeight: `${PANEL_MIN_H - 72}px` }}>
              {filteredFields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
                  <p className="text-[12px] text-muted-foreground">
                    {fieldSearch
                      ? "No matching fields"
                      : hasSample
                      ? "No fields in this record"
                      : "No fields in this request"}
                  </p>
                </div>
              ) : (
                filteredFields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => onSelect(field)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-primary/10 active:bg-primary/15 transition-colors border-b border-border last:border-0 group flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground group-hover:text-primary leading-tight">
                        {field.label}
                      </p>
                      {field.description && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5 group-hover:text-primary/70">
                          {field.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </SidePopup>
  );
}
