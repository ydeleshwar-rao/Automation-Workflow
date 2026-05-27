/**
 * nav-items.ts
 * ─────────────────────────────────────────────────────────────
 * Navigation configuration factory — new JWT-permission model.
 *
 * Items are shown/hidden based on:
 *   - Role: admin-only items (Admin Panel)
 *   - JWT permissions[]: page keys embedded in the access token
 *     Admin gets ['*'] → sees everything
 *     Developer gets explicit keys: ['dashboard', 'workflow', ...]
 */

import {
  BarChart3,
  Box,
  GitBranch,
  Home,
  LucideIcon,
  ShieldCheck,
} from "lucide-react";
import { DASHBOARD_ROUTES } from "@/src/constants/domain.constants";

export interface NavSubItem {
  name: string;
  href: string;
}

export interface NavItemConfig {
  id:           string;
  name:         string;
  href:         string;
  icon:         LucideIcon;
  subItems?:    readonly NavSubItem[];
  adminOnly?:   boolean;
}

export interface NavBuildParams {
  userRole:       string | null;
  /** JWT permissions array — ['*'] for admin, page keys for developer */
  permissions:    string[];
}

/**
 * Build the sidebar nav items for the current user.
 * Uses JWT permissions[], so no extra API call is needed.
 */
export function getDashboardNavItems({
  userRole,
  permissions,
}: NavBuildParams): NavItemConfig[] {
  const isAdmin = userRole === "admin";
  /** Check if user has access to a page key (supports '*' wildcard). */
  const can = (key: string) =>
    permissions.includes("*") || permissions.includes(key);

  const items: NavItemConfig[] = [];

  // ── Dashboard (always visible to those with access) ───────────────────────
  if (can("dashboard")) {
    items.push({
      id:   "home",
      name: "Home",
      href: DASHBOARD_ROUTES.HOME,
      icon: Home,
    });
  }


  // ── Workflow ──────────────────────────────────────────────────────────────
  if (can("workflow")) {
    items.push({
      id:   "workflow",
      name: "Workflow",
      href: DASHBOARD_ROUTES.WORKFLOW,
      icon: GitBranch,
    });
  }

  // ── Assets ────────────────────────────────────────────────────────────────
  if (can("assets")) {
    items.push({
      id:   "assets",
      name: "Assets",
      href: DASHBOARD_ROUTES.ASSETS,
      icon: Box,
    });
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  if (can("analytics")) {
    items.push({
      id:   "analytics",
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
    });
  }

  // ── Admin Panel (role-based, not page-permission-based) ───────────────────
  if (isAdmin) {
    items.push({
      id:        "admin",
      name:      "Admin Panel",
      href:      "/admin",
      icon:      ShieldCheck,
      adminOnly: true,
    });
  }

  return items;
}
