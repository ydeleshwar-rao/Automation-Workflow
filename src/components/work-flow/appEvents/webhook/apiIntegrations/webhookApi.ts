import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/src/store/axiosBaseQuery";
import {
  ApiResponse,
  CreateWebhookPayload,
  CreateWebhookResponse,
  GetWebhookResponse,
  UpdateWebhookPayload,
} from "./types/webhookApis.type";

export interface UpdateWebhookModePayload {
  mode?: "test" | "live";
  request_body?: Record<string, unknown>;
}

export const webhookApi = createApi({
  reducerPath: "webhookApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["WebhookResponse"],

  endpoints: (builder) => ({
    createWebhook: builder.mutation<ApiResponse<CreateWebhookResponse>, CreateWebhookPayload>({
      query: (payload) => ({
        url: `/api/webhooks`,
        method: "POST",
        data: payload,
      }),
    }),

    getWebhookResponse: builder.query<ApiResponse<GetWebhookResponse[]>, string>({
      query: (webhookId) => ({
        url: `/api/getwebhook/${webhookId}/event`,
        method: "GET",
      }),
      providesTags: (_r, _e, webhookId) => [{ type: "WebhookResponse", id: webhookId }],
    }),

    updateWebhookResponse: builder.mutation<void, { responseId: string; payload: UpdateWebhookModePayload }>({
      query: ({ responseId, payload }) => ({
        url: `/api/webhooks/update/${responseId}`,
        method: "PATCH",
        data: payload,
      }),
      invalidatesTags: (_r, _e, { responseId }) => [{ type: "WebhookResponse", id: responseId }],
    }),

    
  }),
});

export const {
  useCreateWebhookMutation,
  useGetWebhookResponseQuery,
  useUpdateWebhookResponseMutation,
} = webhookApi;
