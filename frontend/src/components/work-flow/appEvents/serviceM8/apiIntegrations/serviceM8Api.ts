/**
 * serviceM8Api.ts
 * ─────────────────────────────────────────────────────────────
 * ServiceM8 lookups the workflow builder needs to fill select fields.
 */

import { baseApi } from "@/src/store/baseApi";
import { API_ROUTES } from "@/src/constants/api.constants";
import { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";

/** Queues and categories share this shape in ServiceM8. */
interface ServiceM8NamedRecord {
  uuid?: string;
  name: string;
}

/** Some ServiceM8 list routes wrap rows in `{ data }`, others return the bare array. */
type ServiceM8ListResponse = ApiResponse<ServiceM8NamedRecord[]> | ServiceM8NamedRecord[];

export interface ServiceM8SelectOption {
  label: string;
  value: string;
}

function toSelectOptions(response: ServiceM8ListResponse): ServiceM8SelectOption[] {
  const records = Array.isArray(response) ? response : response?.data ?? [];
  return records
    .filter((record): record is ServiceM8NamedRecord & { uuid: string } => Boolean(record?.uuid))
    .map((record) => ({ label: record.name, value: record.uuid }));
}

export const serviceM8Api = baseApi
  .enhanceEndpoints({ addTagTypes: ["ServiceM8Queue", "ServiceM8Category"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getServiceM8QueueOptions: builder.query<ServiceM8SelectOption[], void>({
        query: () => ({ url: API_ROUTES.SERVICEM8.QUEUES, method: "GET" }),
        transformResponse: toSelectOptions,
        providesTags: ["ServiceM8Queue"],
      }),

      getServiceM8CategoryOptions: builder.query<ServiceM8SelectOption[], void>({
        query: () => ({ url: API_ROUTES.SERVICEM8.CATEGORIES, method: "GET" }),
        transformResponse: toSelectOptions,
        providesTags: ["ServiceM8Category"],
      }),
    }),
  });

export const {
  useGetServiceM8QueueOptionsQuery,
  useGetServiceM8CategoryOptionsQuery,
} = serviceM8Api;
