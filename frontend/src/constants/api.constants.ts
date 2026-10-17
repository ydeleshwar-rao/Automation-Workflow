/**
 * API route constants — all calls go to the backend Express server.
 * The frontend never talks to the database directly.
 */

/** Backend origin, e.g. http://localhost:5000 (no path). */
export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

/** API version prefix — every backend route lives under it. */
export const API_PREFIX = "/api/v1";

/** Versioned backend base URL — use this for every backend call. */
export const API_BASE_URL = `${API_ORIGIN}${API_PREFIX}`;

const B = API_BASE_URL;

export const API_ROUTES = {
  // ── Auth ───────────────────────────────────────────────────────────────────
  AUTH: {
    LOGIN:         `${B}/auth/login`,
    GOOGLE:        `${B}/auth/google`,
    REGISTER:      `${B}/auth/register`,
    REFRESH:       `${B}/auth/refresh`,
    LOGOUT:        `${B}/auth/logout`,
    SETUP:         `${B}/auth/setup`,
    FORGOT_PASSWORD: `${B}/auth/forgot-password`,
    RESET_PASSWORD:  `${B}/auth/reset-password`,
  },

  // ── Google / Microsoft sign-in + company SSO ──────────────────────────────
  SSO: {
    CALLBACK:   `${B}/sso/callback`,
    DISCOVER:   `${B}/sso/discover`,
    CONNECT:    `${B}/sso/connect`,
    SETTINGS:   `${B}/sso/settings`,
    CONNECTION: (id: string) => `${B}/sso/connections/${id}`,
  },

  // ── Access / Developer Management ─────────────────────────────────────────
  ACCESS: {
    DEVELOPERS:       `${B}/access/developers`,
    DEVELOPER:        (id: string) => `${B}/access/developers/${id}`,
    DEVELOPER_STATUS: (id: string) => `${B}/access/developers/${id}/status`,
    PERMISSIONS:      (id: string) => `${B}/access/developers/${id}/permissions`,
    PERMISSION:       (id: string, pageKey: string) => `${B}/access/developers/${id}/permissions/${pageKey}`,
    // Not implemented in the backend yet: create a user with a chosen role and client profile (CreateUserForm).
    ADMINS:           `${B}/access/admins`,
    ADMIN:            (id: string) => `${B}/access/admins/${id}`,
  },

  // ── ServiceM8 ─────────────────────────────────────────────────────────────
  SERVICEM8: {
    CONNECT:    "/servicem8/connect",
    DISCONNECT: "/servicem8/disconnect",
    STATUS:     "/servicem8/status",
    GET_ALL_JOBS: "/servicem8/getalljobs",
    QUEUES:       "/servicem8/listqueues",
    CATEGORIES:   "/servicem8/listcategories",
  },

  // ── Commusoft ─────────────────────────────────────────────────────────────
  COMMUSOFT: {
    CONNECT:         "/commusoft/connect",
    DISCONNECT:      "/commusoft/disconnect",
    STATUS:          "/commusoft/status",
    GET_ALL_JOBS:    "/commusoft/getalljobs",
    CUSTOMER_TYPES:  "/commusoft/customertypes",
    CREATE_CUSTOMER: "/commusoft/customers/create",
  },

  // ── simPRO ────────────────────────────────────────────────────────────────
  SIMPRO: {
    CONNECT:      "/api/integration/simpro/connect",
    DISCONNECT:   "/api/integration/simpro/disconnect",
    STATUS:       "/simpro/status",
    GET_ALL_JOBS: "/simpro/getalljobs",
    JOBS:         "/simpro/jobs",
  },

  // ── LeadsHub (GoHighLevel) ────────────────────────────────────────────────
  GHL: {
    CONNECT:    "/leadshub/auth/connect",
    DISCONNECT: "/leadshub/auth/disconnect",
    STATUS:     "/leadshub/auth/status",
    TEST_ADD_UPDATE_OPPORTUNITY: "/leadshub/opportunities/test/add-update",
    ACTION_EVENT_TYPES:    "/automation/action-event-types/leadshub",
    ACTION_EVENT_TRIGGERS: "/automation/action-event-types/leadshub/triggers",
    ACTION_EVENT_ACTIONS:  "/automation/action-event-types/leadshub/actions",
    CUSTOM_FIELDS:         "/leadshub/customfields/all",
    PIPELINES:             "/leadshub/pipelines/all",
    // Location-scoped routes used by the LeadsHub custom-fields test page
    LOCATION_CUSTOM_FIELDS: (locationId: string) => `/customFields/all/${locationId}`,
    LOCATION_LEAD_INPUT:    (locationId: string) => `/webhooks/getleadinput/${locationId}`,
    LOCATION_CREATE_LEAD:   (locationId: string) => `/contacts/createlead/${locationId}`,
  },

  // ── SMTP / Mail ───────────────────────────────────────────────────────────
  MAIL: {
    SMTP_CONNECTIONS:  `${B}/mail/getconnections`,
    SMTP_CREATE:       `${B}/mail/smtpcreate`,
    PUBLIC_KEY:        `${B}/mail/public-key`,
    SEND:              `${B}/mail/send`,
    FIELD_LABELS:      `${B}/mail/field-labels`,
  },

  // ── Workflow ───────────────────────────────────────────────────────────────
  WORKFLOW: {
    TEST_ACTION: `${B}/automation/workflows/test-action`,
    ACTION_EVENT_TYPES: (integrationSlug: string, eventCategory: string) =>
      `${B}/automation/action-event-types/${integrationSlug}/${eventCategory}`,
  },

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  WHATSAPP: {
    CONNECT:       "/whatsapp/connect",
    QR:            "/whatsapp/qr",
    SEND_TEXT:     "/whatsapp/messages/text",
    SEND_IMAGE:    "/whatsapp/messages/image",
    SEND_DOCUMENT: "/whatsapp/messages/document",
    SEND_LOCATION: "/whatsapp/messages/location",
  },
} as const;
