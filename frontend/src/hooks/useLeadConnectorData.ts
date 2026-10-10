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
    } catch (e) {
      console.error("Failed to parse JSON:", e);
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
          setContactFields(contact.map((f: any) => ({
            name: f.key || f.id,
            label: f.name,
            type: "text" as const,
          })));
        }
        if (Array.isArray(action)) {
          setActionFields(action.map((f: any) => ({
            name: f.name,
            label: f.label,
            type: f.type as any,
            required: f.required,
            placeholder: f.placeholder,
            options: f.options,
            optionsSource: f.optionsSource,
          })));
        }
      } catch (err) {
        console.error("Failed to load Custom Fields:", err);
      }

      // 2. Fetch Pipelines (includes stages from the backend)
      try {
        const pipeData = await getPipelines();
        if (!Array.isArray(pipeData)) {
        } else {
          setPipelineOptions(pipeData.map((p: any) => ({ label: p.name, value: p.id })));

          const stages: any[] = [];
          pipeData.forEach((p: any) => {
            if (p.stages && Array.isArray(p.stages)) {
              p.stages.forEach((s: any) => {
                stages.push({ ...s, pipeline_id: s.pipeline_id || p.id });
              });
            }
          });
          setAllStages(stages);
        }
      } catch (err) {
        console.error("[Pipelines] Fetch failed:", err);
      }

    } catch (err) {
      console.error("Failed to load Lead Connector data:", err);
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
