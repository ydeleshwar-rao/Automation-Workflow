/**
 * Pages that appear in the Access Control → Permissions matrix.
 * Add a new entry here to expose another page for per-user can_read / can_write.
 *
 * The `key` is what gets persisted to the backend (`access_page_permissions.page`).
 */

export interface AccessPage {
  key: string
  label: string
}

export const ACCESS_PAGES: readonly AccessPage[] = [
  { key: "servicem8", label: "ServiceM8" },
  { key: "commusoft", label: "Commusoft" },
  { key: "simpro", label: "SimPro" },
  { key: "workflow", label: "Workflow" },
  { key: "assets", label: "Assets" },
] as const
