"use client";

import { useCallback } from "react";
import type { FieldMeta, FieldOption } from "@/src/components/ui/dynamic-config-form";
import {
  LeadConnectorActionField,
  LeadConnectorPipelineStage,
  useGetLeadConnectorCustomFieldsQuery,
  useGetLeadConnectorPipelinesQuery,
} from "@/src/components/work-flow/appEvents/leadconnector/apiIntegrations/leadConnectorApi";

const NO_FIELDS: FieldMeta[] = [];
const NO_ACTION_FIELDS: LeadConnectorActionField[] = [];
const NO_OPTIONS: FieldOption[] = [];
const NO_STAGES: LeadConnectorPipelineStage[] = [];

/** Custom fields and pipelines (with stages) for the LeadConnector configure step. */
export function useLeadConnectorData() {
  const customFieldsQuery = useGetLeadConnectorCustomFieldsQuery();
  const pipelinesQuery = useGetLeadConnectorPipelinesQuery();

  const { refetch: refetchCustomFields } = customFieldsQuery;
  const { refetch: refetchPipelines } = pipelinesQuery;
  const refresh = useCallback(() => {
    void refetchCustomFields();
    void refetchPipelines();
  }, [refetchCustomFields, refetchPipelines]);

  return {
    contactFields: customFieldsQuery.data?.contactFields ?? NO_FIELDS,
    actionFields: customFieldsQuery.data?.actionFields ?? NO_ACTION_FIELDS,
    pipelineOptions: pipelinesQuery.data?.pipelineOptions ?? NO_OPTIONS,
    allStages: pipelinesQuery.data?.stages ?? NO_STAGES,
    isLoading: customFieldsQuery.isFetching || pipelinesQuery.isFetching,
    refresh,
  };
}
