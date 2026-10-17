"use client";

import { useEffect } from "react";

interface RequirableField {
  name: string;
  required?: boolean;
}

export type FormValues = Record<string, unknown>;

export function areRequiredFieldsFilled(fields: readonly RequirableField[], formValues: FormValues): boolean {
  return fields
    .filter((field) => field.required)
    .every((requiredField) => Boolean(formValues[requiredField.name]));
}

/** Reports the current values and whether every required field is filled, on every change. */
export function useReportFormValidity(
  fields: readonly RequirableField[],
  formValues: FormValues,
  onChange: (data: FormValues, isValid: boolean) => void
): void {
  const serializedFormValues = JSON.stringify(formValues);

  useEffect(() => {
    onChange(formValues, areRequiredFieldsFilled(fields, formValues));
    // `formValues` is a fresh object each render and parents pass a new `onChange`
    // each render — depending on either would report in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedFormValues, fields]);
}
