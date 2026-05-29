/**
 * workflowStorage.ts
 * ─────────────────────────────────────────────────────────────
 * Centralised localStorage helpers for workflow builder state.
 *
 * Keys:
 *   wf_selected_workflow   — last active workflow ID
 *   wf_active_view         — last active view (builder | monitor)
 *   wf_webhook_<nodeId>    — webhook {id, full_url} per trigger node (written by webhook.engine)
 */

const KEYS = {
  selectedWorkflow: "wf_selected_workflow",
  activeView: "wf_active_view",
  webhookData: (nodeId: string) => `wf_webhook_${nodeId}`,
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota or SSR — ignore */ }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// ── Selected workflow ─────────────────────────────────────────────────────────

export function getStoredWorkflowId(): string | null {
  return read<string>(KEYS.selectedWorkflow);
}

export function setStoredWorkflowId(id: string | null): void {
  if (id) write(KEYS.selectedWorkflow, id);
  else remove(KEYS.selectedWorkflow);
}

// ── Active view ───────────────────────────────────────────────────────────────

export function getStoredActiveView(): "builder" | "monitor" | null {
  return read<"builder" | "monitor">(KEYS.activeView);
}

export function setStoredActiveView(view: "builder" | "monitor"): void {
  write(KEYS.activeView, view);
}

// ── Webhook data (written by webhook.engine, read by orchestrator) ─────────────

export interface StoredWebhookData {
  id: string;
  full_url: string;
}

export function getStoredWebhookData(nodeId: string): StoredWebhookData | null {
  return read<StoredWebhookData>(KEYS.webhookData(nodeId));
}

export function setStoredWebhookData(nodeId: string, data: StoredWebhookData): void {
  write(KEYS.webhookData(nodeId), data);
}
