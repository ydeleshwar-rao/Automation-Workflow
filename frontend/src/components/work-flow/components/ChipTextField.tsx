"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { WorkflowSection } from "./SectionWrapper";

// ---------------------------------------------------------------------------
// Token parsing utilities
// Handles {{map:key|label|sample}} tokens embedded in field values
// ---------------------------------------------------------------------------

type ParsedMappedToken = {
  raw: string;
  key: string;
  label: string;
  sample: string;
  display: string;
};

type Segment =
  | { kind: "text"; text: string }
  | { kind: "token"; parsed: ParsedMappedToken };

function parseMappedToken(tokenContent: string): ParsedMappedToken {
  if (tokenContent.startsWith("map:")) {
    const serialized = tokenContent.slice(4);
    const [key = "", label = "", sample = ""] = serialized.split("|");
    const normalizedLabel = label.trim() || key.trim() || "Mapped field";
    const normalizedSample = sample.trim();
    const normalizedKey = key.trim();
    const display = normalizedSample ? `${normalizedLabel}: ${normalizedSample}` : normalizedLabel;
    return { raw: `{{${tokenContent}}}`, key: normalizedKey, label: normalizedLabel, sample: normalizedSample, display };
  }

  const fallback = tokenContent.trim();
  return { raw: `{{${tokenContent}}}`, key: fallback, label: fallback, sample: "", display: fallback };
}

// Parse a raw value into ordered segments so the UI can render chips + static
// text in the exact order the user inserted them (instead of floating all
// chips to the front).
function parseSegments(value: string): Segment[] {
  const tokenRegex = /\{\{([^{}]+)\}\}/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", text: value.slice(lastIndex, match.index) });
    }
    segments.push({ kind: "token", parsed: parseMappedToken(match[1].trim()) });
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < value.length) {
    segments.push({ kind: "text", text: value.slice(lastIndex) });
  }
  return segments;
}

function serializeSegments(segments: Segment[]): string {
  return segments.map((s) => (s.kind === "text" ? s.text : s.parsed.raw)).join("");
}

// ---------------------------------------------------------------------------
// ConfigField
// Single-line text input that supports inline mapped token chips.
// Press "/" or click "+" to open the field-mapping popup.
// ---------------------------------------------------------------------------

interface ConfigFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onPlusClick: (e: React.MouseEvent) => void;
  onChange: (val: string) => void;
  info?: string;
  error?: string;
}

// Normalize a parsed segment list so it always alternates text / token / text,
// starting AND ending with a (possibly empty) text segment. This lets the UI
// render an editable input on every side of every chip so the user can type
// anywhere — before, between, or after chips.
function normalizeSegments(segments: Segment[]): Segment[] {
  const result: Segment[] = [{ kind: "text", text: "" }];
  for (const seg of segments) {
    const last = result[result.length - 1];
    if (seg.kind === "text") {
      if (last.kind === "text") {
        result[result.length - 1] = { kind: "text", text: last.text + seg.text };
      } else {
        result.push({ kind: "text", text: seg.text });
      }
    } else {
      if (last.kind !== "text") result.push({ kind: "text", text: "" });
      result.push(seg);
    }
  }
  if (result[result.length - 1].kind !== "text") {
    result.push({ kind: "text", text: "" });
  }
  return result;
}

export function ConfigField({
  label,
  value,
  placeholder,
  required,
  onPlusClick,
  onChange,
  error,
}: ConfigFieldProps) {
  const segments = React.useMemo(
    () => normalizeSegments(parseSegments(value)),
    [value]
  );

  const commit = (next: Segment[]) => {
    onChange(serializeSegments(next));
  };

  const updateTextAt = (idx: number, nextText: string) => {
    const next = segments.map((s, i) =>
      i === idx && s.kind === "text" ? { kind: "text" as const, text: nextText } : s
    );
    commit(next);
  };

  // Remove a token segment at `idx` and merge the adjacent text segments
  // (`idx-1` and `idx+1`) so typing continues seamlessly across the gap.
  const removeTokenAt = (idx: number) => {
    const before = segments[idx - 1];
    const after = segments[idx + 1];
    const merged: Segment = {
      kind: "text",
      text:
        (before?.kind === "text" ? before.text : "") +
        (after?.kind === "text" ? after.text : ""),
    };
    const next = [
      ...segments.slice(0, idx - 1),
      merged,
      ...segments.slice(idx + 2),
    ];
    commit(next);
  };

  const isEmpty = segments.every(
    (s) => s.kind === "text" && s.text === ""
  );

  return (
    <WorkflowSection label={label} required={required}>
      <div className="relative group">
        <div
          className={cn(
            "min-h-11 w-full flex flex-wrap items-center gap-y-1 pr-[130px] pl-3 py-2 nm-inset rounded-xl focus-within:outline focus-within:outline-1 focus-within:outline-primary/40 transition-all",
            error && "outline outline-1 outline-destructive"
          )}
        >
          {segments.map((seg, index) =>
            seg.kind === "token" ? (
              <span
                key={`tok-${index}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {seg.parsed.display}
                <button
                  type="button"
                  onClick={() => removeTokenAt(index)}
                  className="rounded-sm text-primary hover:text-primary/70"
                  aria-label={`Remove ${seg.parsed.display}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <input
                key={`txt-${index}`}
                type="text"
                value={seg.text}
                onChange={(e) => updateTextAt(index, e.target.value)}
                placeholder={isEmpty && index === 0 ? placeholder || "Enter text or insert data..." : ""}
                // Middle inputs (between two chips) hug their content so the
                // field looks tight; the trailing input flex-grows so there's
                // always a clickable caret region after the last chip.
                style={
                  index === segments.length - 1
                    ? undefined
                    : { width: `${Math.max(1, seg.text.length) + 0.5}ch` }
                }
                className={cn(
                  "h-6 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground placeholder:font-normal border-0 outline-none focus:ring-0",
                  index === segments.length - 1
                    ? "flex-1 min-w-[60px]"
                    : "shrink-0"
                )}
                onKeyDown={(e) => {
                  if (e.key === "/") {
                    e.preventDefault();
                    onPlusClick(e as any);
                    return;
                  }
                  const input = e.currentTarget;
                  const atStart =
                    input.selectionStart === 0 && input.selectionEnd === 0;
                  // Backspace at start of a text input → delete the chip to
                  // its left (if any) and merge text segments.
                  if (e.key === "Backspace" && atStart && index > 0) {
                    const prevTokenIdx = index - 1;
                    if (segments[prevTokenIdx]?.kind === "token") {
                      e.preventDefault();
                      removeTokenAt(prevTokenIdx);
                    }
                  }
                }}
              />
            )
          )}
        </div>
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] text-muted-foreground font-medium pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
          <span className="bg-background border border-border px-1 rounded shadow-sm text-foreground">/</span>

        </div>
        <button
          onClick={onPlusClick}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center nm-btn rounded-xl text-muted-foreground hover:text-primary transition-all"
          type="button"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1 duration-200">{error}</p>
      )}
    </WorkflowSection>
  );
}

// ---------------------------------------------------------------------------
// ConfigTextArea
// Multi-line chip field — same token chip rendering as ConfigField but with a
// taller container so it feels like a textarea.
// ---------------------------------------------------------------------------

interface ConfigTextAreaProps extends Omit<ConfigFieldProps, "onChange"> {
  onChange: (val: string) => void;
  rows?: number; // kept for API compatibility, no longer used for rendering
}

export function ConfigTextArea({
  label,
  value,
  placeholder,
  required,
  onPlusClick,
  onChange,
  error,
}: ConfigTextAreaProps) {
  const segments = React.useMemo(
    () => normalizeSegments(parseSegments(value)),
    [value]
  );

  const commit = (next: Segment[]) => onChange(serializeSegments(next));

  const updateTextAt = (idx: number, nextText: string) => {
    const next = segments.map((s, i) =>
      i === idx && s.kind === "text" ? { kind: "text" as const, text: nextText } : s
    );
    commit(next);
  };

  const removeTokenAt = (idx: number) => {
    const before = segments[idx - 1];
    const after = segments[idx + 1];
    const merged: Segment = {
      kind: "text",
      text:
        (before?.kind === "text" ? before.text : "") +
        (after?.kind === "text" ? after.text : ""),
    };
    commit([...segments.slice(0, idx - 1), merged, ...segments.slice(idx + 2)]);
  };

  const isEmpty = segments.every((s) => s.kind === "text" && s.text === "");

  return (
    <WorkflowSection label={label} required={required}>
      <div className="relative group">
        <div
          className={cn(
            "min-h-[100px] w-full flex flex-wrap items-start content-start gap-y-1 pr-12 pl-3 py-2 nm-inset rounded-xl focus-within:outline focus-within:outline-1 focus-within:outline-primary/40 transition-all",
            error && "outline outline-1 outline-destructive"
          )}
        >
          {segments.map((seg, index) =>
            seg.kind === "token" ? (
              <span
                key={`tok-${index}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mt-0.5"
              >
                {seg.parsed.display}
                <button
                  type="button"
                  onClick={() => removeTokenAt(index)}
                  className="rounded-sm text-primary hover:text-primary/70"
                  aria-label={`Remove ${seg.parsed.display}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <input
                key={`txt-${index}`}
                type="text"
                value={seg.text}
                onChange={(e) => updateTextAt(index, e.target.value)}
                placeholder={isEmpty && index === 0 ? placeholder || "Enter text or insert data..." : ""}
                style={
                  index === segments.length - 1
                    ? undefined
                    : { width: `${Math.max(1, seg.text.length) + 0.5}ch` }
                }
                className={cn(
                  "h-6 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground placeholder:font-normal border-0 outline-none focus:ring-0",
                  index === segments.length - 1
                    ? "flex-1 min-w-[60px]"
                    : "shrink-0"
                )}
                onKeyDown={(e) => {
                  if (e.key === "/") {
                    e.preventDefault();
                    onPlusClick(e as any);
                    return;
                  }
                  const input = e.currentTarget;
                  const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
                  if (e.key === "Backspace" && atStart && index > 0) {
                    const prevTokenIdx = index - 1;
                    if (segments[prevTokenIdx]?.kind === "token") {
                      e.preventDefault();
                      removeTokenAt(prevTokenIdx);
                    }
                  }
                }}
              />
            )
          )}
        </div>
        <div className="absolute right-10 top-3 flex items-center gap-1 px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] text-muted-foreground font-medium pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
          <span className="bg-background border border-border px-1 rounded shadow-sm text-foreground">/</span>
        </div>
        <button
          onClick={onPlusClick}
          className="absolute right-2 top-3 w-7 h-7 flex items-center justify-center nm-btn rounded-xl text-muted-foreground hover:text-primary transition-all"
          type="button"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1 duration-200">{error}</p>
      )}
    </WorkflowSection>
  );
}
