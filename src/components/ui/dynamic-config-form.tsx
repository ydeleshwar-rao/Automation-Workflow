"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, Plus } from "lucide-react";
import { ConfigField } from "./workflow-sections";
import { SelectionPopup, SelectionItem, SelectionSection } from "./selection-popup";
import { cn } from "@/src/lib/utils";

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
}

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
      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
        {label} {required && <span className="text-orange-600">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">{error}</p>}
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
       <div className="flex gap-4 p-3 bg-white border border-slate-200 rounded-lg h-11 items-center shadow-sm hover:border-slate-300 transition-all">
          {options.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="radio"
                name={label}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="w-4 h-4 text-[#4f46e5] border-slate-300 focus:ring-[#4f46e5]/20"
              />
              <span className="text-sm font-medium text-slate-700">{opt.label}</span>
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
            "w-full h-11 px-4 bg-white border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer transition-all hover:border-[#4f46e5] group shadow-sm",
            isPopupOpen && "ring-2 ring-[#4f46e5]/20 border-[#4f46e5]"
          )}
        >
          <span className={cn(
            "text-sm font-medium",
            selectedOption ? "text-slate-900" : "text-slate-400"
          )}>
            {selectedOption ? selectedOption.label : (placeholder || "Choose value...")}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-[1px] h-4 bg-slate-200 mx-1" />
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-[#4f46e5]" />
            {onPlusClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlusClick(e);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-slate-400 hover:text-[#4f46e5] hover:border-[#4f46e5] hover:bg-white transition-all shadow-sm"
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
  isLoading
}: DynamicConfigFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  
  const [popupState, setPopupState] = useState<PopupState>({
    isOpen: false,
    fieldName: null,
    position: { top: 0, right: 0 },
  });

  const filteredFields = useMemo(() => {
    return fields.filter(field => {
      const matchesSearch = field.label.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesFilter = true;
      const value = values[field.name];
      const isFilled = typeof value === 'string' ? value.length > 0 : !!value;

      if (filterType === "Required") matchesFilter = !!field.required;
      else if (filterType === "Optional") matchesFilter = !field.required;
      else if (filterType === "Filled") matchesFilter = isFilled;
      else if (filterType === "Empty") matchesFilter = !isFilled;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filterType, fields, values]);

  const handlePlusClick = (e: React.MouseEvent, fieldName: string) => {
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
      setFilterType(item.id);
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

  // Filter Selection Data
  const filterOptions = useMemo(() => [
    { id: "All", label: "All" },
    { id: "Required", label: "Required" },
    { id: "Optional", label: "Optional" },
    { id: "Filled", label: "Filled" },
    { id: "Empty", label: "Empty" },
  ], []);

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
      {/* Search and Filter Controls */}
      <div className="flex gap-4 items-end px-1">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-900">Search fields</label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#4f46e5] transition-colors" />
            <input 
              type="text"
              placeholder="Search fields"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-all text-sm font-medium text-slate-900 shadow-sm"
            />
          </div>
        </div>
        <div className="w-[180px] space-y-2">
          <label className="text-xs font-bold text-slate-900">Filter by</label>
          <div className="relative group">
            <button
              type="button"
              onClick={handleFilterSelectOpen}
              className={cn(
                "w-full h-11 px-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:border-[#4f46e5] group shadow-sm",
                popupState.isOpen && popupState.fieldName === "filterType" && "ring-2 ring-[#4f46e5]/20 border-[#4f46e5]"
              )}
            >
              <span className="text-sm font-medium text-slate-900">
                {filterOptions.find(opt => opt.id === filterType)?.label || "All"}
              </span>
              <div className="w-11 h-full bg-[#4f46e5] group-hover:bg-[#4338ca] rounded-r-xl flex items-center justify-center pointer-events-none transition-colors absolute right-0 top-0">
                <ChevronDown className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="px-1 border-b border-slate-100 pb-4">
        <p className="text-[11px] text-slate-400 font-medium">
           <span className="text-orange-600 font-bold">*</span> Indicates a required field
        </p>
      </div>

      <div className="space-y-6">
        {filteredFields.map((field) => {
          if (field.type === "radio") {
            return (
              <ConfigRadioField
                key={field.name}
                label={field.label}
                required={field.required}
                value={values[field.name]}
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
                value={values[field.name]}
                onChange={(val) => onChange(field.name, val)}
                onPlusClick={(e) => handlePlusClick(e, field.name)}
                onRefresh={onRefresh}
                isLoading={isLoading}
                options={field.options || []}
                placeholder={field.placeholder}
              />
            );
          }

          return (
            <ConfigField
              key={field.name}
              label={field.label}
              required={field.required}
              value={String(values[field.name] ?? "")}
              onChange={(val) => onChange(field.name, val)}
              onPlusClick={(e) => handlePlusClick(e, field.name)}
              placeholder={field.placeholder || "Enter text or insert data..."}
            />
          );
        })}
        {filteredFields.length === 0 && (
          <div className="p-10 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 animate-in zoom-in duration-300">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-50">
              <Search className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-900 mb-1">No matching fields found</p>
            <p className="text-xs text-slate-400">Try adjusting your search or filter keywords.</p>
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
