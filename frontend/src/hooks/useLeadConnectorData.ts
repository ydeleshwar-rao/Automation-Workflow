"use client";

import { useState, useEffect } from "react";
import { FieldMeta, FieldOption } from "@/src/components/ui/dynamic-config-form";
import { getCustomFileds } from "@/src/components/work-flow/appEvents/leadconnector/apiIntegrations/customfileds";
import { getCustomFileds as getPipelines } from "@/src/components/work-flow/appEvents/leadconnector/apiIntegrations/pipeline";

export function useLeadConnectorData() {
  const [contactFields, setContactFields] = useState<FieldMeta[]>([]);
  const [actionFields, setActionFields] = useState<FieldMeta[]>([]);
  const [pipelineOptions, setPipelineOptions] = useState<FieldOption[]>([]);
  const [allStages, setAllStages] = useState<any[]>([]);
  const [variableItems, setVariableItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const safeJson = async (res: Response) => {
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      return null;
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Custom Fields
      try {
        const { contact, action } = await getCustomFileds();
        if (Array.isArray(contact)) {
          setContactFields(contact.map((field: any) => ({
            name: field.key || field.id,
            label: field.name,
            type: "text" as const,
          })));
        }
        if (Array.isArray(action)) {
          setActionFields(action.map((field: any) => ({
            name: field.name,
            label: field.label,
            type: field.type as any,
            required: field.required,
            placeholder: field.placeholder,
            options: field.options,
            optionsSource: field.optionsSource,
          })));
        }
      } catch (error) {
        console.error("Failed to load Custom Fields:", error);
      }

      // 2. Fetch Pipelines (includes stages from the backend)
      try {
        const pipeData = await getPipelines();
        if (!Array.isArray(pipeData)) {
        } else {
          setPipelineOptions(pipeData.map((pipeline: any) => ({ label: pipeline.name, value: pipeline.id })));

          const stages: any[] = [];
          pipeData.forEach((pipeline: any) => {
            if (pipeline.stages && Array.isArray(pipeline.stages)) {
              pipeline.stages.forEach((stage: any) => {
                stages.push({ ...stage, pipeline_id: stage.pipeline_id || pipeline.id });
              });
            }
          });
          setAllStages(stages);
        }
      } catch (error) {
        console.error("[Pipelines] Fetch failed:", error);
      }

    } catch (error) {
      console.error("Failed to load Lead Connector data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    contactFields,
    actionFields,
    pipelineOptions,
    allStages,
    variableItems,
    isLoading,
    refresh: loadData
  };
}
