"use client";

import React, { useState } from "react";
import { ChevronRight, Maximize2, Minimize2 } from "lucide-react";

export type SampleRecord = Record<string, unknown>;

type ExpandableValue = unknown[] | Record<string, unknown>;

function isExpandableValue(value: unknown): value is ExpandableValue {
  return typeof value === "object" && value !== null;
}

function prettyLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase())
    .trim();
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Child entries as [label, pathSegment, value] so arrays and objects render the same way. */
function childEntriesOf(value: ExpandableValue): Array<[string, string, unknown]> {
  if (Array.isArray(value)) {
    return value.map((item, index) => [`[${index}]`, String(index), item]);
  }
  return Object.entries(value).map(([childKey, childValue]) => [prettyLabel(childKey), childKey, childValue]);
}

function collectExpandablePaths(value: unknown, basePath: string, paths: Set<string>) {
  if (!isExpandableValue(value)) return;
  paths.add(basePath);
  for (const [, pathSegment, childValue] of childEntriesOf(value)) {
    collectExpandablePaths(childValue, `${basePath}.${pathSegment}`, paths);
  }
}

function LeafValue({ value }: { value: unknown }) {
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

interface TreeRowProps {
  label: string;
  value: unknown;
  path: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}

function TreeRow({ label, value, path, expandedPaths, onToggle }: TreeRowProps) {
  const isExpandable = isExpandableValue(value);
  const isArray = Array.isArray(value);
  const isOpen = expandedPaths.has(path);
  const childEntries = isExpandable ? childEntriesOf(value) : [];
  const childCount = childEntries.length;

  return (
    <div>
      <button
        type="button"
        onClick={() => isExpandable && onToggle(path)}
        disabled={!isExpandable}
        className={`w-full flex items-start gap-2 py-1.5 px-2 rounded-md text-left transition-colors ${
          isExpandable ? "hover:bg-muted cursor-pointer" : "cursor-default"
        }`}
      >
        <span className="flex-shrink-0 w-4 h-5 flex items-center justify-center mt-0.5">
          {isExpandable ? (
            <ChevronRight
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
          ) : (
            <span className="w-1 h-1 rounded-full bg-border" />
          )}
        </span>

        <div className="flex-shrink-0 min-w-[140px] max-w-[200px]">
          <span className="text-[12px] font-semibold text-foreground break-words">{label}</span>
          {isExpandable && (
            <span className="ml-1.5 text-[10px] font-mono font-bold text-primary">
              {isArray ? `[${childCount}]` : `{${childCount}}`}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 text-[12px] break-words whitespace-pre-wrap">
          {isExpandable ? (
            <span className="text-muted-foreground italic">
              {pluralize(childCount, isArray ? "item" : "field")}
            </span>
          ) : (
            <LeafValue value={value} />
          )}
        </div>
      </button>

      {isOpen && childCount > 0 && (
        <div className="ml-3 pl-3 border-l border-border">
          {childEntries.map(([childLabel, pathSegment, childValue]) => (
            <TreeRow
              key={pathSegment}
              label={childLabel}
              value={childValue}
              path={`${path}.${pathSegment}`}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const TOOLBAR_BUTTON_CLASS =
  "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer";

interface RecordTreeProps {
  record: SampleRecord;
  recordKey: string;
  search: string;
  isFieldVisible: (fieldKey: string) => boolean;
}

/** Collapsible field tree for one sample record, filtered by field-name search. */
export function RecordTree({ record, recordKey, search, isFieldVisible }: RecordTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const normalizedSearch = search.toLowerCase();

  const visibleEntries = Object.entries(record).filter(
    ([fieldKey]) => isFieldVisible(fieldKey) && fieldKey.toLowerCase().includes(normalizedSearch)
  );

  const togglePath = (path: string) => {
    setExpandedPaths((previousPaths) => {
      const nextPaths = new Set(previousPaths);
      if (nextPaths.has(path)) nextPaths.delete(path);
      else nextPaths.add(path);
      return nextPaths;
    });
  };

  const expandAll = () => {
    const allPaths = new Set<string>();
    visibleEntries.forEach(([fieldKey, value]) => collectExpandablePaths(value, `${recordKey}.${fieldKey}`, allPaths));
    setExpandedPaths(allPaths);
  };

  if (visibleEntries.length === 0) {
    return (
      <p className="text-center py-8 text-muted-foreground text-[13px] italic">
        {search ? "No matching fields found" : "No data to display"}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-1 mb-2 pb-2 border-b border-border">
        <button type="button" onClick={expandAll} className={TOOLBAR_BUTTON_CLASS}>
          <Maximize2 className="w-3 h-3" />
          Expand all
        </button>
        <button type="button" onClick={() => setExpandedPaths(new Set())} className={TOOLBAR_BUTTON_CLASS}>
          <Minimize2 className="w-3 h-3" />
          Collapse all
        </button>
      </div>
      <div className="space-y-0.5">
        {visibleEntries.map(([fieldKey, value]) => (
          <TreeRow
            key={fieldKey}
            label={prettyLabel(fieldKey)}
            value={value}
            path={`${recordKey}.${fieldKey}`}
            expandedPaths={expandedPaths}
            onToggle={togglePath}
          />
        ))}
      </div>
    </div>
  );
}
