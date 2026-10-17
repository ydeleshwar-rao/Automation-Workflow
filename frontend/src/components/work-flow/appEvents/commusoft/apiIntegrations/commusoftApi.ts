/**
 * commusoftApi.ts
 * ─────────────────────────────────────────────────────────────
 * Commusoft lookups and test actions used by the workflow builder.
 */

import { baseApi } from "@/src/store/baseApi";
import { API_ROUTES } from "@/src/constants/api.constants";
import { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";

export interface CommusoftSelectOption {
  label: string;
  value: string;
}

export const commusoftApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["CommusoftCustomerType"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getCommusoftCustomerTypeOptions: builder.query<CommusoftSelectOption[], void>({
        query: () => ({ url: API_ROUTES.COMMUSOFT.CUSTOMER_TYPES, method: "GET" }),
        // Value must equal the raw description — the backend does an ilike lookup
        // against commusoft_customertype.description, and ilike does not
        // normalise underscores vs spaces. Transforming breaks the lookup.
        transformResponse: (response: ApiResponse<string[] | null>) =>
          (response?.data ?? []).map((description) => ({ label: description, value: description })),
        providesTags: ["CommusoftCustomerType"],
      }),

      createCommusoftCustomer: builder.mutation<unknown, Record<string, unknown>>({
        query: (customer) => ({
          url: API_ROUTES.COMMUSOFT.CREATE_CUSTOMER,
          method: "POST",
          data: customer,
        }),
      }),
    }),
  });

export const {
  useGetCommusoftCustomerTypeOptionsQuery,
  useCreateCommusoftCustomerMutation,
} = commusoftApi;
