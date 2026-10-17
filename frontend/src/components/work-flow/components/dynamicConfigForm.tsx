"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { SelectionPopup } from "../../ui/selection-popup";
import { ConfigField, ConfigTextArea } from "./ChipTextField";
import { getPopupPositionLeftOf, type PopupPosition } from "../appEvents/shared/configure/useVariablePicker";
import type { FieldFilterType, FieldMeta, FieldOption, FieldOptionValue } from "./dynamicConfigForm.types";

const DEFAULT_SELECT_PLACEHOLDER = "Choose value...";
const DEFAULT_TEXT_PLACEHOLDER = "Enter text or insert data...";
const DEFAULT_FILTER_TYPE: FieldFilterType = "All";
const NESTED_PATH_SEPARATOR = ".";

type FormValues = Record<string, unknown>;

const FIELD_FILTER_PREDICATES: Record<FieldFilterType, (field: FieldMeta, isFilled: boolean) => boolean> = {
  All: () => true,
  Required: (field) => Boolean(field.required),
  Optional: (field) => !field.required,
  Filled: (_field, isFilled) => isFilled,
  Empty: (_field, isFilled) => !isFilled,
};

export const FIELD_FILTER_OPTIONS = (Object.keys(FIELD_FILTER_PREDICATES) as FieldFilterType[]).map(
  (filterType) => ({ id: filterType, label: filterType })
);

function isFieldFilterType(value: string): value is FieldFilterType {
  return value in FIELD_FILTER_PREDICATES;
}

function isRecord(value: unknown): value is FormValues {
  return typeof value === "object" && value !== null;
}

/** React Hook Form stores dotted names as nested objects ("contact.first_name" → values.contact.first_name). */
function getFieldValue(values: FormValues, name: string): unknown {
  if (name in values) return values[name];
  return name
    .split(NESTED_PATH_SEPARATOR)
    .reduce<unknown>((parent, key) => (isRecord(parent) ? parent[key] : undefined), values);
}

function isFilledValue(value: unknown): boolean {
  return typeof value === "string" ? value.length > 0 : Boolean(value);
}

function filterFields(fields: FieldMeta[], values: FormValues, searchQuery: string, filterType: string): FieldMeta[] {
  const normalizedQuery = searchQuery.toLowerCase();
  const matchesFilter = FIELD_FILTER_PREDICATES[isFieldFilterType(filterType) ? filterType : DEFAULT_FILTER_TYPE];
  return fields.filter(
    (field) =>
      field.label.toLowerCase().includes(normalizedQuery) &&
      matchesFilter(field, isFilledValue(getFieldValue(values, field.name)))
  );
}

function ConfigFieldWrapper({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2 relative">
      <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

interface ChoiceFieldProps {
  label: string;
  required?: boolean;
  value: unknown;
  options: FieldOption[];
}

function ConfigRadioField({ label, required, value, onChange, options }: ChoiceFieldProps & {
  onChange: (nextValue: FieldOptionValue) => void;
}) {
  return (
    <ConfigFieldWrapper label={label} required={required}>
      <div className="flex gap-4 p-3 nm-inset rounded-xl h-11 items-center transition-all">
        {options.map((option) => (
          <label key={option.label} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name={label}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="w-4 h-4 accent-primary border-border focus:ring-primary/20"
            />
            <span className="text-sm font-medium text-foreground">{option.label}</span>
          </label>
        ))}
      </div>
    </ConfigFieldWrapper>
  );
}

interface ConfigSelectFieldProps extends ChoiceFieldProps {
  onChange: (nextValue: string) => void;
  onPlusClick: (event: React.MouseEvent) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

function ConfigSelectField({
  label,
  required,
  value,
  onChange,
  onPlusClick,
  onRefresh,
  isLoading,
  options,
  placeholder,
}: ConfigSelectFieldProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({ top: 0, right: 0 });

  const selectedOption = options.find((option) => String(option.value) === String(value));

  const handleOpenPopup = (event: React.MouseEvent) => {
    setPopupPosition(getPopupPositionLeftOf(event.currentTarget as HTMLElement));
    setIsPopupOpen(true);
  };

  const handlePlusClick = (event: React.MouseEvent) => {
    // Keep the click from also opening the options popup on the wrapper.
    event.stopPropagation();
    onPlusClick(event);
  };

  return (
    <ConfigFieldWrapper label={label} required={required}>
      <div className="relative group">
        <div
          onClick={handleOpenPopup}
          className={cn(
            "w-full h-11 px-4 nm-inset rounded-xl flex items-center justify-between cursor-pointer transition-all",
            isPopupOpen && "outline outline-1 outline-primary/40"
          )}
        >
          <span className={cn("text-sm font-medium", selectedOption ? "text-foreground" : "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : (placeholder || DEFAULT_SELECT_PLACEHOLDER)}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-[1px] h-4 bg-border mx-1" />
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            <button
              onClick={handlePlusClick}
              className="nm-btn w-7 h-7 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary transition-all"
              type="button"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <SelectionPopup
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onSelect={(item) => onChange(item.id)}
          onRefresh={onRefresh}
          isLoading={isLoading}
          title={`Select value for ${label} [Static]`}
          type="value"
          selectedId={String(value)}
          sections={[
            {
              id: "options",
              title: "Options",
              items: options.map((option) => ({ id: String(option.value), label: option.label })),
              defaultOpen: true,
            },
          ]}
          position={popupPosition}
        />
      </div>
    </ConfigFieldWrapper>
  );
}

function NoMatchingFieldsNotice() {
  return (
    <div className="p-10 text-center nm-inset rounded-2xl border-2 border-dashed border-border/40 animate-in zoom-in duration-300">
      <div className="w-12 h-12 nm-card rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-bold text-foreground mb-1">No matching fields found</p>
      <p className="text-xs text-muted-foreground">Try adjusting your search or filter keywords.</p>
    </div>
  );
}

interface DynamicConfigFormProps {
  fields: FieldMeta[];
  values: FormValues;
  onChange: (name: string, value: FieldOptionValue) => void;
  /** Opens the variable picker for a field's "+" button. */
  onPlusClick: (event: React.MouseEvent, fieldName: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  searchQuery?: string;
  filterType?: string;
}

/** Renders backend-described fields (text / textarea / select / radio), narrowed by search and filter. */
export function DynamicConfigForm({
  fields,
  values,
  onChange,
  onPlusClick,
  onRefresh,
  isLoading,
  searchQuery = "",
  filterType = DEFAULT_FILTER_TYPE,
}: DynamicConfigFormProps) {
  const filteredFields = useMemo(
    () => filterFields(fields, values, searchQuery, filterType),
    [searchQuery, filterType, fields, values]
  );

  const renderField = (field: FieldMeta) => {
    const value = getFieldValue(values, field.name);
    const handleChange = (nextValue: FieldOptionValue) => onChange(field.name, nextValue);
    const handlePlusClick = (event: React.MouseEvent) => onPlusClick(event, field.name);
    const options = field.options || [];

    if (field.type === "radio") {
      return <ConfigRadioField key={field.name} label={field.label} required={field.required} value={value} onChange={handleChange} options={options} />;
    }

    if (field.type === "select") {
      return (
        <ConfigSelectField
          key={field.name}
          label={field.label}
          required={field.required}
          value={value}
          onChange={handleChange}
          onPlusClick={handlePlusClick}
          onRefresh={onRefresh}
          isLoading={isLoading}
          options={options}
          placeholder={field.placeholder}
        />
      );
    }

    const TextInput = field.type === "textarea" ? ConfigTextArea : ConfigField;
    return (
      <TextInput
        key={field.name}
        label={field.label}
        required={field.required}
        value={String(value ?? "")}
        onChange={handleChange}
        onPlusClick={handlePlusClick}
        placeholder={field.placeholder || DEFAULT_TEXT_PLACEHOLDER}
      />
    );
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="space-y-6">
        {filteredFields.map(renderField)}
        {filteredFields.length === 0 && <NoMatchingFieldsNotice />}
      </div>
    </div>
  );
}
