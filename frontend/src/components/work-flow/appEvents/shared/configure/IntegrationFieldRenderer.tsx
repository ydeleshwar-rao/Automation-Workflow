"use client";

import React from "react";
import { ConfigField, ConfigTextArea } from "@/src/components/work-flow/components/ChipTextField";

import type { IntegrationFieldDef } from "./integrationField.types";
import { IntegrationSelectField } from "./IntegrationSelectField";

const DEFAULT_TEXT_PLACEHOLDER = "Enter text or insert data...";

interface IntegrationFieldRendererProps {
  field: IntegrationFieldDef;
  value: unknown;
  onChange: (value: string) => void;
  onPlusClick: (event: React.MouseEvent) => void;
}

/** Renders one Configure field as a select, textarea or single-line text input. */
export function IntegrationFieldRenderer({ field, value, onChange, onPlusClick }: IntegrationFieldRendererProps) {
  const textValue = String(value ?? "");

  if (field.type === "select") {
    return <IntegrationSelectField field={field} value={textValue} onChange={onChange} onPlusClick={onPlusClick} />;
  }

  const TextInput = field.type === "textarea" ? ConfigTextArea : ConfigField;
  return (
    <TextInput
      label={field.label}
      required={field.required}
      value={textValue}
      onChange={onChange}
      onPlusClick={onPlusClick}
      placeholder={field.placeholder || DEFAULT_TEXT_PLACEHOLDER}
    />
  );
}
