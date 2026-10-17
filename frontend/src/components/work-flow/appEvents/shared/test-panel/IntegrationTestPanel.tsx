"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, Check, Code2, Inbox, Info, Link2, List, Search, Send, Zap } from "lucide-react";
import { RecordDrawer, type RecordViewMode } from "./RecordDrawer";
import type { SampleRecord } from "./RecordTree";

export type IntegrationTestStatus = "idle" | "testing" | "success" | "failed";

/** Where the "Test trigger" button appears before the first test run. */
export type TestButtonPlacement = "header" | "empty-state" | "none";

/** Everything that differs between integrations' test steps. */
export interface IntegrationTestCopy {
  appName: string;
  /** Heading for action nodes, e.g. "Create Job in ServiceM8". */
  actionTitle: string;
  /** Sub-heading for action nodes, e.g. "Testing the integration will create a job with…". */
  actionDescription: string;
  /** Success banner for action nodes. */
  actionSuccessMessage: (recordCount: number) => string;
  /** Empty-state hint for triggers before the first test. */
  idleTriggerHint: string;
}

export interface IntegrationTestPanelProps {
  copy: IntegrationTestCopy;
  data: SampleRecord | SampleRecord[];
  testStatus?: IntegrationTestStatus;
  isTrigger?: boolean;
  onTestTrigger?: () => void;
  testButtonPlacement?: TestButtonPlacement;
  /** Commusoft lets actions retry from the failed banner; others only retry triggers. */
  canRetryActions?: boolean;
}

/** Underscore-prefixed keys (e.g. `_formIsValid`) are internal form state, not record data. */
const isRecordField = (fieldKey: string) => !fieldKey.startsWith("_");

const PRIMARY_BUTTON_CLASS =
  "flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-colors cursor-pointer text-[13px] font-bold text-primary-foreground";

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function toRecordList(data: IntegrationTestPanelProps["data"]): SampleRecord[] {
  if (Array.isArray(data)) return data;
  return data ? [data] : [];
}

/** Test step shared by polling integrations: run a test, then preview the returned sample records. */
export function IntegrationTestPanel({
  copy,
  data,
  testStatus = "idle",
  isTrigger = false,
  onTestTrigger,
  testButtonPlacement = "none",
  canRetryActions = false,
}: IntegrationTestPanelProps) {
  const records = useMemo(() => toRecordList(data), [data]);
  const canRetry = Boolean(onTestTrigger) && (isTrigger || canRetryActions);
  const isAwaitingFirstTest = testStatus === "idle" && Boolean(onTestTrigger);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex-shrink-0 p-6 space-y-4 border-b border-black/8 dark:border-white/5">
        <TestPanelHeader copy={copy} isTrigger={isTrigger} />

        {isAwaitingFirstTest && testButtonPlacement === "header" && (
          <button type="button" onClick={onTestTrigger} className={`w-full p-3 ${PRIMARY_BUTTON_CLASS}`}>
            <Send className="w-4 h-4" />
            {isTrigger ? "Test trigger" : "Test action"}
          </button>
        )}

        <TestStatusBanner
          copy={copy}
          testStatus={testStatus}
          isTrigger={isTrigger}
          recordCount={records.length}
          onRetry={canRetry ? onTestTrigger : undefined}
        />
      </div>

      <DataPreview
        records={records}
        emptyHint={isTrigger && testStatus === "idle" ? copy.idleTriggerHint : "No data to display"}
        emptyAction={
          isTrigger && isAwaitingFirstTest && testButtonPlacement === "empty-state" ? (
            <button type="button" onClick={onTestTrigger} className={`inline-flex px-4 py-2.5 ${PRIMARY_BUTTON_CLASS}`}>
              <Send className="w-3.5 h-3.5" />
              Test trigger
            </button>
          ) : null
        }
      />
    </div>
  );
}

function TestPanelHeader({ copy, isTrigger }: { copy: IntegrationTestCopy; isTrigger: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm">
        <Link2 className="w-5 h-5 text-primary-foreground" />
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
      <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
        {isTrigger ? <Zap className="w-5 h-5 text-primary" /> : <Send className="w-5 h-5 text-muted-foreground" />}
      </div>
      <div className="ml-2">
        <h4 className="text-sm font-bold text-foreground">
          {isTrigger ? `Test ${copy.appName} Trigger` : copy.actionTitle}
        </h4>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isTrigger
            ? `Click "Test trigger" to fetch sample record(s) from ${copy.appName}.`
            : copy.actionDescription}
        </p>
      </div>
    </div>
  );
}

interface TestStatusBannerProps {
  copy: IntegrationTestCopy;
  testStatus: IntegrationTestStatus;
  isTrigger: boolean;
  recordCount: number;
  onRetry?: () => void;
}

function TestStatusBanner({ copy, testStatus, isTrigger, recordCount, onRetry }: TestStatusBannerProps) {
  if (testStatus === "testing") {
    return (
      <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl animate-pulse">
        <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-[13px] font-bold text-primary">
          {isTrigger ? `Fetching from ${copy.appName}...` : `Connecting to ${copy.appName}...`}
        </span>
      </div>
    );
  }

  if (testStatus === "success") {
    return (
      <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-xl">
        <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-success stroke-[3]" />
        </div>
        <span className="text-[13px] font-bold text-success">
          {isTrigger
            ? `Fetched ${pluralize(recordCount, "sample record")} successfully!`
            : copy.actionSuccessMessage(recordCount)}
        </span>
      </div>
    );
  }

  if (testStatus === "failed") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
            <Info className="w-3.5 h-3.5 text-destructive stroke-[3]" />
          </div>
          <span className="text-[13px] font-bold text-destructive">
            {isTrigger
              ? `No records found. Make sure there is data in ${copy.appName} for this event.`
              : "Failed. Please check your credentials and field mapping."}
          </span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl hover:bg-primary/15 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-bold text-primary">Try again</span>
          </button>
        )}
      </div>
    );
  }

  return null;
}

interface DataPreviewProps {
  records: SampleRecord[];
  emptyHint: string;
  emptyAction: React.ReactNode;
}

function DataPreview({ records, emptyHint, emptyAction }: DataPreviewProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<RecordViewMode>("fields");
  const hasRecords = records.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-6 pb-3 border-b border-transparent space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground border-b-2 border-primary pb-1 px-1">
            Data Preview
            {hasRecords && (
              <span className="ml-2 text-muted-foreground font-normal">({pluralize(records.length, "record")})</span>
            )}
          </h3>
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        {hasRecords && viewMode === "fields" && (
          <div className="nm-inset rounded-xl flex items-center gap-2 px-3 h-10">
            <Search className="shrink-0 w-4 h-4 text-muted-foreground/60" />
            <input
              placeholder="Search field names..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none font-medium"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-3 space-y-3">
        {hasRecords ? (
          records.map((record, index) => (
            <RecordDrawer
              key={index}
              index={index}
              record={record}
              totalCount={records.length}
              isInitiallyOpen={index === 0}
              viewMode={viewMode}
              search={search}
              isFieldVisible={isRecordField}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full nm-inset flex items-center justify-center">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">{emptyHint}</p>
            {emptyAction}
          </div>
        )}
      </div>
    </div>
  );
}

const VIEW_MODE_OPTIONS: Array<{ mode: RecordViewMode; label: string; Icon: typeof List }> = [
  { mode: "fields", label: "Fields", Icon: List },
  { mode: "json", label: "JSON", Icon: Code2 },
];

function ViewModeToggle({ viewMode, onChange }: { viewMode: RecordViewMode; onChange: (mode: RecordViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 nm-inset rounded-xl p-1">
      {VIEW_MODE_OPTIONS.map(({ mode, label, Icon }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
            viewMode === mode ? "nm-btn rounded-lg" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );
}
