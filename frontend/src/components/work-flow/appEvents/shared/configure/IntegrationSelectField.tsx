"use client";

import React, { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { SelectionPopup } from "@/src/components/ui/selection-popup";

import type { IntegrationFieldDef } from "./integrationField.types";
import { getPopupPositionLeftOf, type PopupPosition } from "./useVariablePicker";

const DEFAULT_SELECT_PLACEHOLDER = "Choose value...";
const OPTIONS_SECTION_ID = "options";

interface IntegrationSelectFieldProps {
  field: IntegrationFieldDef;
  value: string;
  onChange: (value: string) => void;
  onPlusClick: (event: React.MouseEvent) => void;
}

/** A select field with a "+" button for inserting a trigger variable instead of a fixed choice. */
export function IntegrationSelectField({ field, value, onChange, onPlusClick }: IntegrationSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({ top: 0, right: 0 });

  const options = field.options ?? [];
  const selectedOption = options.find((option) => option.value === value);

  const handleOpen = (event: React.MouseEvent) => {
    setPopupPosition(getPopupPositionLeftOf(event.currentTarget as HTMLElement));
    setIsOpen(true);
  };

  const handlePlusClick = (event: React.MouseEvent) => {
    // Keep the click from also opening the options popup on the wrapper.
    event.stopPropagation();
    onPlusClick(event);
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
            {selectedOption ? selectedOption.label : (field.placeholder || DEFAULT_SELECT_PLACEHOLDER)}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-[1px] h-4 bg-border mx-1" />
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            <button
              type="button"
              onClick={handlePlusClick}
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
            id: OPTIONS_SECTION_ID,
            title: field.label,
            items: options.map((option) => ({ id: option.value, label: option.label })),
            defaultOpen: true,
          }]}
          title={`Select ${field.label}`}
          position={popupPosition}
        />
      </div>
    </div>
  );
}
