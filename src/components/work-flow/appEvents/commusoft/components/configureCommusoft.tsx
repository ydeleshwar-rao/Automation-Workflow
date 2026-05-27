"use client";

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/src/lib/utils";

import { flattenWebhookPayload } from "@/src/components/template/autoMapper";
import { useAutoMap } from "@/src/components/template/useAutoMap";

import { ConfigField, ConfigTextArea } from "@/src/components/work-flow/components/ChipTextField";
import { SelectionPopup } from "@/src/components/ui/selection-popup";
import {
  WebhookVariablePicker,
  VariableField,
} from "@/src/components/work-flow/components/WebhookVariablePicker";

import { COMMUSOFT_EVENT_FIELDS, CommusoftFieldDef } from "./configure/fields";
import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";
import { useCommusoftStatus } from "@/src/components/app-connections/commusoft/hooks/useCommusoftStatus";
import { Link2 } from "lucide-react";

// ─── Select field ─────────────────────────────────────────────────────────────

function CommusoftSelectField({
  field,
  value,
  onChange,
  onPlusClick,
}: {
  field: CommusoftFieldDef;
  value: string;
  onChange: (val: string) => void;
  onPlusClick: (e: React.MouseEvent) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, right: 0 });

  const selectedOption = field.options?.find((o) => o.value === value);

  const handleOpen = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupPos({ top: rect.top, right: window.innerWidth - rect.left + 10 });
    setIsOpen(true);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative group">
        <div
          onClick={handleOpen}
          className={cn(
            "w-full h-11 px-4 bg-card border border-border rounded-lg flex items-center justify-between cursor-pointer transition-all hover:border-primary shadow-sm",
            isOpen && "ring-2 ring-primary/20 border-primary"
          )}
        >
          <span className={cn("text-sm font-medium", selectedOption ? "text-foreground" : "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : (field.placeholder || "Choose value...")}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-[1px] h-4 bg-border mx-1" />
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPlusClick(e); }}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-border bg-muted text-muted-foreground hover:text-primary hover:border-primary hover:bg-background transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <SelectionPopup
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSelect={(item) => { onChange(item.id); setIsOpen(false); }}
          type="value"
          selectedId={value}
          sections={[{
            id: "options",
            title: field.label,
            items: (field.options || []).map((o) => ({ id: o.value, label: o.label })),
            defaultOpen: true,
          }]}
          title={`Select ${field.label}`}
          position={popupPos}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CommusoftConfigureStepProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>, isValid: boolean) => void;
  webhookId?: string;
  selectedEvent?: string | null;
  /** From StepContext — live trigger payload (canvas state), not Redux nodes */
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
}

export function CommusoftConfigureStep({
  data,
  onChange,
  webhookId,
  selectedEvent,
  triggerTestPayload,
  triggerTestSamples,
}: CommusoftConfigureStepProps) {
  const { connected: isCommusoftConnected, isLoading: isCheckingConnection } = useCommusoftStatus();

  const [customerTypeOptions, setCustomerTypeOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (!isCommusoftConnected) return;
    axiosInstance
      .get(API_ROUTES.COMMUSOFT.CUSTOMER_TYPES)
      .then((res) => {
        const descriptions: string[] = res.data?.data ?? [];
        // Value must equal the raw description — backend does an ilike lookup
        // against commusoft_customertype.description, and ilike does not
        // normalise underscores vs spaces. Transforming breaks the lookup.
        setCustomerTypeOptions(
          descriptions.map((d) => ({ label: d, value: d }))
        );
      })
      .catch(() => {});
  }, [isCommusoftConnected]);

  const fields: CommusoftFieldDef[] = useMemo(() => {
    const base = selectedEvent ? COMMUSOFT_EVENT_FIELDS[selectedEvent] ?? [] : [];
    return base.map((f) =>
      f.name === "customer_type" && f.type === "select"
        ? { ...f, options: customerTypeOptions }
        : f
    );
  }, [selectedEvent, customerTypeOptions]);

  const fieldKeys = useMemo(() => fields.map((f) => f.name), [fields]);

  const webhookFlat = useMemo(() => {
    const raw = triggerTestPayload;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return flattenWebhookPayload(raw as Record<string, unknown>);
  }, [triggerTestPayload]);

  const cleanedFlat = Object.fromEntries(
    Object.entries(webhookFlat).map(([k, v]) => [
      k.replace(/^[\w-]+?__/, ""),
      v,
    ]),
  );

  console.log("PAYLOAD KEYS:", Object.keys(cleanedFlat));

  const auto = useAutoMap(fieldKeys, cleanedFlat);
  const webhookPayloadKey = useMemo(() => JSON.stringify(webhookFlat), [webhookFlat]);
  const appliedPayloadRef = useRef<string | null>(null);

  const { watch, setValue, getValues } = useForm<Record<string, any>>({
    mode: "onChange",
    defaultValues: useMemo(() => ({ ...data }), []),
  });

  const formValues = watch();

  useEffect(() => {
    if (!auto.isAutoMapped) return;
    if (!webhookPayloadKey || webhookPayloadKey === "{}") return;
    if (appliedPayloadRef.current === webhookPayloadKey) return;
    appliedPayloadRef.current = webhookPayloadKey;

    fieldKeys.forEach((key) => {
      const suggested = auto.formValues[key];
      if (suggested === undefined || suggested === null || String(suggested) === "") return;
      const current = getValues(key);
      const curStr = current === undefined || current === null ? "" : String(current).trim();
      if (curStr !== "") return;
      setValue(key, String(suggested), { shouldValidate: true, shouldDirty: false });
    });
  }, [
    webhookPayloadKey,
    auto.isAutoMapped,
    auto.formValues,
    fieldKeys,
    getValues,
    setValue,
  ]);

  useEffect(() => {
    const raw = auto.formValues.customer_type;
    if (auto.isAutoMapped && raw != null && raw !== "" && customerTypeOptions.length > 0) {
      const customerType = String(raw);
      const validValues = customerTypeOptions.map((o) => o.value);
      if (!validValues.includes(customerType)) {
        setValue("customer_type", customerTypeOptions[0].value);
      }
    }
  }, [auto.isAutoMapped, auto.formValues.customer_type, customerTypeOptions, setValue]);

  // Notify parent on every change
  useEffect(() => {
    const requiredFields = fields.filter((f) => f.required);
    const isValid = requiredFields.every((f) => !!formValues[f.name]);
    onChange(formValues, isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues), fields]);

  // ── Variable picker ──────────────────────────────────────────────────────
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    fieldName: string | null;
    position: { top: number; right: number };
  }>({ isOpen: false, fieldName: null, position: { top: 0, right: 0 } });

  const activeFieldRef = useRef<string | null>(null);

  const handlePlusClick = useCallback((e: React.MouseEvent, fieldName: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    activeFieldRef.current = fieldName;
    setPopupState({
      isOpen: true,
      fieldName,
      position: { top: rect.top, right: window.innerWidth - rect.left + 10 },
    });
  }, []);

  const closePopup = useCallback(() => {
    setPopupState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const onSelectVariable = useCallback(
    (variable: VariableField) => {
      const fieldName = activeFieldRef.current;
      if (!fieldName) return;
      const current = getValues(fieldName) || "";
      const token = `{{map:${variable.id}|${variable.label}|${variable.description}}}`;
      setValue(fieldName, `${current}${token}`, { shouldValidate: true, shouldDirty: true });
      closePopup();
    },
    [getValues, setValue, closePopup]
  );

  const popupFieldLabel = popupState.fieldName
    ? popupState.fieldName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  // ── Not connected to Commusoft ────────────────────────────────────────────
  if (isCheckingConnection) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
        <div className="w-6 h-6 rounded-full border-2 border-border border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Checking Commusoft connection...</p>
      </div>
    );
  }

  if (!isCommusoftConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4 animate-in fade-in duration-500">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Link2 className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold text-foreground">Connect to Commusoft first</p>
          <p className="text-xs text-muted-foreground max-w-[260px]">
            Go to Connections and connect your Commusoft account before configuring this step.
          </p>
        </div>
      </div>
    );
  }

  // ── No event selected ────────────────────────────────────────────────────
  if (!selectedEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
        <p className="text-sm font-bold text-foreground">No action event selected</p>
        <p className="text-xs text-muted-foreground">Go back to Setup and choose an action event first.</p>
      </div>
    );
  }

  // ── No fields defined for this event ────────────────────────────────────
  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
        <p className="text-sm font-bold text-foreground">No fields for this event</p>
        <p className="text-xs text-muted-foreground">Fields for &quot;{selectedEvent}&quot; have not been configured yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <form className="space-y-6">
        {fields.map((field) => {
          if (field.type === "select") {
            return (
              <div key={field.name}>
                <CommusoftSelectField
                  field={field}
                  value={formValues[field.name] ?? ""}
                  onChange={(val) => setValue(field.name, val, { shouldValidate: true, shouldDirty: true })}
                  onPlusClick={(e) => handlePlusClick(e, field.name)}
                />
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={field.name}>
                <ConfigTextArea
                  label={field.label}
                  required={field.required}
                  value={String(formValues[field.name] ?? "")}
                  onChange={(val) => setValue(field.name, val, { shouldValidate: true, shouldDirty: true })}
                  onPlusClick={(e) => handlePlusClick(e, field.name)}
                  placeholder={field.placeholder || "Enter text or insert data..."}
                />
              </div>
            );
          }

          // default: text
          return (
            <div key={field.name}>
              <ConfigField
                label={field.label}
                required={field.required}
                value={String(formValues[field.name] ?? "")}
                onChange={(val) => setValue(field.name, val, { shouldValidate: true, shouldDirty: true })}
                onPlusClick={(e) => handlePlusClick(e, field.name)}
                placeholder={field.placeholder || "Enter text or insert data..."}
              />
            </div>
          );
        })}
      </form>

      <WebhookVariablePicker
        isOpen={popupState.isOpen}
        fieldLabel={popupFieldLabel}
        position={popupState.position}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
        onSelect={onSelectVariable}
        onClose={closePopup}
      />
    </div>
  );
}
