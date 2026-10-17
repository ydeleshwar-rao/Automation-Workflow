/**
 * leadConnectorApi.ts
 * ─────────────────────────────────────────────────────────────
 * LeadConnector (LeadsHub / GoHighLevel) data used by the workflow builder
 * and the LeadsHub custom-fields page.
 */

import { baseApi } from "@/src/store/baseApi";
import { API_ROUTES } from "@/src/constants/api.constants";
import { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";
import type { FieldMeta, FieldOption } from "@/src/components/ui/dynamic-config-form";

// ── Backend shapes ───────────────────────────────────────────────────────────

interface ContactCustomFieldRecord {
  id?: string;
  key?: string;
  name: string;
}

interface ActionFieldRecord {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  optionsSource?: string;
}

interface CustomFieldsRecord {
  contact?: ContactCustomFieldRecord[];
  action?: ActionFieldRecord[];
}

interface PipelineStageRecord {
  id: string;
  name: string;
  position: number;
  pipeline_id?: string;
}

interface PipelineRecord {
  id: string;
  name: string;
  stages?: PipelineStageRecord[];
}

// ── Builder shapes ───────────────────────────────────────────────────────────

/** An action field whose options come from a named dynamic source (e.g. "pipelines"). */
export interface LeadConnectorActionField extends FieldMeta {
  optionsSource?: string;
}

export interface LeadConnectorCustomFields {
  contactFields: FieldMeta[];
  actionFields: LeadConnectorActionField[];
}

export interface LeadConnectorPipelineStage extends PipelineStageRecord {
  pipeline_id: string;
}

export interface LeadConnectorPipelines {
  pipelineOptions: FieldOption[];
  stages: LeadConnectorPipelineStage[];
}

/** A custom field as returned by the location-scoped custom-fields route. */
export interface LocationCustomField {
  id?: string;
  key: string;
  name: string;
  dataType: string;
  standard?: boolean;
  model: string;
}

interface LocationCustomFieldsRecord {
  contact?: LocationCustomField[];
  opportunity?: LocationCustomField[];
  business?: LocationCustomField[];
}

export type LeadInputPayload = Record<string, unknown>;

// ── Transforms ───────────────────────────────────────────────────────────────

function toContactField(field: ContactCustomFieldRecord): FieldMeta {
  return { name: field.key || field.id || "", label: field.name, type: "text" };
}

function toActionField(field: ActionFieldRecord): LeadConnectorActionField {
  return {
    name: field.name,
    label: field.label,
    type: field.type as FieldMeta["type"],
    required: field.required,
    placeholder: field.placeholder,
    options: field.options,
    optionsSource: field.optionsSource,
  };
}

function toCustomFields(response: ApiResponse<CustomFieldsRecord | null>): LeadConnectorCustomFields {
  const { contact, action } = response?.data ?? {};
  return {
    contactFields: Array.isArray(contact) ? contact.map(toContactField) : [],
    actionFields: Array.isArray(action) ? action.map(toActionField) : [],
  };
}

function toPipelines(response: ApiResponse<PipelineRecord[] | null>): LeadConnectorPipelines {
  const pipelines = Array.isArray(response?.data) ? response.data : [];
  return {
    pipelineOptions: pipelines.map((pipeline) => ({ label: pipeline.name, value: pipeline.id })),
    stages: pipelines.flatMap((pipeline) =>
      (pipeline.stages ?? []).map((stage) => ({ ...stage, pipeline_id: stage.pipeline_id || pipeline.id }))
    ),
  };
}

function toLocationCustomFields(
  response: ApiResponse<LocationCustomFieldsRecord | null>
): LocationCustomField[] {
  if (!response?.success || !response.data) return [];
  const { contact = [], opportunity = [], business = [] } = response.data;
  return [...contact, ...opportunity, ...business];
}

// ── RTK Query API ────────────────────────────────────────────────────────────

export const leadConnectorApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["LeadConnectorCustomFields", "LeadConnectorPipelines"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getLeadConnectorCustomFields: builder.query<LeadConnectorCustomFields, void>({
        query: () => ({ url: API_ROUTES.GHL.CUSTOM_FIELDS, method: "GET" }),
        transformResponse: toCustomFields,
        providesTags: ["LeadConnectorCustomFields"],
      }),

      getLeadConnectorPipelines: builder.query<LeadConnectorPipelines, void>({
        query: () => ({ url: API_ROUTES.GHL.PIPELINES, method: "GET" }),
        transformResponse: toPipelines,
        providesTags: ["LeadConnectorPipelines"],
      }),

      testAddUpdateOpportunity: builder.mutation<unknown, Record<string, unknown>>({
        query: (opportunity) => ({
          url: API_ROUTES.GHL.TEST_ADD_UPDATE_OPPORTUNITY,
          method: "POST",
          data: opportunity,
        }),
      }),

      getLocationCustomFields: builder.query<LocationCustomField[], string>({
        query: (locationId) => ({ url: API_ROUTES.GHL.LOCATION_CUSTOM_FIELDS(locationId), method: "GET" }),
        transformResponse: toLocationCustomFields,
      }),

      getLocationLeadInput: builder.query<LeadInputPayload | null, string>({
        query: (locationId) => ({ url: API_ROUTES.GHL.LOCATION_LEAD_INPUT(locationId), method: "GET" }),
        transformResponse: (response: ApiResponse<{ payload?: LeadInputPayload } | null>) =>
          response?.data?.payload ?? null,
      }),

      createLocationLead: builder.mutation<unknown, { locationId: string; lead: Record<string, string> }>({
        query: ({ locationId, lead }) => ({
          url: API_ROUTES.GHL.LOCATION_CREATE_LEAD(locationId),
          method: "POST",
          data: lead,
        }),
      }),
    }),
  });

export const {
  useGetLeadConnectorCustomFieldsQuery,
  useGetLeadConnectorPipelinesQuery,
  useTestAddUpdateOpportunityMutation,
  useGetLocationCustomFieldsQuery,
  useLazyGetLocationLeadInputQuery,
  useCreateLocationLeadMutation,
} = leadConnectorApi;
