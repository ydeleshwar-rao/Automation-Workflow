/**
 * API route constants — all calls go to the backend Express server.
 * No direct Supabase calls from frontend.
 */

const B = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const API_ROUTES = {
  // ── Auth ───────────────────────────────────────────────────────────────────
  AUTH: {
    LOGIN:         `${B}/auth/login`,
    GOOGLE:        `${B}/auth/google`,
    REGISTER:      `${B}/auth/register`,
    REFRESH:       `${B}/auth/refresh`,
    LOGOUT:        `${B}/auth/logout`,
    PROFILE:       `${B}/auth/profile`,
    SETUP:         `${B}/auth/setup`,
    SETUP_STATUS:  `${B}/auth/setup/status`,
  },

  // ── Access / Developer Management ─────────────────────────────────────────
  ACCESS: {
    ME:               `${B}/access/me`,
    DEVELOPERS:       `${B}/access/developers`,
    DEVELOPER:        (id: string) => `${B}/access/developers/${id}`,
    DEVELOPER_STATUS: (id: string) => `${B}/access/developers/${id}/status`,
    PERMISSIONS:      (id: string) => `${B}/access/developers/${id}/permissions`,
    PERMISSION:       (id: string, pageKey: string) => `${B}/access/developers/${id}/permissions/${pageKey}`,
    ADMINS:           `${B}/access/admins`,
    ADMIN:            (id: string) => `${B}/access/admins/${id}`,
  },

  // ── ServiceM8 ─────────────────────────────────────────────────────────────
  SERVICEM8: {
    CONNECT:    "/servicem8/connect",
    DISCONNECT: "/servicem8/disconnect",
    STATUS:     "/servicem8/status",
    GET_ALL_JOBS: "/servicem8/getalljobs",
    JOBS:         "/servicem8/listjobs",
    SYNC:         "/servicem8/sync",
    QUEUES:       "/servicem8/listqueues",
    CATEGORIES:   "/servicem8/listcategories",
    // Workflow action event types (for workflow builder)
    ACTION_EVENT_TYPES:    "/automation/action-event-types/servicem8",
    ACTION_EVENT_TRIGGERS: "/automation/action-event-types/servicem8/triggers",
    ACTION_EVENT_ACTIONS:  "/automation/action-event-types/servicem8/actions",
  },

  // ── Commusoft ─────────────────────────────────────────────────────────────
  COMMUSOFT: {
    CONNECT:         "/commusoft/connect",
    DISCONNECT:      "/commusoft/disconnect",
    STATUS:          "/commusoft/status",
    GET_ALL_JOBS:    "/commusoft/getalljobs",
    SYNC:            "/commusoft/sync",
    CUSTOMER_TYPES:  "/commusoft/customertypes",
    CREATE_CUSTOMER: "/commusoft/customers/create",
    ACTION_EVENT_TYPES:    "/automation/action-event-types/commusoft",
    ACTION_EVENT_TRIGGERS: "/automation/action-event-types/commusoft/triggers",
    ACTION_EVENT_ACTIONS:  "/automation/action-event-types/commusoft/actions",
  },

  // ── simPRO ────────────────────────────────────────────────────────────────
  SIMPRO: {
    CONNECT:      "/api/integration/simpro/connect",
    DISCONNECT:   "/api/integration/simpro/disconnect",
    STATUS:       "/simpro/status",
    GET_ALL_JOBS: "/simpro/getalljobs",
    JOBS:         "/simpro/jobs",
    SYNC:         "/simpro/sync",
    ACTION_EVENT_TYPES:    "/automation/action-event-types/simpro",
    ACTION_EVENT_TRIGGERS: "/automation/action-event-types/simpro/triggers",
    ACTION_EVENT_ACTIONS:  "/automation/action-event-types/simpro/actions",
  },

  // ── LeadsHub (GoHighLevel) ────────────────────────────────────────────────
  GHL: {
    CONNECT:    "/leadshub/auth/connect",
    DISCONNECT: "/leadshub/auth/disconnect",
    STATUS:     "/leadshub/auth/status",
    SYNC:       "/leadshub/contacts/sync",
    TEST_ADD_UPDATE_OPPORTUNITY: "/leadshub/opportunities/test/add-update",
    ACTION_EVENT_TYPES:    "/automation/action-event-types/leadshub",
    ACTION_EVENT_TRIGGERS: "/automation/action-event-types/leadshub/triggers",
    ACTION_EVENT_ACTIONS:  "/automation/action-event-types/leadshub/actions",
  },

  // ── SMTP / Mail ───────────────────────────────────────────────────────────
  MAIL: {
    CONNECTIONS:       `${B}/mail/connections`,
    CONNECTION:        (id: string) => `${B}/mail/connections/${id}`,
    // Aliases for backward compat with older hooks
    GET_CONNECTIONS:   () => `${B}/mail/connections`,
    CREATE_CONNECTION: `${B}/mail/connections`,
  },

  // ── Webhooks ───────────────────────────────────────────────────────────────
  WEBHOOKS: {
    LIST:   `${B}/webhooks`,
    CREATE: `${B}/webhooks`,
    GET:    (id: string) => `${B}/webhooks/${id}`,
    UPDATE: (id: string) => `${B}/webhooks/${id}`,
    DELETE: (id: string) => `${B}/webhooks/${id}`,
  },

  // ── Workflow ───────────────────────────────────────────────────────────────
  WORKFLOW: {
    LIST:      `${B}/automation/workflows`,
    CREATE:    `${B}/automation/workflows`,
    GET:       (id: string) => `${B}/automation/workflows/${id}`,
    UPDATE:    (id: string) => `${B}/automation/workflows/${id}`,
    DELETE:    (id: string) => `${B}/automation/workflows/${id}`,
    EXECUTE:   (id: string) => `${B}/automation/workflows/${id}/execute`,
    TEMPLATES: `${B}/automation/templates`,
  },
} as const;
