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
          contact.map((field: any) => ({
            name: field.key || field.id,
            label: field.name,
            type: "text" as const,
          }))
        );
      }

      if (Array.isArray(action)) {
        setActionFields(
          action.map((field: any) => ({
            name: field.name,
            label: field.label,
            type: field.type as any,
            required: field.required,
            placeholder: field.placeholder,
            options: field.options,
            optionsSource: field.optionsSource,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load ServiceM8 data:", error);
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
