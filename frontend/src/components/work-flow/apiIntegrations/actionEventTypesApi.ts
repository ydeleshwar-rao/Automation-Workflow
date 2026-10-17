/**
 * actionEventTypesApi.ts
 * ─────────────────────────────────────────────────────────────
 * One parameterised endpoint for the trigger / action event catalogue
 * of every integration (`/automation/action-event-types/<slug>/<category>`).
 */

import { baseApi } from "@/src/store/baseApi";
import { API_ROUTES } from "@/src/constants/api.constants";
import { ApiResponse } from "./types/integration.types";

/** URL slugs the backend registers under `/automation/action-event-types`. */
export const ACTION_EVENT_INTEGRATION_SLUGS = {
  SERVICE_M8: "service-m8",
  COMMUSOFT: "commusoft",
  LEADSHUB: "leadshub",
  SIMPRO: "simpro",
} as const;

export type ActionEventIntegrationSlug =
  (typeof ACTION_EVENT_INTEGRATION_SLUGS)[keyof typeof ACTION_EVENT_INTEGRATION_SLUGS];

export type ActionEventCategory = "triggers" | "actions";

export interface ActionEventTypeRecord {
  action_key: string;
  label: string;
  type?: "trigger" | "action";
  description?: string;
}

/** Shape the event selector popups render. */
export interface ActionEventOption {
  id: string;
  label: string;
  description?: string;
}

export interface ActionEventOptionsArgs {
  integrationSlug: ActionEventIntegrationSlug;
  eventCategory: ActionEventCategory;
}

const NO_ACTION_EVENT_OPTIONS: ActionEventOption[] = [];

function toActionEventOption(record: ActionEventTypeRecord): ActionEventOption {
  return { id: record.action_key, label: record.label, description: record.description };
}

export const actionEventTypesApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["ActionEventType"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getActionEventOptions: builder.query<ActionEventOption[], ActionEventOptionsArgs>({
        query: ({ integrationSlug, eventCategory }) => ({
          url: API_ROUTES.WORKFLOW.ACTION_EVENT_TYPES(integrationSlug, eventCategory),
          method: "GET",
        }),
        transformResponse: (response: ApiResponse<ActionEventTypeRecord[] | null>) =>
          (response?.data ?? []).map(toActionEventOption),
        providesTags: (_result, _error, { integrationSlug, eventCategory }) => [
          { type: "ActionEventType", id: `${integrationSlug}/${eventCategory}` },
        ],
      }),
    }),
  });

export const { useGetActionEventOptionsQuery } = actionEventTypesApi;

/** Trigger or action events of one integration, ready for an event selector. */
export function useActionEventOptions(integrationSlug: ActionEventIntegrationSlug, isTrigger: boolean) {
  const { data, isLoading } = useGetActionEventOptionsQuery({
    integrationSlug,
    eventCategory: isTrigger ? "triggers" : "actions",
  });
  return { events: data ?? NO_ACTION_EVENT_OPTIONS, isLoading };
}
