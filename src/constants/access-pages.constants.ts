/**
 * Page keys for the Access Control → Permissions matrix.
 *
 * These match exactly what is stored in `page_permissions.page_key` in the DB
 * and embedded in the JWT `permissions[]` claim.
 *
 * Admin: gets ['*'] (wildcard) — bypass all checks.
 * Developer: gets the explicit keys the admin has granted.
 */

export interface AccessPage {
  key:   string;
  label: string;
}

export const ACCESS_PAGES: readonly AccessPage[] = [
  { key: "dashboard",    label: "Dashboard"    },
  { key: "workflow",     label: "Workflow"      },
  { key: "assets",       label: "Assets"        },
  { key: "integrations", label: "Integrations"  },
  { key: "analytics",    label: "Analytics"     },
] as const;
