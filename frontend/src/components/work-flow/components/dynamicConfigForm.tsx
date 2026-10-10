"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { SelectionItem, SelectionPopup, SelectionSection } from "../../ui/selection-popup";
import { ConfigField, ConfigTextArea } from "./ChipTextField";

export interface FieldOption {
  label: string;
  value: any;
}

export interface FieldMeta {
  name: string;
  label: string;
  required?: boolean;
  type?: "text" | "textarea" | "select" | "radio";
  options?: FieldOption[];
  placeholder?: string;
  description?: string;
}

interface DynamicConfigFormProps {
  fields: FieldMeta[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  variableSections?: SelectionSection[];
  onVariableSelect?: (fieldName: string, variable: SelectionItem) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  /** When provided, overrides the internal variable popup — called instead of opening SelectionPopup */
  onPlusClick?: (e: React.MouseEvent, fieldName: string) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  filterType?: string;
  onFilterChange?: (val: string) => void;
}

function getFieldValue(values: Record<string, any>, name: string): any {
  // React Hook Form stores dotted names as nested objects (e.g. "contact.first_name" → values.contact.first_name)
  // Try flat key first, then resolve as nested path
  if (name in values) return values[name];
  return name.split(".").reduce((acc, key) => acc?.[key], values);
}

export const filterOptions = [
  { id: "All", label: "All" },
  { id: "Required", label: "Required" },
  { id: "Optional", label: "Optional" },
  { id: "Filled", label: "Filled" },
  { id: "Empty", label: "Empty" },
];

// Sub-components
function ConfigFieldWrapper({ 
  label, 
  required, 
  children, 
  error 
}: { 
  label: string; 
  required?: boolean; 
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-2 relative">
      <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1 duration-200">{error}</p>}
    </div>
  );
}

function ConfigRadioField({ 
  label, 
  required, 
  value, 
  onChange, 
  options, 
  error 
}: { 
  label: string; 
  required?: boolean; 
  value: any; 
  onChange: (val: any) => void;
  options: FieldOption[];
  error?: string;
}) {
  return (
    <ConfigFieldWrapper label={label} required={required} error={error}>
       <div className="flex gap-4 p-3 nm-inset rounded-xl h-11 items-center transition-all">
          {options.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name={label}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="w-4 h-4 accent-primary border-border focus:ring-primary/20"
              />
              <span className="text-sm font-medium text-foreground">{opt.label}</span>
            </label>
          ))}
       </div>
    </ConfigFieldWrapper>
  );
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
  error 
}: { 
  label: string; 
  required?: boolean; 
  value: any; 
  onChange: (val: any) => void;
  onPlusClick?: (e: React.MouseEvent) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  options: FieldOption[];
  placeholder?: string;
  error?: string;
}) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, right: 0 });

  const selectedOption = options.find(o => String(o.value) === String(value));

  const handleOpenPopup = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupPos({ top: rect.top, right: window.innerWidth - rect.left + 10 });
    setIsPopupOpen(true);
  };

  return (
    <ConfigFieldWrapper label={label} required={required} error={error}>
      <div className="relative group">
        <div
          onClick={handleOpenPopup}
          className={cn(
            "w-full h-11 px-4 nm-inset rounded-xl flex items-center justify-between cursor-pointer transition-all",
            isPopupOpen && "outline outline-1 outline-primary/40"
          )}
        >
          <span className={cn(
            "text-sm font-medium",
            selectedOption ? "text-foreground" : "text-muted-foreground"
          )}>
            {selectedOption ? selectedOption.label : (placeholder || "Choose value...")}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-[1px] h-4 bg-border mx-1" />
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            {onPlusClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlusClick(e);
                }}
                className="nm-btn w-7 h-7 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary transition-all"
                type="button"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
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
              items: options.map(o => ({ id: String(o.value), label: o.label })),
              defaultOpen: true
            }
          ]}
          position={popupPos}
        />
      </div>
    </ConfigFieldWrapper>
  );
}

interface PopupState {
  isOpen: boolean;
  fieldName: string | null;
  position: { top: number; right: number };
  selectedId?: string;
  placeholder?: string;
  showTabs?: boolean;
  type?: "variable" | "value";
  sections?: SelectionSection[];
  title?: string;
}

export function DynamicConfigForm({
  fields,
  values,
  onChange,
  variableSections,
  onVariableSelect,
  onRefresh,
  isLoading,
  onPlusClick,
  searchQuery = "",
  onSearchChange,
  filterType = "All",
  onFilterChange,
}: DynamicConfigFormProps) {
  
  const [popupState, setPopupState] = useState<PopupState>({
    isOpen: false,
    fieldName: null,
    position: { top: 0, right: 0 },
  });

  const filteredFields = useMemo(() => {
    return fields.filter(field => {
      const matchesSearch = field.label.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesFilter = true;
      const value = getFieldValue(values, field.name);
      const isFilled = typeof value === 'string' ? value.length > 0 : !!value;

      if (filterType === "Required") matchesFilter = !!field.required;
      else if (filterType === "Optional") matchesFilter = !field.required;
      else if (filterType === "Filled") matchesFilter = isFilled;
      else if (filterType === "Empty") matchesFilter = !isFilled;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filterType, fields, values]);

  const handlePlusClick = (e: React.MouseEvent, fieldName: string) => {
    if (onPlusClick) {
      onPlusClick(e, fieldName);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupState({
      isOpen: true,
      fieldName,
      position: { top: rect.top, right: window.innerWidth - rect.left + 10 },
      type: "variable",
      sections: variableSections || [],
      title: "Insert Variable",
      showTabs: true,
      placeholder: "Search variables"
    });
  };

  const handlePopupSelect = (item: SelectionItem) => {
    if (popupState.fieldName === "filterType") {
      onFilterChange?.(item.id);
      setPopupState(prev => ({ ...prev, isOpen: false }));
      return;
    }

    if (popupState.fieldName) {
      if (onVariableSelect) {
        onVariableSelect(popupState.fieldName, item);
      } else {
        const currentValue = values[popupState.fieldName] || "";
        onChange(popupState.fieldName, `${currentValue}{{${item.label}}}`);
      }
    }
  };

  const handleFilterSelectOpen = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupState({
      isOpen: true,
      fieldName: "filterType",
      position: { top: rect.bottom + 8, right: window.innerWidth - rect.right + 10 },
      selectedId: filterType,
      type: "value",
      sections: [{ id: "filter", title: "Filter by", items: filterOptions, defaultOpen: true }],
      placeholder: "Select filter type",
      title: "Filter fields"
    });
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="space-y-6">
        {filteredFields.map((field) => {
          if (field.type === "radio") {
            return (
              <ConfigRadioField
                key={field.name}
                label={field.label}
                required={field.required}
                value={getFieldValue(values, field.name)}
                onChange={(val) => onChange(field.name, val)}
                options={field.options || []}
              />
            );
          }

          if (field.type === "select") {
            return (
              <ConfigSelectField
                key={field.name}
                label={field.label}
                required={field.required}
                value={getFieldValue(values, field.name)}
                onChange={(val) => onChange(field.name, val)}
                onPlusClick={(e) => handlePlusClick(e, field.name)}
                onRefresh={onRefresh}
                isLoading={isLoading}
                options={field.options || []}
                placeholder={field.placeholder}
              />
            );
          }

          if (field.type === "textarea") {
            return (
              <ConfigTextArea
                key={field.name}
                label={field.label}
                required={field.required}
                value={String(getFieldValue(values, field.name) ?? "")}
                onChange={(val) => onChange(field.name, val)}
                onPlusClick={(e) => handlePlusClick(e, field.name)}
                placeholder={field.placeholder || "Enter text or insert data..."}
              />
            );
          }

          return (
            <ConfigField
              key={field.name}
              label={field.label}
              required={field.required}
              value={String(getFieldValue(values, field.name) ?? "")}
              onChange={(val) => onChange(field.name, val)}
              onPlusClick={(e) => handlePlusClick(e, field.name)}
              placeholder={field.placeholder || "Enter text or insert data..."}
            />
          );
        })}
        {filteredFields.length === 0 && (
          <div className="p-10 text-center nm-inset rounded-2xl border-2 border-dashed border-border/40 animate-in zoom-in duration-300">
            <div className="w-12 h-12 nm-card rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">No matching fields found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search or filter keywords.</p>
          </div>
        )}
      </div>

      <SelectionPopup
        isOpen={popupState.isOpen}
        onClose={() => setPopupState(prev => ({ ...prev, isOpen: false }))}
        onSelect={handlePopupSelect}
        items={[]}
        sections={popupState.sections || []}
        title={popupState.title || "Insert Variable"}
        position={popupState.position}
        showTabs={popupState.showTabs}
        type={popupState.type}
        selectedId={popupState.selectedId}
        placeholder={popupState.placeholder}
      />
    </div>
  );
}
