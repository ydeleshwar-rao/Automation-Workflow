import { API_ROUTES } from "@/src/constants/api.constants";
import type { JobsDataProvider } from "./types";
import { buildJobsQueryParams, toNumber, unwrapJobsPayload } from "./jobsProvider.helpers";
import type { JobsFilters, NormalizedJob } from "@/src/types/dashboard.types";

/**
 * Backend `/servicem8/getalljobs` returns:
 *   { success: true, data: ServiceM8ContactBlock[] }
 * Each block groups a contact + site with a `jobs[]` array. Each job item
 * inside that array carries `job`, `engineer`, `payment`, `activities`, etc.
 * We flatten the groups and collapse the nested fields into `NormalizedJob`.
 */
interface ServiceM8JobItem {
  job?: {
    generated_job_id?: string | null;
    status?: string | null;
    date?: string | null;
    completion_date?: string | null;
    category?: string | null;
    total_invoice_amount?: string | null;
    job_description?: string | null;
    job_address?: string | null;
    quote_date?: string | null;
    purchase_order_number?: string | null;
  } | null;
  engineer?: { name?: string | null; uuid?: string | null } | null;
  payment?: {
    status?: string | null;
    total_invoice?: string | null;
    amount?: string | null;
    ready_to_invoice?: boolean;
    payments?: unknown[];
  } | null;
  activities?: Array<{
    start_date?: string | null;
    end_date?: string | null;
    scheduled?: number;
  }>;
  jobmaterials?: unknown[];
  notes?: unknown[];
}

interface ServiceM8ContactBlock {
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    type?: string | null;
    is_primary_contact?: string | null;
  } | null;
  site?: {
    name?: string | null;
    address?: string | null;
    address_street?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_postcode?: string | null;
    address_country?: string | null;
  } | null;
  head_office?: Record<string, unknown> | null;
  job_count?: number;
  jobs?: ServiceM8JobItem[];
}

const SUPPORTED_FILTER_KEYS: readonly (keyof JobsFilters)[] = [
  "period",
  "date_from",
  "date_to",
  "status",
  "category_uuid",
  "category_name",
  "queue_uuid",
  "queue_name",
  "staff_uuid",
  "company_uuid",
];

const normalize = (block: ServiceM8ContactBlock, item: ServiceM8JobItem): NormalizedJob => {
  const job = item.job ?? {};
  const engineer = item.engineer ?? null;
  const payment = item.payment ?? null;
  // Prefer payment.total_invoice (already invoiced) — fall back to job.total_invoice_amount.
  const revenue = toNumber(payment?.total_invoice ?? job?.total_invoice_amount);

  return {
    id: String(job.generated_job_id ?? ""),
    status: String(job.status ?? "Unknown") || "Unknown",
    date: job.date ?? null,
    completion_date: job.completion_date ?? null,
    category: job.category ?? null,
    revenue,
    engineer_id: null,
    engineer_name: engineer?.name ?? null,
    customer_name: block.site?.name ?? block.contact?.name ?? null,
    description: job.job_description ?? null,
    raw: { ...block, _job_item: item },
  };
};

// Each element is a contact/site group containing a `jobs[]` array — flatten it.
const normaliseContactBlocks = (contactBlocks: ServiceM8ContactBlock[]): NormalizedJob[] =>
  contactBlocks
    .flatMap((contactBlock) => (contactBlock.jobs ?? []).map((jobItem) => normalize(contactBlock, jobItem)))
    .filter((normalizedJob) => normalizedJob.id);

export const servicem8Provider: JobsDataProvider = {
  appId: "servicem8",
  label: "ServiceM8",

  buildJobsRequest: (filters) => ({
    url: API_ROUTES.SERVICEM8.GET_ALL_JOBS,
    params: buildJobsQueryParams(filters, SUPPORTED_FILTER_KEYS),
  }),

  normaliseJobs: (response) =>
    normaliseContactBlocks(unwrapJobsPayload<ServiceM8ContactBlock>(response)),
};
