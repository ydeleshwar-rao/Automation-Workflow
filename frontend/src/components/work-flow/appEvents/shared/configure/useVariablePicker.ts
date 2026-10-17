"use client";

import { useCallback, useRef, useState } from "react";
import type React from "react";
import type { VariableField } from "@/src/components/work-flow/components/WebhookVariablePicker";

/** Horizontal gap between the clicked "+" button and the picker popup. */
const PICKER_GAP_PX = 10;

/** Options every user-driven form edit is applied with. */
export const USER_EDIT_SET_VALUE_OPTIONS = { shouldValidate: true, shouldDirty: true } as const;

export interface PopupPosition {
  top: number;
  right: number;
}

interface VariablePickerState {
  isOpen: boolean;
  fieldLabel: string;
  position: PopupPosition;
}

interface UseVariablePickerOptions<FieldName extends string> {
  getFieldValue: (fieldName: FieldName) => unknown;
  setFieldValue: (fieldName: FieldName, value: string) => void;
}

const CLOSED_PICKER_STATE: VariablePickerState = {
  isOpen: false,
  fieldLabel: "",
  position: { top: 0, right: 0 },
};

export function buildVariableToken(variable: VariableField): string {
  return `{{map:${variable.id}|${variable.label}|${variable.description}}}`;
}

/** Positions a popup to the left of the element that was clicked. */
export function getPopupPositionLeftOf(element: HTMLElement): PopupPosition {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, right: window.innerWidth - rect.left + PICKER_GAP_PX };
}

/**
 * State and handlers for the WebhookVariablePicker opened by a field's "+" button.
 * The selected variable is appended to the field as a {{map:…}} token.
 * Spread `pickerProps` onto <WebhookVariablePicker />.
 */
export function useVariablePicker<FieldName extends string>({
  getFieldValue,
  setFieldValue,
}: UseVariablePickerOptions<FieldName>) {
  const [pickerState, setPickerState] = useState<VariablePickerState>(CLOSED_PICKER_STATE);
  const activeFieldNameRef = useRef<FieldName | null>(null);

  const openVariablePicker = useCallback(
    (event: React.MouseEvent, fieldName: FieldName, fieldLabel: string) => {
      activeFieldNameRef.current = fieldName;
      setPickerState({
        isOpen: true,
        fieldLabel,
        position: getPopupPositionLeftOf(event.target as HTMLElement),
      });
    },
    []
  );

  const closeVariablePicker = useCallback(() => {
    setPickerState((previousState) => ({ ...previousState, isOpen: false }));
  }, []);

  const insertVariable = useCallback(
    (variable: VariableField) => {
      const fieldName = activeFieldNameRef.current;
      if (!fieldName) return;
      const currentValue = String(getFieldValue(fieldName) || "");
      setFieldValue(fieldName, `${currentValue}${buildVariableToken(variable)}`);
      closeVariablePicker();
    },
    [getFieldValue, setFieldValue, closeVariablePicker]
  );

  return {
    openVariablePicker,
    closeVariablePicker,
    pickerProps: {
      ...pickerState,
      onSelect: insertVariable,
      onClose: closeVariablePicker,
    },
  };
}
