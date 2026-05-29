"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Check,
  ChevronRight,
  Link2,
  Send,
  Info,
  ArrowRight,
  Zap,
  Code2,
  List,
  Inbox,
  Maximize2,
  Minimize2,
  Copy,
} from "lucide-react";

type Accent = {
  text: string;
  textSoft: string;
  bg: string;
  bgSoft: string;
  border: string;
  ring: string;
  underline: string;
  iconBg: string;
};

const ACCENT: Accent = {
  text: "text-primary",
  textSoft: "text-primary",
  bg: "bg-primary",
  bgSoft: "bg-primary/10",
  border: "border-primary/30",
  ring: "focus-visible:ring-primary/20 focus-visible:border-primary",
  underline: "border-primary",
  iconBg: "bg-primary",
};

function prettyLabel(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function renderLeafValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="italic text-muted-foreground">—</span>;
  }
  if (value === "") {
    return <span className="italic text-muted-foreground">empty</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
          value ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
        }`}
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return <span className="font-mono tabular-nums text-foreground">{value}</span>;
  }
  return <span className="text-foreground">{String(value)}</span>;
}

function collectExpandablePaths(value: any, basePath: string, out: Set<string>) {
  if (Array.isArray(value)) {
    out.add(basePath);
    value.forEach((item, idx) =>
      collectExpandablePaths(item, `${basePath}.${idx}`, out)
    );
  } else if (typeof value === "object" && value !== null) {
    out.add(basePath);
    Object.entries(value).forEach(([k, v]) =>
      collectExpandablePaths(v, `${basePath}.${k}`, out)
    );
  }
}

interface TreeRowProps {
  label: string;
  rawKey: string;
  value: any;
  depth: number;
  path: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  accent: Accent;
}

function TreeRow({
  label,
  value,
  depth,
  path,
  expanded,
  onToggle,
  accent,
}: TreeRowProps) {
  const isArray = Array.isArray(value);
  const isObject = typeof value === "object" && value !== null && !isArray;
  const isExpandable = isArray || isObject;
  const isOpen = expanded.has(path);

  const childCount = isArray
    ? value.length
    : isObject
    ? Object.keys(value).length
    : 0;

  const previewBadge = isArray
    ? `[${childCount}]`
    : isObject
    ? `{${childCount}}`
    : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => isExpandable && onToggle(path)}
        disabled={!isExpandable}
        className={`w-full flex items-start gap-2 py-1.5 px-2 rounded-md text-left transition-colors ${
          isExpandable
            ? "hover:bg-muted cursor-pointer"
            : "cursor-default"
        }`}
      >
        <span className="flex-shrink-0 w-4 h-5 flex items-center justify-center mt-0.5">
          {isExpandable ? (
            <ChevronRight
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          ) : (
            <span className="w-1 h-1 rounded-full bg-border" />
          )}
        </span>

        <div className="flex-shrink-0 min-w-[140px] max-w-[200px]">
          <span className="text-[12px] font-semibold text-foreground break-words">
            {label}
          </span>
          {previewBadge && (
            <span
              className={`ml-1.5 text-[10px] font-mono font-bold ${accent.textSoft}`}
            >
              {previewBadge}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 text-[12px] break-words whitespace-pre-wrap">
          {isExpandable ? (
            <span className="text-muted-foreground italic">
              {isArray
                ? `${childCount} item${childCount === 1 ? "" : "s"}`
                : `${childCount} field${childCount === 1 ? "" : "s"}`}
            </span>
          ) : (
            renderLeafValue(value)
          )}
        </div>
      </button>

      {isExpandable && isOpen && childCount > 0 && (
        <div className="ml-3 pl-3 border-l border-border">
          {isArray
            ? value.map((item: any, idx: number) => (
                <TreeRow
                  key={idx}
                  label={`[${idx}]`}
                  rawKey={String(idx)}
                  value={item}
                  depth={depth + 1}
                  path={`${path}.${idx}`}
                  expanded={expanded}
                  onToggle={onToggle}
                  accent={accent}
                />
              ))
            : Object.entries(value).map(([k, v]) => (
                <TreeRow
                  key={k}
                  label={prettyLabel(k)}
                  rawKey={k}
                  value={v}
                  depth={depth + 1}
                  path={`${path}.${k}`}
                  expanded={expanded}
                  onToggle={onToggle}
                  accent={accent}
                />
              ))}
        </div>
      )}
    </div>
  );
}

interface RecordTreeProps {
  record: Record<string, any>;
  recordKey: string;
  search: string;
  accent: Accent;
}

function RecordTree({ record, recordKey, search, accent }: RecordTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const entries = Object.entries(record).filter(
    ([key]) =>
      key.toLowerCase().includes(search.toLowerCase()) && key !== "_formIsValid"
  );

  const toggle = (p: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    entries.forEach(([k, v]) => collectExpandablePaths(v, `${recordKey}.${k}`, all));
    setExpanded(all);
  };
  const collapseAll = () => setExpanded(new Set());

  if (entries.length === 0) {
    return (
      <p className="text-center py-8 text-muted-foreground text-[13px] italic">
        {search ? "No matching fields found" : "No data to display"}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-1 mb-2 pb-2 border-b border-border">
        <button
          type="button"
          onClick={expandAll}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3 h-3" />
          Expand all
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <Minimize2 className="w-3 h-3" />
          Collapse all
        </button>
      </div>
      <div className="space-y-0.5">
        {entries.map(([k, v]) => (
          <TreeRow
            key={k}
            label={prettyLabel(k)}
            rawKey={k}
            value={v}
            depth={0}
            path={`${recordKey}.${k}`}
            expanded={expanded}
            onToggle={toggle}
            accent={accent}
          />
        ))}
      </div>
    </div>
  );
}

function getRecordSummary(record: Record<string, any>): string {
  if (!record) return "";
  const priority = ["name", "first_name", "full_name", "title", "subject", "uuid", "id", "email"];
  for (const key of priority) {
    if (record[key]) return `${key}: ${String(record[key]).slice(0, 50)}`;
  }
  const firstLeaf = Object.entries(record).find(
    ([, v]) => v !== null && v !== undefined && typeof v !== "object"
  );
  return firstLeaf ? `${firstLeaf[0]}: ${String(firstLeaf[1]).slice(0, 50)}` : "";
}

interface RecordDrawerProps {
  index: number;
  record: Record<string, any>;
  defaultOpen: boolean;
  viewMode: "fields" | "json";
  search: string;
  accent: Accent;
  totalCount: number;
}

function RecordDrawer({
  index,
  record,
  defaultOpen,
  viewMode,
  search,
  accent,
  totalCount,
}: RecordDrawerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const summary = getRecordSummary(record);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="nm-card rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-colors cursor-pointer"
      >
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
        <div
          className={`flex-shrink-0 w-6 h-6 rounded-md ${accent.bgSoft} border ${accent.border} flex items-center justify-center`}
        >
          <span className={`text-[11px] font-bold ${accent.text}`}>
            {index + 1}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[12px] font-bold text-foreground">
            Record {index + 1}
            {totalCount > 1 && (
              <span className="text-muted-foreground font-normal ml-1">
                of {totalCount}
              </span>
            )}
          </div>
          {summary && !open && (
            <div className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
              {summary}
            </div>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          {viewMode === "fields" ? (
            <div className="p-4">
              <RecordTree
                record={record}
                recordKey={`rec${index}`}
                search={search}
                accent={accent}
              />
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={copyJson}
                className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-foreground/90 hover:bg-foreground text-[10px] font-bold text-background transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <pre className="bg-muted text-foreground p-4 text-[11.5px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-words max-h-[500px]">
                {JSON.stringify(record, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CommusoftTestStepProps {
  data: Record<string, any> | Record<string, any>[];
  testStatus?: "idle" | "testing" | "success" | "failed";
  isTrigger?: boolean;
  onTestTrigger?: () => void;
  onSkipTest?: () => void;
}

export function CommusoftTestStep({
  data,
  testStatus = "idle",
  isTrigger = false,
  onTestTrigger,
}: CommusoftTestStepProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"fields" | "json">("fields");

  const records = useMemo(
    () => (Array.isArray(data) ? data : data ? [data] : []),
    [data]
  );
  const hasRecords = records.length > 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex-shrink-0 p-6 space-y-4 border-b border-black/8 dark:border-white/5">
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-lg ${ACCENT.iconBg} flex items-center justify-center shadow-sm`}
          >
            <Link2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
            {isTrigger ? (
              <Zap className={`w-5 h-5 ${ACCENT.textSoft}`} />
            ) : (
              <Send className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="ml-2">
            <h4 className="text-sm font-bold text-foreground">
              {isTrigger ? "Test Commusoft Trigger" : "Send to Commusoft"}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isTrigger
                ? 'Click "Test trigger" to fetch sample record(s) from Commusoft.'
                : "Testing the integration will send the following data to Commusoft:"}
            </p>
          </div>
        </div>

        {testStatus === "idle" && onTestTrigger && (
          <button
            type="button"
            onClick={onTestTrigger}
            className={`w-full flex items-center justify-center gap-2 p-3 ${ACCENT.bg} hover:bg-primary/90 rounded-xl shadow-sm transition-colors cursor-pointer`}
          >
            <Send className="w-4 h-4 text-primary-foreground" />
            <span className="text-[13px] font-bold text-primary-foreground">
              {isTrigger ? "Test trigger" : "Test action"}
            </span>
          </button>
        )}

        {testStatus === "testing" && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl animate-pulse">
            <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <span className="text-[13px] font-bold text-primary">
              {isTrigger ? "Fetching from Commusoft..." : "Connecting to Commusoft..."}
            </span>
          </div>
        )}

        {testStatus === "success" && (
          <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-xl">
            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-success stroke-[3]" />
            </div>
            <span className="text-[13px] font-bold text-success">
              {isTrigger
                ? `Fetched ${records.length} sample record${
                    records.length === 1 ? "" : "s"
                  } successfully!`
                : records.length > 1
                ? `Success! ${records.length} records processed for Commusoft.`
                : "Success! Data sent to Commusoft."}
            </span>
          </div>
        )}

        {testStatus === "failed" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
                <Info className="w-3.5 h-3.5 text-destructive stroke-[3]" />
              </div>
              <span className="text-[13px] font-bold text-destructive">
                {isTrigger
                  ? "No records found. Make sure there is data in Commusoft for this event."
                  : "Failed. Please check your credentials and field mapping."}
              </span>
            </div>
            {onTestTrigger && (
              <button
                onClick={onTestTrigger}
                className={`w-full flex items-center justify-center gap-2 p-3 ${ACCENT.bgSoft} border ${ACCENT.border} rounded-xl hover:bg-primary/15 transition-colors cursor-pointer`}
              >
                <Send className={`w-4 h-4 ${ACCENT.textSoft}`} />
                <span className={`text-[13px] font-bold ${ACCENT.text}`}>
                  Try again
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-6 pb-3 border-b border-transparent space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3
              className={`text-sm font-bold text-foreground border-b-2 ${ACCENT.underline} pb-1 px-1`}
            >
              Data Preview
              {records.length > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">
                  ({records.length} record{records.length === 1 ? "" : "s"})
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1 nm-inset rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode("fields")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  viewMode === "fields"
                    ? "nm-btn rounded-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-3 h-3" />
                Fields
              </button>
              <button
                type="button"
                onClick={() => setViewMode("json")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  viewMode === "json"
                    ? "nm-btn rounded-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code2 className="w-3 h-3" />
                JSON
              </button>
            </div>
          </div>

          {hasRecords && viewMode === "fields" && (
            <div className="nm-inset rounded-xl flex items-center gap-2 px-3 h-10">
              <Search className="shrink-0 w-4 h-4 text-muted-foreground/60" />
              <input
                placeholder="Search field names..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none font-medium"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-3 space-y-3">
          {hasRecords ? (
            records.map((record, idx) => (
              <RecordDrawer
                key={idx}
                index={idx}
                record={record}
                defaultOpen={idx === 0}
                viewMode={viewMode}
                search={search}
                accent={ACCENT}
                totalCount={records.length}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full nm-inset flex items-center justify-center">
                <Inbox className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">
                {isTrigger && testStatus === "idle"
                  ? "Use the button above to fetch sample data."
                  : "No data to display"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
