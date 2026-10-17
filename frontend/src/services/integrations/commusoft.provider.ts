import { API_ROUTES } from "@/src/constants/api.constants";
import type { JobsDataProvider } from "./types";
import { buildJobsQueryParams, toNumber, unwrapJobsPayload } from "./jobsProvider.helpers";
import type { JobsFilters, NormalizedJob } from "@/src/types/dashboard.types";

/**
 * Backend `/commusoft/getalljobs` returns:
 *   { success: true, data: { success: true, data: JobDetailDataBlock[] } }
 * Each block mirrors the ServiceM8 shape so the same aggregation layer works
 * for both integrations.
 */
interface CommusoftBlock {
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
  } | null;
  site?: {
    name?: string | null;
    address?: string | null;
  } | null;
  head_office?: {
    name?: string | null;
  } | null;
  job?: {
    generated_job_id?: string | null;
    status?: string | null;
    date?: string | null;
    completion_date?: string | null;
    category?: string | null;
    total_invoice_amount?: string | null;
    job_description?: string | null;
  } | null;
  engineer?: {
    name?: string | null;
  } | null;
  payment?: {
    total_invoice?: string | null;
    amount?: string | null;
  } | null;
}

const SUPPORTED_FILTER_KEYS: readonly (keyof JobsFilters)[] = [
  "period",
  "date_from",
  "date_to",
  "status",
  "company_uuid",
];

const normalize = (block: CommusoftBlock): NormalizedJob => {
  const job = block.job ?? {};
  const engineer = block.engineer ?? null;
  const payment = block.payment ?? null;
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
    customer_name: block.contact?.name ?? block.site?.name ?? block.head_office?.name ?? null,
    description: job.job_description ?? null,
    raw: block,
  };
};

export const commusoftProvider: JobsDataProvider = {
  appId: "commusoft",
  label: "Commusoft",

  buildJobsRequest: (filters) => ({
    url: API_ROUTES.COMMUSOFT.GET_ALL_JOBS,
    params: buildJobsQueryParams(filters, SUPPORTED_FILTER_KEYS),
  }),

  normaliseJobs: (response) => unwrapJobsPayload<CommusoftBlock>(response).map(normalize),
};
