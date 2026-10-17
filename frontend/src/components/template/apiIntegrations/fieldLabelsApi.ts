import { baseApi } from "@/src/store/baseApi";
import { API_ROUTES } from "@/src/constants/api.constants";
import type { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";

export type FieldLabels = Record<string, string>;

/** Readable labels for raw form-field keys, generated server-side (the LLM key never reaches the browser). */
export const fieldLabelsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateFieldLabels: builder.mutation<FieldLabels, string[]>({
      query: (fieldKeys) => ({ url: API_ROUTES.MAIL.FIELD_LABELS, method: "POST", data: { keys: fieldKeys } }),
      transformResponse: (response: ApiResponse<{ labels: FieldLabels }>) => response.data?.labels ?? {},
    }),
  }),
});
