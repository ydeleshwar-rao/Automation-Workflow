"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Type,
  AlignLeft,
  Minus,
  X,
  GripVertical,
  Code2,
  LayoutTemplate,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import {
  WebhookVariablePicker,
  VariableField,
} from "@/src/components/work-flow/components/WebhookVariablePicker";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockKind = "heading" | "paragraph" | "divider";
type BuilderMode = "visual" | "html";

export interface EmailBlock {
  id: string;
  kind: BlockKind;
  content: string; // raw string with {{map:id|label|example}} tokens mixed with plain text
}

// ─── Block metadata embed/extract ─────────────────────────────────────────────

const META_KEY = "__email_blocks__";

export function embedBlockMeta(html: string, blocks: EmailBlock[]): string {
  const json = JSON.stringify(blocks).replace(/-->/g, "--&gt;");
  return `<!-- ${META_KEY}:${json} -->\n${html}`;
}

export function extractBlockMeta(html: string): EmailBlock[] | null {
  if (!html) return null;
  const m = html.match(new RegExp(`<!-- ${META_KEY}:(.+?) -->`));
  if (!m) return null;
  try {
    return JSON.parse(m[1].replace(/--&gt;/g, "-->")) as EmailBlock[];
  } catch {
    return null;
  }
}

// ─── HTML generation ─────────────────────────────────────────────────────────

export function generateHtmlFromBlocks(blocks: EmailBlock[]): string {
  const rows = blocks
    .map((b) => {
      if (b.kind === "divider") {
        return `<tr><td style="padding:4px 40px"><hr style="border:none;border-top:1px solid #e5e7eb"/></td></tr>`;
      }
      const inner = b.content.replace(/\n/g, "<br/>");
      return b.kind === "heading"
        ? `<tr><td style="padding:20px 40px 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.3">${inner}</td></tr>`
        : `<tr><td style="padding:6px 40px;font-size:15px;color:#374151;line-height:1.7">${inner}</td></tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 40px">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">Job Management</p>
        </td></tr>
${rows}
        <tr><td style="padding:24px 40px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center">
          Sent via Job Management
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Preview resolution ───────────────────────────────────────────────────────

function resolvePreviewHtml(
  html: string,
  flat: Record<string, unknown>
): string {
  // Resolve {{map:id|label|fallback}} tokens
  let out = html.replace(
    /\{\{map:([^|]*)\|([^|]*)\|([^}]*)\}\}/g,
    (_, id, label, fallback) => {
      const val = flat[label] ?? flat[id] ?? fallback ?? label;
      return `<mark style="background:#ddd9fe;color:#4f46e5;border-radius:3px;padding:0 3px;font-style:normal">${val}</mark>`;
    }
  );
  // Highlight remaining plain tokens
  out = out.replace(
    /\{\{(?!map:)([^}]+)\}\}/g,
    (_, key) => {
      const display = key.replace(/^[^_]+__/, "");
      return `<mark style="background:#fee2e2;color:#b91c1c;border-radius:3px;padding:0 3px;font-style:normal">${display}</mark>`;
    }
  );
  return out;
}

// ─── ContentEditable helpers ──────────────────────────────────────────────────

function makeChipElement(id: string, label: string, example: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.dataset.varId = id;
  span.dataset.varLabel = label;
  span.dataset.varExample = example;
  span.setAttribute(
    "style",
    [
      "display:inline-flex;align-items:center;gap:4px;",
      "margin:0 2px;padding:2px 8px 2px 5px;",
      "border-radius:999px;font-size:12px;font-weight:500;",
      "background:#ede9fe;color:#5b21b6;",
      "cursor:default;user-select:none;white-space:nowrap;",
      "border:1px solid #c4b5fd",
    ].join("")
  );
  const dot = document.createElement("span");
  dot.setAttribute(
    "style",
    "display:inline-block;width:6px;height:6px;border-radius:50%;background:#7c3aed;flex-shrink:0"
  );
  span.appendChild(dot);
  span.appendChild(document.createTextNode(label));
  return span;
}

function buildEditorDom(el: HTMLDivElement, content: string) {
  el.innerHTML = "";
  const re = /\{\{map:([^|]*)\|([^|]*)\|([^}]*)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      el.appendChild(document.createTextNode(content.slice(last, m.index)));
    }
    el.appendChild(makeChipElement(m[1], m[2], m[3]));
    last = re.lastIndex;
  }
  if (last < content.length) {
    el.appendChild(document.createTextNode(content.slice(last)));
  }
  if (!el.lastChild || el.lastChild.nodeType !== Node.TEXT_NODE) {
    el.appendChild(document.createTextNode("​"));
  }
}

function readEditorDom(el: HTMLDivElement): string {
  let out = "";
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent ?? "").replace(/​/g, "");
    } else if (node instanceof HTMLElement) {
      if (node.dataset.varId) {
        out += `{{map:${node.dataset.varId}|${node.dataset.varLabel}|${node.dataset.varExample}}}`;
      } else if (node.tagName === "BR") {
        out += "\n";
      }
    }
  });
  return out;
}

// ─── BlockEditor ──────────────────────────────────────────────────────────────

interface BlockEditorProps {
  block: EmailBlock;
  onChange: (content: string) => void;
  onDelete: () => void;
  webhookId?: string;
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
}

function BlockEditor({
  block,
  onChange,
  onDelete,
  webhookId,
  triggerTestPayload,
  triggerTestSamples,
}: BlockEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const savedRange = useRef<Range | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, right: 0 });
  const [isEmpty, setIsEmpty] = useState(!block.content.trim());

  useEffect(() => {
    if (initialized.current) return;
    const el = editorRef.current;
    if (!el) return;
    initialized.current = true;
    buildEditorDom(el, block.content);
    setIsEmpty(!block.content.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const content = readEditorDom(el);
    setIsEmpty(!content.trim());
    onChange(content);
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && block.kind === "heading") e.preventDefault();
    },
    [block.kind]
  );

  const openPicker = useCallback((e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    } else {
      const el = editorRef.current;
      if (el) {
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        savedRange.current = r;
      }
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerPos({ top: rect.top, right: window.innerWidth - rect.left + 8 });
    setPickerOpen(true);
  }, []);

  const insertVariable = useCallback(
    (field: VariableField) => {
      const el = editorRef.current;
      if (!el) return;

      const chip = makeChipElement(field.id, field.label, field.description ?? "");
      const spacer = document.createTextNode("​");

      const sel = window.getSelection();
      if (savedRange.current) {
        sel?.removeAllRanges();
        sel?.addRange(savedRange.current);
      }

      if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(spacer);
        range.insertNode(chip);
        const newRange = document.createRange();
        newRange.setStartAfter(spacer);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } else {
        el.appendChild(chip);
        el.appendChild(spacer);
      }

      el.focus();
      const content = readEditorDom(el);
      setIsEmpty(!content.trim());
      onChange(content);
      setPickerOpen(false);
    },
    [onChange]
  );

  if (block.kind === "divider") {
    return (
      <div className="flex items-center gap-3 py-1.5">
        <hr className="flex-1 border-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          divider
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 focus-within:border-primary/40">
      <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40" />

      <div className="relative flex-1 min-w-0">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {block.kind}
        </span>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full min-h-[1.75rem] rounded px-1.5 py-1 outline-none",
            "text-foreground leading-relaxed",
            "focus:ring-1 focus:ring-primary/30 focus:bg-primary/5",
            block.kind === "heading" && "text-base font-semibold",
            block.kind === "paragraph" && "text-sm"
          )}
        />
        {isEmpty && (
          <p
            className={cn(
              "pointer-events-none absolute left-1.5 top-[1.5rem] text-muted-foreground/40 select-none",
              block.kind === "heading" && "text-base font-semibold",
              block.kind === "paragraph" && "text-sm"
            )}
          >
            {block.kind === "heading" ? "Email heading…" : "Type your paragraph here…"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1 pt-6">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            openPicker(e);
          }}
          title="Insert dynamic variable"
          className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Remove block"
          className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <WebhookVariablePicker
        isOpen={pickerOpen}
        fieldLabel="variable"
        position={pickerPos}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
        onSelect={insertVariable}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

// ─── HTML Code mode: Token detection ─────────────────────────────────────────

interface DetectedToken {
  raw: string;        // full token string e.g. "{{315896032__firstName}}"
  displayKey: string; // human-readable key e.g. "firstName"
  isMapped: boolean;
  mapLabel?: string;
}

function detectTokens(html: string): DetectedToken[] {
  const seen = new Map<string, DetectedToken>();

  // Already-mapped tokens: {{map:id|label|fallback}}
  const mapRe = /\{\{map:([^|]*)\|([^|]*)\|([^}]*)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = mapRe.exec(html)) !== null) {
    if (!seen.has(m[0])) {
      seen.set(m[0], {
        raw: m[0],
        displayKey: m[2] || m[1] || "variable",
        isMapped: true,
        mapLabel: m[2] || m[1],
      });
    }
  }

  // Plain tokens: {{key}} — skip map: ones already captured
  const plainRe = /\{\{(?!map:)([^}]+)\}\}/g;
  while ((m = plainRe.exec(html)) !== null) {
    if (!seen.has(m[0])) {
      // Strip node-id prefix like "315896032__"
      const displayKey = m[1].replace(/^[^_]+__/, "").replace(/_/g, " ");
      seen.set(m[0], { raw: m[0], displayKey, isMapped: false });
    }
  }

  return Array.from(seen.values());
}

// ─── TokenRow ─────────────────────────────────────────────────────────────────

interface TokenRowProps {
  token: DetectedToken;
  onMap: (token: DetectedToken, field: VariableField) => void;
  webhookId?: string;
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
}

function TokenRow({
  token,
  onMap,
  webhookId,
  triggerTestPayload,
  triggerTestSamples,
}: TokenRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const openPicker = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPickerPos({ top: rect.top, right: window.innerWidth - rect.left + 8 });
    }
    setPickerOpen(true);
  };

  return (
    <div className="flex items-start gap-2 border-b border-border/40 py-2.5 last:border-0">
      <div className="flex-1 min-w-0">
        <p
          className="truncate font-mono text-[11px] text-foreground leading-snug"
          title={token.raw}
        >
          {token.raw}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground capitalize">
          {token.displayKey}
        </p>
      </div>

      {token.isMapped ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          {token.mapLabel}
        </span>
      ) : (
        <>
          <button
            ref={btnRef}
            type="button"
            onClick={openPicker}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/50 px-2 py-1 text-[11px] text-primary transition-colors hover:bg-primary/5"
          >
            <Plus className="h-3 w-3" />
            Map
          </button>
          <WebhookVariablePicker
            isOpen={pickerOpen}
            fieldLabel={token.displayKey}
            position={pickerPos}
            webhookId={webhookId}
            triggerTestPayload={triggerTestPayload}
            triggerTestSamples={triggerTestSamples}
            onSelect={(field) => {
              onMap(token, field);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </>
      )}
    </div>
  );
}

// ─── HtmlCodePane ─────────────────────────────────────────────────────────────

interface HtmlCodePaneProps {
  rawHtml: string;
  onChange: (html: string) => void;
  cleanedFlat: Record<string, unknown>;
  webhookId?: string;
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
}

function HtmlCodePane({
  rawHtml,
  onChange,
  cleanedFlat,
  webhookId,
  triggerTestPayload,
  triggerTestSamples,
}: HtmlCodePaneProps) {
  const tokens = useMemo(() => detectTokens(rawHtml), [rawHtml]);
  const mappedCount = tokens.filter((t) => t.isMapped).length;

  const handleMap = useCallback(
    (token: DetectedToken, field: VariableField) => {
      const newToken = `{{map:${field.id}|${field.label}|${field.description ?? ""}}}`;
      onChange(rawHtml.split(token.raw).join(newToken));
    },
    [rawHtml, onChange]
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden divide-x divide-border">
      {/* Left: raw HTML textarea */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          HTML Source
        </p>
        <textarea
          value={rawHtml}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 resize-none rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          spellCheck={false}
          placeholder={"Paste your HTML template here…\n\nVariables like {{fieldName}} or {{nodeId__fieldName}} will appear in the Token Mapper on the right."}
        />
      </div>

      {/* Right: token mapper */}
      <div className="flex w-72 shrink-0 flex-col gap-1 p-4">
        <div className="flex shrink-0 items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Variable Tokens
          </p>
          {tokens.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {mappedCount}/{tokens.length} mapped
            </span>
          )}
        </div>

        {tokens.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-xs text-muted-foreground">
              No <code className="rounded bg-muted px-1 font-mono text-[11px]">{"{{tokens}}"}</code> detected yet.
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              Paste HTML with variable placeholders.
            </p>
          </div>
        ) : (
          <div className="mt-1 flex-1 overflow-y-auto">
            {tokens.map((token) => (
              <TokenRow
                key={token.raw}
                token={token}
                onMap={handleMap}
                webhookId={webhookId}
                triggerTestPayload={triggerTestPayload}
                triggerTestSamples={triggerTestSamples}
              />
            ))}
          </div>
        )}

        <p className="mt-auto shrink-0 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
          Unmapped tokens send as-is. Map them to replace with real workflow data when the email sends.
        </p>
      </div>
    </div>
  );
}

// ─── HtmlTemplateBuilder (main export) ────────────────────────────────────────

export interface HtmlTemplateBuilderProps {
  initialHtml?: string;
  webhookId?: string;
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
  cleanedFlat?: Record<string, unknown>;
  onSave: (html: string) => void;
  onClose: () => void;
}

export function HtmlTemplateBuilder({
  initialHtml,
  webhookId,
  triggerTestPayload,
  triggerTestSamples,
  cleanedFlat = {},
  onSave,
  onClose,
}: HtmlTemplateBuilderProps) {
  // Detect initial mode: if the stored HTML has block meta it came from the visual builder;
  // if it's non-empty and has no block meta it was pasted raw HTML.
  const hasBlockMeta = !!extractBlockMeta(initialHtml ?? "");
  const [mode, setMode] = useState<BuilderMode>(
    !initialHtml || hasBlockMeta ? "visual" : "html"
  );

  // ── Visual mode state ────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => {
    const saved = extractBlockMeta(initialHtml ?? "");
    if (saved?.length) return saved;
    return [
      { id: crypto.randomUUID(), kind: "heading", content: "" },
      { id: crypto.randomUUID(), kind: "paragraph", content: "" },
    ];
  });

  // ── HTML mode state ──────────────────────────────────────────────────────
  // Strip block meta comment when pre-filling the textarea
  const [rawHtml, setRawHtml] = useState<string>(() => {
    if (!initialHtml) return "";
    // Remove the block-meta comment so it doesn't clutter the textarea
    return initialHtml.replace(/<!-- __email_blocks__:.+? -->\n?/, "");
  });

  const [showPreview, setShowPreview] = useState(false);

  const generatedHtml = useMemo(() => generateHtmlFromBlocks(blocks), [blocks]);

  const previewSource = useMemo(
    () =>
      resolvePreviewHtml(
        mode === "visual" ? generatedHtml : rawHtml,
        cleanedFlat
      ),
    [mode, generatedHtml, rawHtml, cleanedFlat]
  );

  // ── Mode switching ────────────────────────────────────────────────────────
  const switchMode = (next: BuilderMode) => {
    if (next === mode) return;
    if (next === "html") {
      // Sync visual blocks → raw HTML textarea
      const html = generatedHtml.replace(/<!-- __email_blocks__:.+? -->\n?/, "");
      setRawHtml(html);
    } else {
      // Sync raw HTML → try to restore block meta
      const saved = extractBlockMeta(rawHtml);
      if (saved?.length) {
        setBlocks(saved);
      }
      // If no block meta, keep existing blocks as-is
    }
    setMode(next);
  };

  // ── Block operations ──────────────────────────────────────────────────────
  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addBlock = (kind: BlockKind) => {
    setBlocks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), kind, content: "" },
    ]);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (mode === "visual") {
      onSave(embedBlockMeta(generatedHtml, blocks));
    } else {
      // Raw HTML mode — save as-is (tokens are already in {{map:...}} or plain form)
      onSave(rawHtml);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-3">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Email Template Builder
              </h2>
            </div>

            {/* Mode tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => switchMode("visual")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === "visual"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                Visual Builder
              </button>
              <button
                type="button"
                onClick={() => switchMode("html")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === "html"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Code2 className="h-3.5 w-3.5" />
                HTML Code
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview((p) => !p)}
            >
              {showPreview ? (
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Eye className="mr-1.5 h-3.5 w-3.5" />
              )}
              {showPreview ? "Hide Preview" : "Live Preview"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex min-h-0 flex-1 overflow-hidden",
            showPreview && "divide-x divide-border"
          )}
        >
          {/* Editor column */}
          {mode === "visual" ? (
            <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Email blocks — click{" "}
                <span className="rounded bg-muted px-1 font-mono text-[10px]">+</span>{" "}
                on each block to insert a dynamic variable
              </p>

              {blocks.length === 0 && (
                <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                  No blocks yet. Use the buttons below to start building.
                </div>
              )}

              {blocks.map((block) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  onChange={(c) => updateBlock(block.id, c)}
                  onDelete={() => deleteBlock(block.id)}
                  webhookId={webhookId}
                  triggerTestPayload={triggerTestPayload}
                  triggerTestSamples={triggerTestSamples}
                />
              ))}

              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <span className="text-[11px] text-muted-foreground">Add:</span>
                {(
                  [
                    { kind: "heading" as BlockKind, icon: <Type className="h-3.5 w-3.5" />, label: "Heading" },
                    { kind: "paragraph" as BlockKind, icon: <AlignLeft className="h-3.5 w-3.5" />, label: "Paragraph" },
                    { kind: "divider" as BlockKind, icon: <Minus className="h-3.5 w-3.5" />, label: "Divider" },
                  ] as const
                ).map(({ kind, icon, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addBlock(kind)}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <HtmlCodePane
              rawHtml={rawHtml}
              onChange={setRawHtml}
              cleanedFlat={cleanedFlat}
              webhookId={webhookId}
              triggerTestPayload={triggerTestPayload}
              triggerTestSamples={triggerTestSamples}
            />
          )}

          {/* Live preview column */}
          {showPreview && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <p className="shrink-0 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Preview with sample data
              </p>
              <div className="flex-1 overflow-auto bg-[#f3f4f6] p-4">
                <iframe
                  srcDoc={previewSource}
                  className="h-full min-h-[400px] w-full rounded-xl border-0 bg-white shadow-sm"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="flex shrink-0 items-center justify-between border-t border-border bg-muted/30 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {mode === "visual" ? (
              <>
                Variables shown as{" "}
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                  field name
                </span>{" "}
                chips will be replaced with real data when the workflow runs.
              </>
            ) : (
              <>
                Paste any HTML with{" "}
                <code className="rounded bg-muted px-1 font-mono text-[10px]">{"{{token}}"}</code>{" "}
                placeholders, then use the Token Mapper to bind them to workflow variables.
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save Template
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
