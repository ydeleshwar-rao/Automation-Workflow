"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";

import { useLeadConnectorData } from "@/src/hooks/useLeadConnectorData";
import { DynamicConfigForm, FIELD_FILTER_OPTIONS } from "@/src/components/work-flow/components/dynamicConfigForm";
import type { FieldMeta, FieldOption, FieldOptionValue } from "@/src/components/work-flow/components/dynamicConfigForm.types";
import { SelectionPopup } from "@/src/components/ui/selection-popup";
import { WebhookVariablePicker } from "@/src/components/work-flow/components/WebhookVariablePicker";
import type { LeadConnectorPipelineStage } from "../apiIntegrations/leadConnectorApi";
import { formatCamelCaseLabel } from "../../shared/configure/fieldLabel";
import { useReportFormValidity, type FormValues } from "../../shared/configure/useReportFormValidity";
import { USER_EDIT_SET_VALUE_OPTIONS, useVariablePicker } from "../../shared/configure/useVariablePicker";

const VARIABLE_TOKEN_PATTERN = /\{\{map:/;
/** Saved keys restored even when they are plain strings (selects, flags, bookkeeping). */
const ALWAYS_RESTORED_KEYS = new Set(["pipelineId", "pipelineStageId", "markAsLead", "_formIsValid", "_pollingSubscriptionId"]);
const DEFAULT_FILTER_TYPE = "All";
const DEFAULT_SELECT_PLACEHOLDER = "Choose value...";
const FILTER_POPUP_OFFSET_PX = 8;
const FILTER_POPUP_GAP_PX = 10;
const NO_OPTIONS: FieldOption[] = [];

const CLOSED_FILTER_POPUP = { isOpen: false, position: { top: 0, right: 0 } };

/**
 * Only restore select/boolean fields and variable tokens from saved config.
 * Plain-string values (e.g. auto-mapped contact data like "WBT", "Test") are
 * intentionally dropped so text fields always start empty.
 */
function buildDefaultValues(savedConfig: FormValues): FormValues {
  const restoredValues = Object.fromEntries(
    Object.entries(savedConfig).filter(
      ([key, value]) => ALWAYS_RESTORED_KEYS.has(key) || typeof value !== "string" || VARIABLE_TOKEN_PATTERN.test(value)
    )
  );
  return { markAsLead: true, ...restoredValues };
}

function buildStageOptions(allStages: LeadConnectorPipelineStage[], pipelineId: unknown): FieldOption[] {
  if (!pipelineId) return NO_OPTIONS;
  return allStages
    .filter((stage) => stage.pipeline_id === pipelineId)
    .sort((firstStage, secondStage) => firstStage.position - secondStage.position)
    .map((stage) => ({ label: stage.name, value: stage.id }));
}

function buildTriggerFields(pipelineOptions: FieldOption[], stageOptions: FieldOption[]): FieldMeta[] {
  return [
    { name: "pipelineId", label: "In Pipeline", required: true, type: "select", placeholder: DEFAULT_SELECT_PLACEHOLDER, options: pipelineOptions },
    { name: "pipelineStageId", label: "Moved to Stage", type: "select", placeholder: DEFAULT_SELECT_PLACEHOLDER, options: stageOptions },
  ];
}

interface FieldSearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (searchQuery: string) => void;
  filterType: string;
  onFilterChange: (filterType: string) => void;
}

function FieldSearchAndFilterBar({ searchQuery, onSearchChange, filterType, onFilterChange }: FieldSearchAndFilterBarProps) {
  const [filterPopup, setFilterPopup] = useState(CLOSED_FILTER_POPUP);
  const closeFilterPopup = () => setFilterPopup((previousState) => ({ ...previousState, isOpen: false }));

  const handleFilterSelectOpen = (event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterPopup({
      isOpen: true,
      position: { top: rect.bottom + FILTER_POPUP_OFFSET_PX, right: window.innerWidth - rect.right + FILTER_POPUP_GAP_PX },
    });
  };

  return (
    <>
      <div className="flex gap-4 items-end px-1 pb-6 shrink-0">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-foreground">Search fields</label>
          <div className="nm-inset rounded-xl flex items-center gap-2 px-3 h-11">
            <Search className="shrink-0 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search fields"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
        <div className="w-[180px] space-y-2">
          <label className="text-xs font-bold text-foreground">Filter by</label>
          <div className="relative">
            <button
              type="button"
              onClick={handleFilterSelectOpen}
              className={cn(
                "w-full h-11 nm-inset rounded-xl flex items-center justify-between px-4 cursor-pointer transition-all",
                filterPopup.isOpen && "outline outline-1 outline-primary/40"
              )}
            >
              <span className="text-sm font-medium text-foreground">
                {FIELD_FILTER_OPTIONS.find((option) => option.id === filterType)?.label || DEFAULT_FILTER_TYPE}
              </span>
              <div className="w-9 h-7 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <ChevronDown className="w-4 h-4 text-primary-foreground" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <SelectionPopup
        isOpen={filterPopup.isOpen}
        onClose={closeFilterPopup}
        onSelect={(item) => { onFilterChange(item.id); closeFilterPopup(); }}
        selectedId={filterType}
        type="value"
        sections={[{ id: "filter", title: "Filter by", items: FIELD_FILTER_OPTIONS, defaultOpen: true }]}
        placeholder="Select filter type"
        title="Filter fields"
        position={filterPopup.position}
      />
    </>
  );
}

interface LeadConnectorConfigureStepProps {
  data: FormValues;
  onChange: (data: FormValues, isValid: boolean) => void;
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
  const { contactFields, actionFields, pipelineOptions, allStages, isLoading, refresh } = useLeadConnectorData();

  const [initialValues] = useState(() => buildDefaultValues(data));
  const { watch, setValue, getValues } = useForm<FormValues>({ mode: "onChange", defaultValues: initialValues });
  const formValues = watch();

  const pipelineStageOptions = useMemo(
    () => buildStageOptions(allStages, formValues.pipelineId),
    [allStages, formValues.pipelineId]
  );

  const fields: FieldMeta[] = useMemo(() => {
    if (isTrigger) return buildTriggerFields(pipelineOptions, pipelineStageOptions);
    // optionsSource names a dynamic list from the backend; other fields keep their own options (e.g. markAsLead radio).
    const optionsBySource: Record<string, FieldOption[]> = {
      pipelines: pipelineOptions,
      pipelineStages: pipelineStageOptions,
    };
    const resolvedActionFields = actionFields.map((field) => ({
      ...field,
      options: field.optionsSource ? optionsBySource[field.optionsSource] ?? NO_OPTIONS : field.options,
    }));
    return [...contactFields, ...resolvedActionFields];
  }, [isTrigger, contactFields, actionFields, pipelineOptions, pipelineStageOptions]);

  useReportFormValidity(fields, formValues, onChange);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState(DEFAULT_FILTER_TYPE);

  const getFieldValue = useCallback((fieldName: string) => getValues(fieldName), [getValues]);
  const setFieldValue = useCallback(
    (fieldName: string, value: FieldOptionValue) => setValue(fieldName, value, USER_EDIT_SET_VALUE_OPTIONS),
    [setValue]
  );
  const { openVariablePicker, pickerProps } = useVariablePicker({ getFieldValue, setFieldValue });

  const handlePlusClick = useCallback(
    (event: React.MouseEvent, fieldName: string) => openVariablePicker(event, fieldName, formatCamelCaseLabel(fieldName)),
    [openVariablePicker]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search and filter stay pinned above the scrolling fields */}
      {!isTrigger && (
        <FieldSearchAndFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterType={filterType}
          onFilterChange={setFilterType}
        />
      )}

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
              onChange={setFieldValue}
              onPlusClick={handlePlusClick}
              onRefresh={refresh}
              isLoading={isLoading}
              searchQuery={searchQuery}
              filterType={filterType}
            />
          </div>
        )}
      </div>

      <WebhookVariablePicker
        {...pickerProps}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
      />
    </div>
  );
}
