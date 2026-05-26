import { Box, GitBranch, Home, LayoutGrid, LucideIcon, ShieldCheck } from "lucide-react";
import { DASHBOARD_ROUTES } from "@/src/constants/domain.constants";
import { INTEGRATION_NAV } from "@/src/constants/nav.constants";
import { type PagePermissions } from "@/src/types/permissions.types";

export interface NavSubItem {
  name: string;
  href: string;
}

export interface NavItemConfig {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  subItems?: readonly NavSubItem[];
  adminOnly?: boolean;
}

/**
 * Modular navigation configuration factory.
 * Each integration manages its own nav structure in its respective directory.
 */
export function getDashboardNavItems(integrationStatus: {
  isServiceM8Connected: boolean;
  isCommusoftConnected: boolean;
  isLeadsHubConnected: boolean;
  isSimProConnected: boolean;
  userRole: string | null;
  pagePermissions: PagePermissions;
}): NavItemConfig[] {
  const isAdmin = integrationStatus.userRole === "admin";
  const permissions = integrationStatus.pagePermissions;

  // Core application routes
  const items: NavItemConfig[] = [
    {
      id: "home",
      name: "Home",
      href: DASHBOARD_ROUTES.HOME,
      icon: Home
    },
    {
      id: "integrations",
      name: "Connections",
      href: DASHBOARD_ROUTES.INTEGRATIONS,
      icon: LayoutGrid,
    },
  ];

  const connectedIntegration = integrationStatus.isServiceM8Connected
    ? "servicem8"
    : integrationStatus.isCommusoftConnected
      ? "commusoft"
      : integrationStatus.isSimProConnected
        ? "simpro"
        : null;

  if (connectedIntegration === "servicem8" && permissions.servicem8) {
    items.push(INTEGRATION_NAV.SERVICEM8);
  } else if (connectedIntegration === "commusoft" && permissions.commusoft) {
    items.push(INTEGRATION_NAV.COMMUSOFT);
  } else if (connectedIntegration === "simpro" && permissions.simpro) {
    items.push(INTEGRATION_NAV.SIMPRO);
  }

  // Admin-only nav items
  if (isAdmin) {
    items.push({
      id: "admin",
      name: "Admin Panel",
      href: "/admin",
      icon: ShieldCheck,
      adminOnly: true,
    });
  }

  if (permissions.workflow) {
    items.push({
      id: "workflow",
      name: "Workflow",
      href: DASHBOARD_ROUTES.WORKFLOW,
      icon: GitBranch,
    });
  }

  if (permissions.assets) {
    items.push({
      id: "assets",
      name: "Assets",
      href: DASHBOARD_ROUTES.ASSETS,
      icon: Box,
    });
  }

  return items;
}
