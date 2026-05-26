import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";
import { getActiveClientKey } from "@/src/store/localStorage";
import type { JobsDataProvider } from "./types";
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

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

const buildParams = (filters: JobsFilters): Record<string, string> => {
  const p: Record<string, string> = {};
  if (filters.period)        p.period = filters.period;
  if (filters.date_from)     p.date_from = filters.date_from;
  if (filters.date_to)       p.date_to = filters.date_to;
  if (filters.status)        p.status = filters.status;
  if (filters.category_uuid) p.category_uuid = filters.category_uuid;
  if (filters.category_name) p.category_name = filters.category_name;
  if (filters.queue_uuid)    p.queue_uuid = filters.queue_uuid;
  if (filters.queue_name)    p.queue_name = filters.queue_name;
  if (filters.staff_uuid)    p.staff_uuid = filters.staff_uuid;
  if (filters.company_uuid)  p.company_uuid = filters.company_uuid;
  return p;
};

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

export const servicem8Provider: JobsDataProvider = {
  appId: "servicem8",
  label: "ServiceM8",

  async fetchJobs(filters) {
    const { data } = await axiosInstance.get(API_ROUTES.SERVICEM8.GET_ALL_JOBS, {
      headers: { clientkey: getActiveClientKey() ?? "" },
      params: buildParams(filters),
    });
    // ApiResponse wraps payload as { success, message, data: { success, data: [...] } }
    // Each element is a contact/site group containing a `jobs[]` array.
    const groups: ServiceM8ContactBlock[] =
      data?.data?.data ?? data?.data ?? [];
    if (!Array.isArray(groups)) return [];
    const normalized: NormalizedJob[] = [];
    for (const block of groups) {
      for (const item of block.jobs ?? []) {
        const n = normalize(block, item);
        if (n.id) normalized.push(n);
      }
    }
    return normalized;
  },
};
