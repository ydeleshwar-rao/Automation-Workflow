"use client";

import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";

import { useLeadConnectorData } from "@/src/hooks/useLeadConnectorData";
import { DynamicConfigForm, filterOptions } from "@/src/components/work-flow/components/dynamicConfigForm";
import { SelectionPopup } from "@/src/components/ui/selection-popup";
import {
  WebhookVariablePicker,
  VariableField,
} from "@/src/components/work-flow/components/WebhookVariablePicker";


interface LeadConnectorConfigureStepProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>, isValid: boolean) => void;
  webhookId?: string;
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
  isTrigger?: boolean;
}

export function LeadConnectorConfigureStep({
  data,
  onChange,
  webhookId,
  triggerTestPayload,
  triggerTestSamples,
  isTrigger,
}: LeadConnectorConfigureStepProps) {
  const {
    contactFields,
    actionFields,
    pipelineOptions,
    allStages,
    isLoading,
    refresh
  } = useLeadConnectorData();

  // Only restore select/boolean fields and variable tokens from saved config.
  // Plain-string values (e.g. auto-mapped contact data like "WBT", "Test") are
  // intentionally dropped so text fields always start empty.
  const TOKEN_RE = /\{\{map:/;
  const SELECT_FIELDS = new Set(["pipelineId", "pipelineStageId", "markAsLead", "_formIsValid", "_pollingSubscriptionId"]);
  const filteredData = useMemo(() => Object.fromEntries(
    Object.entries(data).filter(([k, v]) =>
      SELECT_FIELDS.has(k) || typeof v !== "string" || TOKEN_RE.test(v)
    )
  ), [data]);

  const {
    watch,
    setValue,
    getValues,
  } = useForm<Record<string, any>>({
    mode: "onChange",
    defaultValues: useMemo(() => ({ markAsLead: true, ...filteredData }), [filteredData]),
  });

  const formValues = watch();


  const pipelineStageOptions = useMemo(() => {
    if (!formValues.pipelineId) return [];
    return allStages
      .filter((s: any) => s.pipeline_id === formValues.pipelineId)
      .sort((a: any, b: any) => a.position - b.position)
      .map((s: any) => ({ label: s.name, value: s.id }));
  }, [allStages, formValues.pipelineId]);

  const resolvedActionFields = useMemo(() => {
    // Map each optionsSource value (from backend) to its corresponding options array
    const optionsBySource: Record<string, any[]> = {
      pipelines: pipelineOptions,
      pipelineStages: pipelineStageOptions,
    };

    return actionFields.map(field => ({
      ...field,
      // If the field uses a dynamic source, resolve it; otherwise keep its own options (e.g. markAsLead radio)
      options: (field as any).optionsSource
        ? optionsBySource[(field as any).optionsSource] ?? []
        : field.options,
    }));
  }, [actionFields, pipelineOptions, pipelineStageOptions]);

  const triggerFields = useMemo(
    () => [
      {
        name: "pipelineId",
        label: "In Pipeline",
        required: true,
        type: "select" as const,
        placeholder: "Choose value...",
        options: pipelineOptions,
      },
      {
        name: "pipelineStageId",
        label: "Moved to Stage",
        type: "select" as const,
        placeholder: "Choose value...",
        options: pipelineStageOptions,
      },
    ],
    [pipelineOptions, pipelineStageOptions]
  );

  const fields = useMemo(() => {
    if (isTrigger) return triggerFields;
    return [...contactFields, ...resolvedActionFields];
  }, [isTrigger, triggerFields, contactFields, resolvedActionFields]);

  useEffect(() => {
    // Simple validity check (required fields present)
    const requiredFields = fields.filter(f => f.required);
    const isValid = requiredFields.every(f => !!formValues[f.name]);

    const filledFields = fields.reduce<Record<string, any>>((acc, f) => {
      const val = formValues[f.name];
      if (val !== undefined && val !== "" && val !== null) acc[f.name] = val;
      return acc;
    }, {});

    onChange(formValues, isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues), fields]);

  // ── Search / Filter state ──────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterPopup, setFilterPopup] = useState<{
    isOpen: boolean;
    position: { top: number; right: number };
  }>({ isOpen: false, position: { top: 0, right: 0 } });

  const handleFilterSelectOpen = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterPopup({ isOpen: true, position: { top: rect.bottom + 8, right: window.innerWidth - rect.right + 10 } });
  };

  // ── Popup state ────────────────────────────────────────────────────────────

  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    fieldName: string | null;
    position: { top: number; right: number };
  }>({ isOpen: false, fieldName: null, position: { top: 0, right: 0 } });

  const activeFieldNameRef = useRef<string | null>(null);

  const handlePlusClick = useCallback((e: React.MouseEvent, fieldName: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    activeFieldNameRef.current = fieldName;
    setPopupState({
      isOpen: true,
      fieldName,
      position: { top: rect.top, right: window.innerWidth - rect.left + 10 },
    });
  }, []);

  const closePopup = useCallback(() => {
    setPopupState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const onSelectField = useCallback(
    (field: VariableField) => {
      const fieldName = activeFieldNameRef.current;
      if (!fieldName) return;
      const currentValue = getValues(fieldName) || "";
      const token = `{{map:${field.id}|${field.label}|${field.description}}}`;
      const newValue = `${currentValue}${token}`;
      setValue(fieldName, newValue, {
        shouldValidate: true,
        shouldDirty: true,
      });
      closePopup();
    },
    [getValues, setValue, closePopup]
  );

  const fieldLabel = popupState.fieldName
    ? popupState.fieldName.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filter Controls — sticky, never scrolls */}
      {!isTrigger && (
      <>
      <div className="flex gap-4 items-end px-1 pb-6 shrink-0">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-foreground">Search fields</label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search fields"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-sm"
            />
          </div>
        </div>
        <div className="w-[180px] space-y-2">
          <label className="text-xs font-bold text-foreground">Filter by</label>
          <div className="relative group">
            <button
              type="button"
              onClick={handleFilterSelectOpen}
              className={cn(
                "w-full h-11 px-4 bg-card border border-border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:border-primary group shadow-sm",
                filterPopup.isOpen && "ring-2 ring-primary/20 border-primary"
              )}
            >
              <span className="text-sm font-medium text-foreground">
                {filterOptions.find(opt => opt.id === filterType)?.label || "All"}
              </span>
              <div className="w-11 h-full bg-primary group-hover:bg-primary/90 rounded-r-xl flex items-center justify-center pointer-events-none transition-colors absolute right-0 top-0">
                <ChevronDown className="w-4 h-4 text-primary-foreground" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <SelectionPopup
        isOpen={filterPopup.isOpen}
        onClose={() => setFilterPopup(prev => ({ ...prev, isOpen: false }))}
        onSelect={(item) => { setFilterType(item.id); setFilterPopup(prev => ({ ...prev, isOpen: false })); }}
        selectedId={filterType}
        type="value"
        sections={[{ id: "filter", title: "Filter by", items: filterOptions, defaultOpen: true }]}
        placeholder="Select filter type"
        title="Filter fields"
        position={filterPopup.position}
      />
      </>
      )}

      {/* Scrollable fields area */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {isLoading && pipelineOptions.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">Loading LeadConnector data...</p>
          </div>
        ) : (
          <div>
            <DynamicConfigForm
              fields={fields}
              values={formValues}
              onChange={(name, val) => setValue(name, val, { shouldValidate: true, shouldDirty: true })}
              onPlusClick={handlePlusClick}
              onRefresh={refresh}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterType={filterType}
              onFilterChange={setFilterType}
            />
          </div>
        )}
      </div>

      <WebhookVariablePicker
        isOpen={popupState.isOpen}
        fieldLabel={fieldLabel}
        position={popupState.position}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
        onSelect={onSelectField}
        onClose={closePopup}
      />
    </div>
  );
}
