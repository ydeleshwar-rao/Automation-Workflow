"use client";

import React, { useState } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { RecordTree, type SampleRecord } from "./RecordTree";

export type RecordViewMode = "fields" | "json";

/** Fields tried in order to label a collapsed record. */
const SUMMARY_FIELD_PRIORITY = ["name", "first_name", "full_name", "title", "subject", "uuid", "id", "email"];
const SUMMARY_MAX_LENGTH = 50;
const COPIED_FEEDBACK_MS = 1500;

function formatSummary(fieldKey: string, value: unknown): string {
  return `${fieldKey}: ${String(value).slice(0, SUMMARY_MAX_LENGTH)}`;
}

function getRecordSummary(record: SampleRecord): string {
  const priorityKey = SUMMARY_FIELD_PRIORITY.find((fieldKey) => record[fieldKey]);
  if (priorityKey) return formatSummary(priorityKey, record[priorityKey]);

  const firstLeaf = Object.entries(record).find(
    ([, value]) => value !== null && value !== undefined && typeof value !== "object"
  );
  return firstLeaf ? formatSummary(firstLeaf[0], firstLeaf[1]) : "";
}

function JsonView({ record }: { record: SampleRecord }) {
  const [isCopied, setIsCopied] = useState(false);
  const formattedJson = JSON.stringify(record, null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(formattedJson);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={copyJson}
        className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-foreground/90 hover:bg-foreground text-[10px] font-bold text-background transition-colors cursor-pointer"
      >
        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {isCopied ? "Copied!" : "Copy"}
      </button>
      <pre className="bg-muted text-foreground p-4 text-[11.5px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-words max-h-[500px]">
        {formattedJson}
      </pre>
    </div>
  );
}

interface RecordDrawerProps {
  index: number;
  record: SampleRecord;
  totalCount: number;
  isInitiallyOpen: boolean;
  viewMode: RecordViewMode;
  search: string;
  isFieldVisible: (fieldKey: string) => boolean;
}

/** One sample record: a collapsible header with a summary, and a fields or JSON body. */
export function RecordDrawer({
  index,
  record,
  totalCount,
  isInitiallyOpen,
  viewMode,
  search,
  isFieldVisible,
}: RecordDrawerProps) {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen);
  const summary = getRecordSummary(record);
  const recordNumber = index + 1;

  return (
    <div className="nm-card rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-colors cursor-pointer"
      >
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
          <span className="text-[11px] font-bold text-primary">{recordNumber}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[12px] font-bold text-foreground">
            Record {recordNumber}
            {totalCount > 1 && <span className="text-muted-foreground font-normal ml-1">of {totalCount}</span>}
          </div>
          {summary && !isOpen && (
            <div className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">{summary}</div>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border">
          {viewMode === "fields" ? (
            <div className="p-4">
              <RecordTree
                record={record}
                recordKey={`record${index}`}
                search={search}
                isFieldVisible={isFieldVisible}
              />
            </div>
          ) : (
            <JsonView record={record} />
          )}
        </div>
      )}
    </div>
  );
}
