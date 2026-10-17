export type FieldOptionValue = string | number | boolean;

export interface FieldOption {
  label: string;
  value: FieldOptionValue;
}

/** A field described by backend metadata (e.g. LeadConnector custom/action fields). */
export interface FieldMeta {
  name: string;
  label: string;
  required?: boolean;
  type?: "text" | "textarea" | "select" | "radio";
  options?: FieldOption[];
  placeholder?: string;
  description?: string;
}

export type FieldFilterType = "All" | "Required" | "Optional" | "Filled" | "Empty";
