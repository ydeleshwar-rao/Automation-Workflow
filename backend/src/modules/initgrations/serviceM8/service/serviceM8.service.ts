import axios from "axios";
import { ApiError } from "../../../../utils/ApiError.js";
import { withStatusTracking } from "../utils/externalApiTracker.js";
import {
  mapServiceM8DiaryEventHttpError,
  sleep,
} from "../utils/serviceM8DiaryEvent.util.js";
import {
  SERVICEM8_BASE_URL,
  MAX_FILTER_CONDITIONS,
  callServiceM8,
  equalsCondition,
  fetchServiceM8Records,
  getServiceM8Headers as getLiveServiceM8Headers,
  normalizeServiceM8Record,
  readCreatedRecordUuid,
  type ServiceM8Record,
} from "./serviceM8Api.client.js";

const DIARY_EVENT_MAX_ATTEMPTS = 3;
const DIARY_EVENT_BASE_RETRY_DELAY_MS = 500;
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;
const ACTIVE_CONDITION = "active eq 1";

/**
 * Authorization headers for direct ServiceM8 calls (polling engine / webhook adapters).
 * Refreshes the token automatically.
 */
export const getServiceM8Headers = getLiveServiceM8Headers;

export interface JobListFilters {
  queueUuid?: string;
  categoryUuid?: string;
  status?: string;
  dateFrom?: string;   // YYYY-MM-DD inclusive
  dateTo?: string;     // YYYY-MM-DD inclusive
  staffUuid?: string;  // matched against completion_actioned_by_uuid
  companyUuid?: string;
  active?: 0 | 1;
  /** Only jobs whose date is strictly before this ServiceM8 date-time (pagination cursor). */
  dateBefore?: string;
}

const isActiveFlag = (value: unknown) => value === 1 || value === "1" || value === true;

const toDisplayName = (record: ServiceM8Record) =>
  [record.first, record.last].filter(Boolean).join(" ").trim();

const formatServiceM8DateTime = (date: Date) => {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** ServiceM8 has no ge/le, so inclusive day bounds become gt (day − 1s) and lt (next day). */
const buildDateConditions = (filters: JobListFilters): string[] => {
  const conditions: string[] = [];
  if (filters.dateFrom) {
    const fromDate = new Date(`${filters.dateFrom}T00:00:00`);
    if (!isNaN(fromDate.getTime())) {
      fromDate.setSeconds(fromDate.getSeconds() - 1);
      conditions.push(`date gt '${formatServiceM8DateTime(fromDate)}'`);
    }
  }
  if (filters.dateTo) {
    const toDate = new Date(`${filters.dateTo}T00:00:00`);
    if (!isNaN(toDate.getTime())) {
      toDate.setDate(toDate.getDate() + 1);
      conditions.push(`date lt '${formatServiceM8DateTime(toDate)}'`);
    }
  }
  if (filters.dateBefore) conditions.push(`date lt '${filters.dateBefore.replace(/'/g, "''")}'`);
  return conditions;
};

export const buildJobFilterConditions = (filters: JobListFilters): string[] => {
  const conditions: string[] = [];
  if (filters.queueUuid)    conditions.push(equalsCondition("queue_uuid", filters.queueUuid));
  if (filters.categoryUuid) conditions.push(equalsCondition("category_uuid", filters.categoryUuid));
  if (filters.status)       conditions.push(equalsCondition("status", filters.status));
  if (filters.staffUuid)    conditions.push(equalsCondition("completion_actioned_by_uuid", filters.staffUuid));
  if (filters.companyUuid)  conditions.push(equalsCondition("company_uuid", filters.companyUuid));
  if (filters.active !== undefined) conditions.push(`active eq ${filters.active}`);
  conditions.push(...buildDateConditions(filters));

  if (conditions.length > MAX_FILTER_CONDITIONS) {
    throw new ApiError(400, `Too many filter conditions (ServiceM8 supports a maximum of ${MAX_FILTER_CONDITIONS} per request)`);
  }
  return conditions;
};

const fetchNormalizedRecords = async (userId: string, resource: string, filterConditions: string[] = []) => {
  const records = await fetchServiceM8Records(userId, resource, filterConditions);
  return records.map(normalizeServiceM8Record);
};

const postToServiceM8 = (userId: string, path: string, body: unknown) =>
  callServiceM8(userId, (headers) => axios.post(`${SERVICEM8_BASE_URL}/${path}`, body, { headers }));

/** POST that creates a record and returns `{ uuid, ...body }`. */
const createServiceM8Record = async (userId: string, path: string, body: unknown) => {
  const response = await postToServiceM8(userId, path, body);
  return { uuid: readCreatedRecordUuid(response.headers, response.data), ...(response.data || {}) };
};

export class ServiceM8Service {

  // ─── 1. Companies (Clients) ───────────────────────────────────────────────
  static listClients(userId: string) {
    return withStatusTracking(() => fetchServiceM8Records(userId, "company"));
  }

  static async createClient(userId: string, clientData: unknown) {
    const startedAt = Date.now();
    const created = await createServiceM8Record(userId, "company.json", clientData);
    console.log(`[SM8:createClient] uuid=${created.uuid ?? "(none)"}  duration=${Date.now() - startedAt}ms`);
    return created;
  }

  /** Creates a companycontact row linked to an existing company. */
  static async createCompanyContact(userId: string, companyUuid: string, contact: Record<string, unknown>) {
    const startedAt = Date.now();
    const created = await createServiceM8Record(userId, "companycontact.json", { ...contact, company_uuid: companyUuid });
    console.log(`[SM8:createCompanyContact] company=${companyUuid}  uuid=${created.uuid ?? "(none)"}  duration=${Date.now() - startedAt}ms`);
    return created;
  }

  static async updateClient(userId: string, clientId: string, clientData: unknown) {
    const response = await postToServiceM8(userId, `client/${clientId}.json`, clientData);
    return response.data;
  }

  // ─── 2. Contacts ──────────────────────────────────────────────────────────
  static listContacts(userId: string) {
    return withStatusTracking(async () => {
      const contacts = await fetchServiceM8Records(userId, "companycontact");
      return contacts.map((contact) => ({
        first: contact.first || null, last: contact.last || null,
        email: contact.email || null, phone: contact.phone || null,
        mobile: contact.mobile || null, type: contact.type || null,
      }));
    });
  }

  // ─── 3. Locations ─────────────────────────────────────────────────────────
  static listLocations(userId: string) {
    return withStatusTracking(() => fetchServiceM8Records(userId, "location"));
  }

  static async createLocation(userId: string, locationData: unknown) {
    const response = await postToServiceM8(userId, "location.json", locationData);
    return response.data;
  }

  // ─── 4. Jobs ──────────────────────────────────────────────────────────────
  static listJobs(userId: string) {
    return withStatusTracking(() => fetchNormalizedRecords(userId, "job"));
  }

  /** Live jobs narrowed with ServiceM8 `$filter` (queue, category, status, staff, company, active, dates). */
  static listJobsFiltered(userId: string, filters: JobListFilters) {
    return withStatusTracking(async () => {
      const filterConditions = buildJobFilterConditions(filters);
      console.log(`[SM8:listJobsFiltered] user=${userId}  $filter=${filterConditions.join(" and ") || "(none)"}`);
      return fetchNormalizedRecords(userId, "job", filterConditions);
    });
  }

  static createJob(userId: string, jobData: unknown) {
    return createServiceM8Record(userId, "job.json", jobData);
  }

  static async updateJob(userId: string, jobId: string, jobData: unknown) {
    const response = await postToServiceM8(userId, `job/${jobId}.json`, jobData);
    return response.data;
  }

  // ─── 5. Staff Members ─────────────────────────────────────────────────────
  /** Active staff for workflow dropdowns (uuid + display label). */
  static listActiveStaffForSelect(userId: string) {
    return withStatusTracking(async () => {
      const staffMembers = await fetchServiceM8Records(userId, "staff", [ACTIVE_CONDITION]);
      return staffMembers
        .filter((staffMember) => isActiveFlag(staffMember.active))
        .map((staffMember) => ({
          uuid: staffMember.uuid,
          label: toDisplayName(staffMember) || staffMember.email || staffMember.uuid,
        }));
    });
  }

  static listStaffMembers(userId: string) {
    return withStatusTracking(async () => {
      const staffMembers = await fetchServiceM8Records(userId, "staff");
      return staffMembers.map((staffMember) => ({
        first: staffMember.first || null, last: staffMember.last || null,
        email: staffMember.email || null, mobile: staffMember.mobile || null,
        job_title: staffMember.job_title || null,
      }));
    });
  }

  // ─── 6. Categories ────────────────────────────────────────────────────────
  static listCategories(userId: string) {
    return withStatusTracking(async () => {
      const categories = await fetchServiceM8Records(userId, "category");
      return categories.map((category) => ({ uuid: category.uuid, name: category.name }));
    });
  }

  // ─── 7. Queues ────────────────────────────────────────────────────────────
  static listQueues(userId: string) {
    return withStatusTracking(async () => {
      const queues = await fetchServiceM8Records(userId, "jobqueue");
      // SM8 returns inactive/deleted queues too, which do not exist in the SM8 UI.
      return queues
        .filter((queue) => isActiveFlag(queue.active))
        .map((queue) => ({ uuid: queue.uuid, name: queue.name }));
    });
  }

  // ─── 8. Job Allocations ───────────────────────────────────────────────────
  static listJobAllocations(userId: string) {
    return withStatusTracking(() => fetchNormalizedRecords(userId, "jobactivity"));
  }

  static async createJobAllocation(userId: string, allocationData: unknown) {
    const response = await postToServiceM8(userId, "jobactivity.json", allocationData);
    return response.data;
  }

  /**
   * Creates a dispatch-board diary event (jobactivity).
   * 401 → refresh + retry once (callServiceM8); 5xx → exponential backoff (max 3 attempts).
   */
  static async createDiaryEvent(userId: string, payload: Record<string, string | number>) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= DIARY_EVENT_MAX_ATTEMPTS; attempt++) {
      try {
        return await createServiceM8Record(userId, "jobactivity.json", payload);
      } catch (error) {
        lastError = error;
        if (!axios.isAxiosError(error) || error.response === undefined) throw error;

        const status = error.response.status;
        const isRetryable = status >= HTTP_SERVER_ERROR_MIN && attempt < DIARY_EVENT_MAX_ATTEMPTS;
        if (status < HTTP_CLIENT_ERROR_MIN || !isRetryable) {
          throw mapServiceM8DiaryEventHttpError(status, error.response.data);
        }

        const delayMs = DIARY_EVENT_BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
        console.warn(`[SM8:createDiaryEvent] ${status} on attempt ${attempt}/${DIARY_EVENT_MAX_ATTEMPTS} — retrying in ${delayMs}ms`);
        await sleep(delayMs);
      }
    }

    throw lastError;
  }

  // ─── 9. Materials ─────────────────────────────────────────────────────────
  static listMaterials(userId: string) {
    return withStatusTracking(() => fetchServiceM8Records(userId, "material"));
  }

  static async createJobMaterial(userId: string, materialData: unknown) {
    const response = await postToServiceM8(userId, "jobmaterial.json", materialData);
    return response.data;
  }

  static listJobMaterials(userId: string) {
    return withStatusTracking(() => fetchServiceM8Records(userId, "jobmaterial"));
  }

  // ─── 10. Notes ────────────────────────────────────────────────────────────
  static listNotes(userId: string) {
    return withStatusTracking(() => fetchServiceM8Records(userId, "note"));
  }

  static async createNote(userId: string, noteData: unknown) {
    const response = await postToServiceM8(userId, "note.json", noteData);
    return response.data;
  }

  // ─── 11. Job Payments ─────────────────────────────────────────────────────
  static listJobPayments(userId: string) {
    return withStatusTracking(async () => {
      const payments = await fetchNormalizedRecords(userId, "jobpayment");
      return payments.filter((payment) => Boolean(payment.job_uuid));
    });
  }

  // ─── 12. Job Statuses ─────────────────────────────────────────────────────
  /** Distinct statuses used by the account's jobs. */
  static async getJobStatuses(userId: string): Promise<string[]> {
    const jobs = await fetchServiceM8Records(userId, "job");
    const statuses = new Set<string>();
    for (const job of jobs) {
      if (typeof job.status === "string" && job.status) statuses.add(job.status);
    }
    return [...statuses];
  }
}
