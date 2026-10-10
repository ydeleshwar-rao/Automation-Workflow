"use client";

import { useState, useEffect } from "react";
import { FieldMeta } from "@/src/components/ui/dynamic-config-form";
import { getServiceM8CustomFields } from "@/src/components/work-flow/appEvents/serviceM8/apiIntegrations/sm8CustomFields";

export function useServiceM8Data(selectedEvent?: string | null) {
  const [contactFields, setContactFields] = useState<FieldMeta[]>([]);
  const [actionFields, setActionFields] = useState<FieldMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { contact, action } = await getServiceM8CustomFields(selectedEvent ?? undefined);

      if (Array.isArray(contact)) {
        setContactFields(
          contact.map((f: any) => ({
            name: f.key || f.id,
            label: f.name,
            type: "text" as const,
          }))
        );
      }

      if (Array.isArray(action)) {
        setActionFields(
          action.map((f: any) => ({
            name: f.name,
            label: f.label,
            type: f.type as any,
            required: f.required,
            placeholder: f.placeholder,
            options: f.options,
            optionsSource: f.optionsSource,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load ServiceM8 data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  return {
    contactFields,
    actionFields,
    isLoading,
    refresh: loadData,
  };
}
