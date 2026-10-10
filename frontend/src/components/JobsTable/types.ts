export type JobRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  category: string;
  date?: string;
  total_invoice_amount?: string | number;
  revenue?: string | number;
};

/** @deprecated Use JobRow */
export type MockJobRow = JobRow;

/**
 * Backend filter set for `/servicem8/getalljobs` (and the same shape for
 * commusoft/simpro). Mirrors the backend `resolveJobFilters` parser.
 *
 * `period` is a convenience for relative ranges; explicit `date_from` /
 * `date_to` override `period` when both are present (matches backend behaviour).
 */
export type JobsFilters = {
  period?: "week" | "month" | "year";
  date_from?: string;     // YYYY-MM-DD
  date_to?: string;       // YYYY-MM-DD
  status?: string;
  category_name?: string;
};

export interface JobsTabProps {
  jobs: JobRow[];
  loading: boolean;
}
