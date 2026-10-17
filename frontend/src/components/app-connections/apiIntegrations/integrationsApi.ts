/**
 * integrationsApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query endpoints for third-party integration connections:
 * connection status, connect / disconnect, WhatsApp session and LeadsHub data.
 */

import { baseApi } from "@/src/store/baseApi";
import type { AxiosBaseQueryArgs } from "@/src/store/axiosBaseQuery";
import { API_ROUTES } from "@/src/constants/api.constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export const INTEGRATION_APP_IDS = ["servicem8", "commusoft", "leadshub", "simpro"] as const;

export type IntegrationAppId = (typeof INTEGRATION_APP_IDS)[number];

/** Integrations connected through an OAuth popup started by the backend. */
export type OAuthAppId = Extract<IntegrationAppId, "servicem8" | "leadshub">;

export interface IntegrationConnectionStatus {
  isConnected: boolean;
  /** The integration is linked but its credentials expired, so the user must reconnect. */
  needsReauth: boolean;
}

export type IntegrationStatusMap = Record<IntegrationAppId, IntegrationConnectionStatus>;

export interface OAuthConnectResult {
  authUrl: string | undefined;
  message: string | undefined;
}

export interface CommusoftCredentials {
  clientId: string;
  username: string;
  password: string;
}

export interface WhatsAppStatus {
  connected?: boolean;
  status?: string;
  phone?: string;
  phone_number?: string;
  qr?: string;
  qrCode?: string;
  qr_code?: string;
  message?: string;
}

export interface LeadsHubContact {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  [field: string]: unknown;
}

export type LeadsHubEventKind = "trigger" | "action" | "all";

export interface ActionEventType {
  id: string;
  label: string;
  description?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const INTEGRATION_STATUS_TAG = "IntegrationStatus" as const;
const WHATSAPP_STATUS_TAG = "WhatsAppStatus" as const;

// Not in API_ROUTES yet: api.constants.ts is outside this module's ownership; move them there.
export const WHATSAPP_ROUTES = {
  CONNECT:  "/whatsapp/connect",
  QR:       "/whatsapp/qr",
  STATUS:   "/whatsapp/status",
  MESSAGES: {
    TEXT:     "/whatsapp/messages/text",
    IMAGE:    "/whatsapp/messages/image",
    DOCUMENT: "/whatsapp/messages/document",
    LOCATION: "/whatsapp/messages/location",
  },
} as const;
const LEADSHUB_CONTACTS_ROUTE = "/leadshub/contacts";

const STATUS_ROUTES: Record<IntegrationAppId, string> = {
  servicem8: API_ROUTES.SERVICEM8.STATUS,
  commusoft: API_ROUTES.COMMUSOFT.STATUS,
  leadshub:  API_ROUTES.GHL.STATUS,
  simpro:    API_ROUTES.SIMPRO.STATUS,
};

/** Only ServiceM8 reports expired credentials through `needs_reauth`. */
const APPS_REPORTING_REAUTH: ReadonlySet<IntegrationAppId> = new Set(["servicem8"]);

const OAUTH_CONNECT_ROUTES: Record<OAuthAppId, string> = {
  servicem8: API_ROUTES.SERVICEM8.CONNECT,
  leadshub:  API_ROUTES.GHL.CONNECT,
};

const DISCONNECT_REQUESTS: Record<IntegrationAppId, AxiosBaseQueryArgs> = {
  servicem8: { url: API_ROUTES.SERVICEM8.DISCONNECT, method: "DELETE" },
  commusoft: { url: API_ROUTES.COMMUSOFT.DISCONNECT, method: "DELETE" },
  leadshub:  { url: API_ROUTES.GHL.DISCONNECT, method: "DELETE" },
  simpro:    { url: API_ROUTES.SIMPRO.DISCONNECT, method: "POST", data: {} },
};

const LEADSHUB_EVENT_TYPE_ROUTES: Record<LeadsHubEventKind, string> = {
  trigger: API_ROUTES.GHL.ACTION_EVENT_TRIGGERS,
  action:  API_ROUTES.GHL.ACTION_EVENT_ACTIONS,
  all:     API_ROUTES.GHL.ACTION_EVENT_TYPES,
};

export const DISCONNECTED_STATUS: IntegrationConnectionStatus = {
  isConnected: false,
  needsReauth: false,
};

// ── Response parsing ──────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** The backend answers either `{ flag }` or `{ data: { flag } }`, so both levels are checked. */
function hasTrueFlag(responseBody: unknown, flag: string): boolean {
  if (!isRecord(responseBody)) return false;
  const nestedData = responseBody.data;
  return responseBody[flag] === true || (isRecord(nestedData) && nestedData[flag] === true);
}

function readString(source: unknown, key: string): string | undefined {
  if (!isRecord(source)) return undefined;
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

/** Many endpoints wrap their payload as `{ data: payload }`; others return the payload directly. */
function unwrapDataEnvelope(responseBody: unknown): unknown {
  return (isRecord(responseBody) ? responseBody.data : undefined) ?? responseBody;
}

export function isIntegrationAppId(appId: string): appId is IntegrationAppId {
  return (INTEGRATION_APP_IDS as readonly string[]).includes(appId);
}

export function isOAuthAppId(appId: string): appId is OAuthAppId {
  return appId in OAUTH_CONNECT_ROUTES;
}

function toConnectionStatus(appId: IntegrationAppId, responseBody: unknown): IntegrationConnectionStatus {
  const isLinked = hasTrueFlag(responseBody, "connected") || hasTrueFlag(responseBody, "alreadyConnected");
  const needsReauth = isLinked && APPS_REPORTING_REAUTH.has(appId) && hasTrueFlag(responseBody, "needs_reauth");
  return { isConnected: isLinked && !needsReauth, needsReauth };
}

function toOAuthConnectResult(responseBody: unknown): OAuthConnectResult {
  const nestedData = isRecord(responseBody) ? responseBody.data : undefined;
  const doubleNestedData = isRecord(nestedData) ? nestedData.data : undefined;
  return {
    authUrl:
      readString(nestedData, "url") ??
      readString(doubleNestedData, "url") ??
      readString(responseBody, "url"),
    message: readString(responseBody, "message"),
  };
}

function toLeadsHubContacts(responseBody: unknown): LeadsHubContact[] {
  if (Array.isArray(responseBody)) return responseBody;
  if (isRecord(responseBody) && Array.isArray(responseBody.contacts)) return responseBody.contacts;
  return [];
}

function toActionEventTypes(responseBody: unknown): ActionEventType[] {
  const eventTypes = isRecord(responseBody) ? responseBody.data : undefined;
  if (!Array.isArray(eventTypes)) return [];
  return eventTypes.map((eventType: unknown) => ({
    id:          readString(eventType, "action_key") ?? "",
    label:       readString(eventType, "label") ?? "",
    description: readString(eventType, "description"),
  }));
}

// ── RTK Query API ─────────────────────────────────────────────────────────────

export const integrationsApi = baseApi
  .enhanceEndpoints({ addTagTypes: [INTEGRATION_STATUS_TAG, WHATSAPP_STATUS_TAG] })
  .injectEndpoints({
    endpoints: (builder) => ({
      /** All integration statuses in parallel; a failed status request counts as "not connected". */
      getIntegrationStatuses: builder.query<IntegrationStatusMap, void>({
        async queryFn(_argument, _queryApi, _extraOptions, baseQuery) {
          const statusEntries = await Promise.all(
            INTEGRATION_APP_IDS.map(async (appId) => {
              const response = await baseQuery({ url: STATUS_ROUTES[appId] });
              return [appId, toConnectionStatus(appId, response.data)] as const;
            }),
          );
          return { data: Object.fromEntries(statusEntries) as IntegrationStatusMap };
        },
        providesTags: [INTEGRATION_STATUS_TAG],
      }),

      startOAuthConnect: builder.mutation<OAuthConnectResult, { appId: OAuthAppId; returnUrl: string }>({
        query: ({ appId, returnUrl }) => ({
          url: OAUTH_CONNECT_ROUTES[appId],
          params: { returnUrl },
        }),
        transformResponse: toOAuthConnectResult,
      }),

      connectCommusoft: builder.mutation<unknown, CommusoftCredentials>({
        query: (credentials) => ({
          url: API_ROUTES.COMMUSOFT.CONNECT,
          method: "POST",
          data: credentials,
        }),
        invalidatesTags: [INTEGRATION_STATUS_TAG],
      }),

      disconnectIntegration: builder.mutation<unknown, IntegrationAppId>({
        query: (appId) => DISCONNECT_REQUESTS[appId],
        invalidatesTags: [INTEGRATION_STATUS_TAG],
      }),

      // ── WhatsApp ──────────────────────────────────────────────────────────

      getWhatsAppStatus: builder.query<WhatsAppStatus, void>({
        query: () => ({ url: WHATSAPP_ROUTES.STATUS }),
        transformResponse: (responseBody: unknown) => unwrapDataEnvelope(responseBody) as WhatsAppStatus,
        providesTags: [WHATSAPP_STATUS_TAG],
      }),

      getWhatsAppQr: builder.query<WhatsAppStatus, void>({
        query: () => ({ url: WHATSAPP_ROUTES.QR }),
        transformResponse: (responseBody: unknown) => unwrapDataEnvelope(responseBody) as WhatsAppStatus,
      }),

      connectWhatsApp: builder.mutation<WhatsAppStatus, { reset?: boolean }>({
        query: (options) => ({
          url: WHATSAPP_ROUTES.CONNECT,
          method: "POST",
          data: options,
        }),
        transformResponse: (responseBody: unknown) => unwrapDataEnvelope(responseBody) as WhatsAppStatus,
        invalidatesTags: [WHATSAPP_STATUS_TAG],
      }),

      // ── LeadsHub ──────────────────────────────────────────────────────────

      getLeadsHubContacts: builder.query<LeadsHubContact[], void>({
        query: () => ({ url: LEADSHUB_CONTACTS_ROUTE }),
        transformResponse: toLeadsHubContacts,
      }),

      getLeadsHubActionEventTypes: builder.query<ActionEventType[], LeadsHubEventKind>({
        query: (eventKind) => ({ url: LEADSHUB_EVENT_TYPE_ROUTES[eventKind] }),
        transformResponse: toActionEventTypes,
      }),
    }),
  });

export const {
  useGetIntegrationStatusesQuery,
  useStartOAuthConnectMutation,
  useConnectCommusoftMutation,
  useDisconnectIntegrationMutation,
  useGetWhatsAppStatusQuery,
  useLazyGetWhatsAppQrQuery,
  useConnectWhatsAppMutation,
  useGetLeadsHubContactsQuery,
  useGetLeadsHubActionEventTypesQuery,
} = integrationsApi;
