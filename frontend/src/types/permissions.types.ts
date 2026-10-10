/**
 * Page permission types for the new JWT-based RBAC system.
 *
 * Page keys match what is stored in `page_permissions.page_key` in the DB
 * and embedded in the JWT `permissions[]` claim.
 *
 * Admin: permissions = ['*']  (wildcard — access to everything)
 * Developer: permissions = ['dashboard', 'workflow', ...]  (explicit list)
 */

export type PageKey =
  | "dashboard"
  | "workflow"
  | "assets"
  | "integrations"
  | "analytics";

export const ALL_PAGE_KEYS: PageKey[] = [
  "dashboard",
  "workflow",
  "assets",
  "integrations",
  "analytics",
];

export const PAGE_LABELS: Record<PageKey, string> = {
  dashboard:    "Dashboard",
  workflow:     "Workflow",
  assets:       "Assets",
  integrations: "Integrations",
  analytics:    "Analytics",
};

/** Detailed per-page permission flags (from DB / API, not JWT). */
export interface PagePermissionDetail {
  page_key:   PageKey;
  can_view:   boolean;
  can_edit:   boolean;
  can_delete: boolean;
}

/**
 * @deprecated Use string[] from JWT and hasPageAccess() instead.
 * Kept temporarily so sidebar can still compile while being refactored.
 */
export interface PagePermissions {
  dashboard:    boolean;
  workflow:     boolean;
  assets:       boolean;
  integrations: boolean;
  analytics:    boolean;
}

/** @deprecated */
export const DEFAULT_PERMISSIONS: PagePermissions = {
  dashboard:    true,
  workflow:     true,
  assets:       true,
  integrations: true,
  analytics:    true,
};
