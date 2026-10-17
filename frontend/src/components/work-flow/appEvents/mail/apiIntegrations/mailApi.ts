/**
 * mailApi.ts
 * ─────────────────────────────────────────────────────────────
 * SMTP connections and test sends for the Email workflow step.
 */

import { baseApi } from "@/src/store/baseApi";
import { API_ROUTES } from "@/src/constants/api.constants";
import type {
  CreateSmtpConnectionPayload,
  CreateSmtpConnectionResponse,
  GetConnectionsResponse,
  SendEmailPayload,
  SendEmailResponse,
  SmtpConnection,
} from "./types/mailApis.type";

const SMTP_CONNECTION_LIST_TAG = { type: "SmtpConnection", id: "LIST" } as const;

/** Older handlers wrap the payload one level deeper (`data.data`); accept both. */
function unwrapNestedData(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: unknown }).data || payload;
  }
  return payload;
}

/** The list route has returned both a bare row and an array; always hand back an array. */
function toConnectionList(response: GetConnectionsResponse): SmtpConnection[] {
  const rows = unwrapNestedData(response?.data);
  if (Array.isArray(rows)) return rows as SmtpConnection[];
  if (rows && typeof rows === "object") return [rows as SmtpConnection];
  return [];
}

function toCreatedConnection(response: CreateSmtpConnectionResponse): SmtpConnection {
  return unwrapNestedData(response.data) as SmtpConnection;
}

export const mailApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["SmtpConnection"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      /** Global SMTP connections (visible to all authenticated users). */
      getSmtpConnections: builder.query<SmtpConnection[], void>({
        query: () => ({ url: API_ROUTES.MAIL.SMTP_CONNECTIONS, method: "GET" }),
        transformResponse: toConnectionList,
        providesTags: [SMTP_CONNECTION_LIST_TAG],
      }),

      /** Server RSA public key used to encrypt SMTP credentials before transit. */
      getSmtpPublicKey: builder.query<string, void>({
        query: () => ({ url: API_ROUTES.MAIL.PUBLIC_KEY, method: "GET" }),
        transformResponse: (response: { data: { publicKey: string } }) => response.data.publicKey,
      }),

      /** Creates and verifies a new global SMTP connection (admin/developer only). */
      createSmtpConnection: builder.mutation<SmtpConnection, CreateSmtpConnectionPayload>({
        query: (payload) => ({ url: API_ROUTES.MAIL.SMTP_CREATE, method: "POST", data: payload }),
        transformResponse: toCreatedConnection,
        invalidatesTags: [SMTP_CONNECTION_LIST_TAG],
      }),

      /** Sends an email through a saved SMTP connection. */
      sendEmail: builder.mutation<SendEmailResponse["data"], SendEmailPayload>({
        query: (payload) => ({ url: API_ROUTES.MAIL.SEND, method: "POST", data: payload }),
        transformResponse: (response: SendEmailResponse) => response.data,
      }),
    }),
  });

export const {
  useGetSmtpConnectionsQuery,
  useLazyGetSmtpPublicKeyQuery,
  useCreateSmtpConnectionMutation,
  useSendEmailMutation,
} = mailApi;
