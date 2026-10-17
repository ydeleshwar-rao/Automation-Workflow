/**
 * whatsappApi.ts
 * ─────────────────────────────────────────────────────────────
 * WhatsApp session start, QR polling and test sends for the WhatsApp workflow step.
 */

import { baseApi } from "@/src/store/baseApi";
import { API_ROUTES } from "@/src/constants/api.constants";

/** The backend has used several names for the QR image field. */
export interface WhatsAppQrResponse {
  status?: string;
  message?: string;
  qr?: string;
  qrCode?: string;
  qr_code?: string;
}

export interface SendWhatsAppTextPayload {
  to: string;
  message: string;
}

export interface SendWhatsAppImagePayload {
  to: string;
  url: string;
  caption?: string;
  mimetype?: string;
}

export interface SendWhatsAppDocumentPayload extends SendWhatsAppImagePayload {
  filename?: string;
}

export interface SendWhatsAppLocationPayload {
  to: string;
  lat: number | string;
  lng: number | string;
  name?: string;
  address?: string;
}

export type WhatsAppSendResult = Record<string, unknown>;

/** WhatsApp routes answer either `{ data }` or the bare result. */
function unwrapData<Result>(response: unknown): Result {
  if (response && typeof response === "object" && "data" in response) {
    return ((response as { data: unknown }).data ?? response) as Result;
  }
  return response as Result;
}

export const whatsappApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    connectWhatsApp: builder.mutation<unknown, { reset?: boolean }>({
      query: (options) => ({ url: API_ROUTES.WHATSAPP.CONNECT, method: "POST", data: options }),
      transformResponse: unwrapData<unknown>,
    }),

    getWhatsAppQr: builder.query<WhatsAppQrResponse, void>({
      query: () => ({ url: API_ROUTES.WHATSAPP.QR, method: "GET" }),
      transformResponse: unwrapData<WhatsAppQrResponse>,
    }),

    sendWhatsAppText: builder.mutation<WhatsAppSendResult, SendWhatsAppTextPayload>({
      query: (payload) => ({ url: API_ROUTES.WHATSAPP.SEND_TEXT, method: "POST", data: payload }),
      transformResponse: unwrapData<WhatsAppSendResult>,
    }),

    sendWhatsAppImage: builder.mutation<WhatsAppSendResult, SendWhatsAppImagePayload>({
      query: (payload) => ({ url: API_ROUTES.WHATSAPP.SEND_IMAGE, method: "POST", data: payload }),
      transformResponse: unwrapData<WhatsAppSendResult>,
    }),

    sendWhatsAppDocument: builder.mutation<WhatsAppSendResult, SendWhatsAppDocumentPayload>({
      query: (payload) => ({ url: API_ROUTES.WHATSAPP.SEND_DOCUMENT, method: "POST", data: payload }),
      transformResponse: unwrapData<WhatsAppSendResult>,
    }),

    sendWhatsAppLocation: builder.mutation<WhatsAppSendResult, SendWhatsAppLocationPayload>({
      query: (payload) => ({ url: API_ROUTES.WHATSAPP.SEND_LOCATION, method: "POST", data: payload }),
      transformResponse: unwrapData<WhatsAppSendResult>,
    }),
  }),
});

export const {
  useConnectWhatsAppMutation,
  useLazyGetWhatsAppQrQuery,
  useSendWhatsAppTextMutation,
  useSendWhatsAppImageMutation,
  useSendWhatsAppDocumentMutation,
  useSendWhatsAppLocationMutation,
} = whatsappApi;
