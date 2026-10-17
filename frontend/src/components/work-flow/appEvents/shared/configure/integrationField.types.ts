/** One choice of a select field on an integration's Configure step. */
export interface IntegrationFieldOption {
  label: string;
  value: string;
}

/** A field shown on an integration's Configure step for a given event. */
export interface IntegrationFieldDef {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  /** Static choices; only used when type is "select". */
  options?: IntegrationFieldOption[];
}

/** action_key / trigger key → the fields its Configure step shows. */
export type IntegrationFieldsByEvent = Record<string, IntegrationFieldDef[]>;

/** Select options loaded at runtime, keyed by the field name they feed. */
export type IntegrationOptionsByFieldName = Partial<Record<string, IntegrationFieldOption[]>>;

export function doesEventHaveField(
  fieldsByEvent: IntegrationFieldsByEvent,
  eventKey: string | null | undefined,
  fieldName: string
): boolean {
  if (!eventKey) return false;
  return (fieldsByEvent[eventKey] ?? []).some((field) => field.name === fieldName);
}
