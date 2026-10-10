export const APP_CATEGORIES = [
  "All",
  "CRM",
  "Lead Management",
  "Accounting",
  "Scheduling",
] as const;

export const INTEGRATION_SERVICES = {
  SERVICEM8: "servicem8",
  LEADSHUB: "leadshub",
  COMMUSOFT: "commusoft",
  SIMPRO: "simpro",
} as const;

export const DASHBOARD_ROUTES = {
  HOME: "/dashboard",
  INTEGRATIONS: "/dashboard/connections",
  SERVICEM8: "/dashboard/servicem8",
  LEADSHUB: "/dashboard/leadshub",
  COMMUSOFT: "/dashboard/commusoft",
  SIMPRO: "/dashboard/simpro",
  WORKFLOW: "/dashboard/workflow",
  AI_WORKFLOW: "/dashboard/ai-workflow",
  ASSETS: "/dashboard/assets",
  ADMIN: "/dashboard/admin",
} as const;

