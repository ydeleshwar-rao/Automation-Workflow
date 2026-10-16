import { ApiError } from "../../../../utils/ApiError.js";
import { ServiceM8Service, type JobListFilters } from "./serviceM8.service.js";
import {
  equalsCondition,
  fetchServiceM8Records,
  fetchServiceM8RecordsMatching,
  normalizeServiceM8Record,
  type ServiceM8Record,
} from "./serviceM8Api.client.js";

/** Same shape as getJobDetails `data` (contact, site, head_office, job, engineer, payment, activities, materials). */
export type JobDetailDataBlock = {
  contact: {
    name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    type: string | null;
    is_primary_contact: string | null;
  } | null;
  site: {
    name: string | null;
    website: string | null;
    abn_number: string | null;
    address: string | null;
    address_street: string | null;
    address_city: string | null;
    address_state: string | null;
    address_postcode: string | null;
    address_country: string | null;
    billing_address: string | null;
    fax_number: string | null;
  } | null;
  head_office: { name: string | null; address: string | null } | null;
  job: {
    generated_job_id: string | null;
    status: string | null;
    date: string | null;
    job_address: string | null;
    job_description: string | null;
    work_done_description: string | null;
    total_invoice_amount: string | null;
    purchase_order_number: string | null;
    category: string | null;
    quote_date: string | null;
    completion_date: string | null;
    job_count: number;
  };
  engineer: {
    name: string;
    email: string | null;
    mobile: string | null;
    job_title: string | null;
    status_message: string | null;
  } | null;
  payment: {
    status: string;
    amount: string | null;
    method: string | null;
    date: string | null;
    total_invoice: string | null;
    ready_to_invoice: boolean;
    payments: unknown[];
  };
  activities: { start_date: unknown; end_date: unknown; scheduled: unknown }[];
  jobmaterials: {
    name: string | null;
    quantity: unknown;
    price: unknown;
    total: unknown;
    displayed_amount: unknown;
    cost: unknown;
    displayed_cost: unknown;
  }[];
  notes: {
    uuid: string;
    note: string | null;
    action_required: string | null;
    create_date: string | null;
    edit_date: string | null;
    active: number | null;
  }[];
};

/** One job's details without the customer-level fields (those live on the group). */
export type CustomerJobEntry = {
  job: Omit<JobDetailDataBlock["job"], "job_count">;
  engineer: JobDetailDataBlock["engineer"];
  payment: JobDetailDataBlock["payment"];
  activities: JobDetailDataBlock["activities"];
  jobmaterials: JobDetailDataBlock["jobmaterials"];
  notes: JobDetailDataBlock["notes"];
};

/** All jobs for one customer, with shared contact/site info hoisted to the top. */
export type CustomerJobGroup = {
  contact: JobDetailDataBlock["contact"];
  site: JobDetailDataBlock["site"];
  head_office: JobDetailDataBlock["head_office"];
  job_count: number;
  jobs: CustomerJobEntry[];
};

export type JobPageMeta = { has_more: boolean; next_cursor: string | null; total_returned: number };

type JobFilters = Omit<JobListFilters, "active" | "dateBefore">;

/**
 * Related ServiceM8 records for a job set, loaded once per request (a handful of
 * API calls) so every detail block resolves foreign keys with Map.get().
 */
export interface JobLookupMaps {
  activitiesByJob: Map<string, ServiceM8Record[]>;
  paymentsByJob: Map<string, ServiceM8Record[]>;
  materialsByJob: Map<string, ServiceM8Record[]>;
  notesByJob: Map<string, ServiceM8Record[]>;
  jobCountByCompany: Map<string, number>;
  companyByUuid: Map<string, ServiceM8Record>;
  headOfficeByUuid: Map<string, ServiceM8Record>;
  primaryContactByCompany: Map<string, ServiceM8Record>;
  staffByUuid: Map<string, ServiceM8Record>;
  categoryByUuid: Map<string, ServiceM8Record>;
}

const DEFAULT_PAGE_LIMIT = 50;
const ACTIVE_CONDITION = "active eq 1";
const PRIMARY_CONTACT_FLAG = "1";
const SOLO_JOB_KEY_PREFIX = "__solo__";

const textOrNull = (value: unknown): string | null => (value == null ? null : String(value));

const collectValues = (records: ServiceM8Record[], field: string): string[] => [
  ...new Set(records.map((record) => record[field]).filter((value): value is string => typeof value === "string" && value !== "")),
];

const groupRecords = (records: ServiceM8Record[], field: string): Map<string, ServiceM8Record[]> => {
  const grouped = new Map<string, ServiceM8Record[]>();
  for (const record of records) {
    const key = record[field];
    if (typeof key !== "string" || !key) continue;
    const group = grouped.get(key);
    if (group) group.push(record);
    else grouped.set(key, [record]);
  }
  return grouped;
};

const indexRecords = (records: ServiceM8Record[], field: string): Map<string, ServiceM8Record> => {
  const indexed = new Map<string, ServiceM8Record>();
  for (const record of records) {
    const key = record[field];
    if (typeof key === "string" && key && !indexed.has(key)) indexed.set(key, record);
  }
  return indexed;
};

/** Newest first; jobs without a date go last. */
const sortJobsByDateDescending = (jobs: ServiceM8Record[]) =>
  jobs.sort((first, second) => {
    if (!first.date) return second.date ? 1 : 0;
    if (!second.date) return -1;
    return String(second.date).localeCompare(String(first.date));
  });

/** Prefers the contact marked primary; otherwise any contact of the company. */
const pickContactPerCompany = (contacts: ServiceM8Record[]): Map<string, ServiceM8Record> => {
  const contactByCompany = new Map<string, ServiceM8Record>();
  const primaryFirst = [...contacts].sort(
    (first, second) =>
      Number(second.is_primary_contact === PRIMARY_CONTACT_FLAG) - Number(first.is_primary_contact === PRIMARY_CONTACT_FLAG)
  );
  for (const contact of primaryFirst) {
    const companyUuid = contact.company_uuid;
    if (typeof companyUuid === "string" && companyUuid && !contactByCompany.has(companyUuid)) {
      contactByCompany.set(companyUuid, contact);
    }
  }
  return contactByCompany;
};

const countJobsPerCompany = (jobs: ServiceM8Record[]): Map<string, number> => {
  const jobCountByCompany = new Map<string, number>();
  for (const job of jobs) {
    const companyUuid = job.company_uuid;
    if (typeof companyUuid === "string" && companyUuid) {
      jobCountByCompany.set(companyUuid, (jobCountByCompany.get(companyUuid) ?? 0) + 1);
    }
  }
  return jobCountByCompany;
};

const fetchNormalizedMatching = async (
  userId: string,
  resource: string,
  field: string,
  values: string[],
  baseConditions: string[] = []
) => {
  const records = await fetchServiceM8RecordsMatching(userId, resource, field, values, baseConditions);
  return records.map(normalizeServiceM8Record);
};

const toContactBlock = (contact: ServiceM8Record | null): JobDetailDataBlock["contact"] =>
  contact
    ? {
        name: `${contact.first ?? ""} ${contact.last ?? ""}`.trim(),
        email: textOrNull(contact.email),
        phone: textOrNull(contact.phone),
        mobile: textOrNull(contact.mobile),
        type: textOrNull(contact.type),
        is_primary_contact: textOrNull(contact.is_primary_contact),
      }
    : null;

const toSiteBlock = (company: ServiceM8Record | null): JobDetailDataBlock["site"] =>
  company
    ? {
        name: textOrNull(company.name),
        website: textOrNull(company.website),
        abn_number: textOrNull(company.abn_number),
        address: textOrNull(company.address),
        address_street: textOrNull(company.address_street),
        address_city: textOrNull(company.address_city),
        address_state: textOrNull(company.address_state),
        address_postcode: textOrNull(company.address_postcode),
        address_country: textOrNull(company.address_country),
        billing_address: textOrNull(company.billing_address),
        fax_number: textOrNull(company.fax_number),
      }
    : null;

const toEngineerBlock = (engineer: ServiceM8Record | null): JobDetailDataBlock["engineer"] =>
  engineer
    ? {
        name: `${engineer.first ?? ""} ${engineer.last ?? ""}`.trim(),
        email: textOrNull(engineer.email),
        mobile: textOrNull(engineer.mobile),
        job_title: textOrNull(engineer.job_title),
        status_message: textOrNull(engineer.status_message),
      }
    : null;

const toJobFields = (
  job: ServiceM8Record,
  category: ServiceM8Record | null,
  jobCount: number
): JobDetailDataBlock["job"] => ({
  generated_job_id: textOrNull(job.generated_job_id),
  status: textOrNull(job.status),
  date: textOrNull(job.date),
  job_address: textOrNull(job.job_address),
  job_description: textOrNull(job.job_description),
  work_done_description: textOrNull(job.work_done_description),
  total_invoice_amount: textOrNull(job.total_invoice_amount),
  purchase_order_number: textOrNull(job.purchase_order_number),
  category: textOrNull(category?.name),
  quote_date: textOrNull(job.quote_date),
  completion_date: textOrNull(job.completion_date),
  job_count: jobCount,
});

const toPaymentBlock = (job: ServiceM8Record, payments: ServiceM8Record[]): JobDetailDataBlock["payment"] => ({
  status: job.payment_date ? "Paid" : "Unpaid",
  amount: textOrNull(job.payment_amount),
  method: textOrNull(job.payment_method),
  date: textOrNull(job.payment_date),
  total_invoice: textOrNull(job.total_invoice_amount),
  ready_to_invoice: job.ready_to_invoice === "1",
  payments,
});

const lookupByField = (map: Map<string, ServiceM8Record>, key: unknown) =>
  typeof key === "string" && key ? map.get(key) ?? null : null;

export class SummaryService {
  /** Loads every related ServiceM8 record a job set needs (companies first, then their parents). */
  static async preloadJobLookups(userId: string, jobs: ServiceM8Record[]): Promise<JobLookupMaps> {
    const jobUuids = collectValues(jobs, "uuid");
    const companyUuids = collectValues(jobs, "company_uuid");

    const [activities, payments, materials, notes, companies, contacts, staff, categories] = await Promise.all([
      fetchNormalizedMatching(userId, "jobactivity", "job_uuid", jobUuids),
      fetchNormalizedMatching(userId, "jobpayment", "job_uuid", jobUuids),
      fetchNormalizedMatching(userId, "jobmaterial", "job_uuid", jobUuids),
      // Matching related_object_uuid against job uuids already limits notes to job notes.
      fetchNormalizedMatching(userId, "note", "related_object_uuid", jobUuids, [ACTIVE_CONDITION]),
      fetchNormalizedMatching(userId, "company", "uuid", companyUuids),
      fetchNormalizedMatching(userId, "companycontact", "company_uuid", companyUuids),
      fetchNormalizedMatching(userId, "staff", "uuid", collectValues(jobs, "completion_actioned_by_uuid")),
      fetchNormalizedMatching(userId, "category", "uuid", collectValues(jobs, "category_uuid")),
    ]);

    const headOffices = await fetchNormalizedMatching(
      userId, "company", "uuid", collectValues(companies, "parent_company_uuid")
    );

    return {
      activitiesByJob: groupRecords(activities, "job_uuid"),
      paymentsByJob: groupRecords(payments, "job_uuid"),
      materialsByJob: groupRecords(materials, "job_uuid"),
      notesByJob: groupRecords(notes, "related_object_uuid"),
      jobCountByCompany: countJobsPerCompany(jobs),
      companyByUuid: indexRecords(companies, "uuid"),
      headOfficeByUuid: indexRecords(headOffices, "uuid"),
      primaryContactByCompany: pickContactPerCompany(contacts),
      staffByUuid: indexRecords(staff, "uuid"),
      categoryByUuid: indexRecords(categories, "uuid"),
    };
  }

  /** Builds one job-details payload from records preloaded by `preloadJobLookups`. */
  static buildJobDetailBlock(
    job: ServiceM8Record,
    maps: JobLookupMaps,
    contactOverride?: ServiceM8Record
  ): JobDetailDataBlock {
    const jobUuid = String(job.uuid ?? "");
    const company = lookupByField(maps.companyByUuid, job.company_uuid);
    const headOffice = lookupByField(maps.headOfficeByUuid, company?.parent_company_uuid);
    const contact = contactOverride ?? lookupByField(maps.primaryContactByCompany, job.company_uuid);
    const companyUuid = typeof job.company_uuid === "string" ? job.company_uuid : "";

    return {
      contact: toContactBlock(contact),
      site: toSiteBlock(company),
      head_office: headOffice ? { name: textOrNull(headOffice.name), address: textOrNull(headOffice.address) } : null,
      job: toJobFields(job, lookupByField(maps.categoryByUuid, job.category_uuid), maps.jobCountByCompany.get(companyUuid) ?? 1),
      engineer: toEngineerBlock(lookupByField(maps.staffByUuid, job.completion_actioned_by_uuid)),
      payment: toPaymentBlock(job, maps.paymentsByJob.get(jobUuid) ?? []),
      activities: (maps.activitiesByJob.get(jobUuid) ?? []).map((activity) => ({
        start_date: activity.start_date,
        end_date: activity.end_date,
        scheduled: activity.activity_was_scheduled,
      })),
      jobmaterials: (maps.materialsByJob.get(jobUuid) ?? []).map((material) => ({
        name: textOrNull(material.name),
        quantity: material.quantity,
        price: material.price,
        total: material.cost,
        displayed_amount: material.displayed_amount,
        cost: material.cost,
        displayed_cost: material.displayed_cost,
      })),
      notes: (maps.notesByJob.get(jobUuid) ?? []).map((note) => ({
        uuid: String(note.uuid),
        note: textOrNull(note.note),
        action_required: textOrNull(note.action_required),
        create_date: textOrNull(note.create_date),
        edit_date: textOrNull(note.edit_date),
        active: note.active == null ? null : Number(note.active),
      })),
    };
  }

  static async buildCustomerGroups(
    userId: string,
    jobs: ServiceM8Record[],
    contactByCompany?: Map<string, ServiceM8Record>
  ): Promise<CustomerJobGroup[]> {
    const maps = await SummaryService.preloadJobLookups(userId, jobs);
    const blocks = jobs.map((job) => {
      const contactOverride = lookupByField(contactByCompany ?? new Map(), job.company_uuid);
      return SummaryService.buildJobDetailBlock(job, maps, contactOverride ?? undefined);
    });
    return SummaryService.groupBlocksByCustomer(jobs, blocks);
  }

  static async fetchJobByGeneratedId(userId: string, generatedJobId: string): Promise<ServiceM8Record> {
    const jobs = await fetchServiceM8Records(userId, "job", [equalsCondition("generated_job_id", generatedJobId)]);
    const job = jobs[0];
    if (!job) throw new ApiError(404, `Job #${generatedJobId} not found`);
    return normalizeServiceM8Record(job);
  }

  static async getJobDetails(userId: string, generatedJobId: string) {
    const job = await SummaryService.fetchJobByGeneratedId(userId, generatedJobId);
    const maps = await SummaryService.preloadJobLookups(userId, [job]);
    return { success: true, data: SummaryService.buildJobDetailBlock(job, maps) };
  }

  /**
   * All jobs of every company with a contact whose email OR phone matches (case-insensitive).
   * Each list item uses the same shape as getJobDetails `data`, grouped per customer.
   */
  static async getJobDetailsListByEmailOrPhone(
    userId: string,
    email?: string,
    phone?: string
  ): Promise<{ success: true; data: CustomerJobGroup[] }> {
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.trim().toLowerCase();
    if (!normalizedEmail && !normalizedPhone) return { success: true, data: [] };

    const allContacts = await fetchServiceM8Records(userId, "companycontact");
    const contacts = allContacts.map(normalizeServiceM8Record).filter((contact) => {
      const contactEmail = textOrNull(contact.email)?.toLowerCase();
      const contactPhone = textOrNull(contact.phone)?.toLowerCase();
      return (normalizedEmail && contactEmail === normalizedEmail) || (normalizedPhone && contactPhone === normalizedPhone);
    });
    console.log(`[getJobDetailsListByEmailOrPhone] matched ${contacts.length} contact(s)`);

    const companyUuids = collectValues(contacts, "company_uuid");
    if (companyUuids.length === 0) return { success: true, data: [] };

    const jobs = sortJobsByDateDescending(await fetchNormalizedMatching(userId, "job", "company_uuid", companyUuids));
    if (jobs.length === 0) return { success: true, data: [] };

    // The matched contact (not the company's primary contact) is shown for its company.
    const contactByCompany = indexRecords(contacts, "company_uuid");
    return { success: true, data: await SummaryService.buildCustomerGroups(userId, jobs, contactByCompany) };
  }

  /**
   * Jobs with full detail blocks, fetched live from ServiceM8.
   * - `generatedJobId` → that single job.
   * - Otherwise → jobs matching `filters`, newest first, paged by `cursor` (the last job's date).
   */
  static async getJobs(
    userId: string,
    generatedJobId?: string,
    filters: JobFilters = {},
    options: { limit?: number; cursor?: string } = {}
  ): Promise<{ success: true; data: CustomerJobGroup[]; meta: JobPageMeta }> {
    if (generatedJobId) {
      const job = await SummaryService.fetchJobByGeneratedId(userId, generatedJobId);
      const data = await SummaryService.buildCustomerGroups(userId, [job]);
      return { success: true, data, meta: { has_more: false, next_cursor: null, total_returned: 1 } };
    }

    const pageLimit = options.limit ?? DEFAULT_PAGE_LIMIT;
    const { data: matchingJobs } = await ServiceM8Service.listJobsFiltered(userId, {
      ...filters,
      ...(options.cursor ? { dateBefore: options.cursor } : {}),
    });
    const sortedJobs = sortJobsByDateDescending(matchingJobs);
    const hasMore = sortedJobs.length > pageLimit;
    const jobs = sortedJobs.slice(0, pageLimit);
    if (jobs.length === 0) {
      return { success: true, data: [], meta: { has_more: false, next_cursor: null, total_returned: 0 } };
    }

    const nextCursor = hasMore ? textOrNull(jobs[jobs.length - 1]?.date) : null;
    return {
      success: true,
      data: await SummaryService.buildCustomerGroups(userId, jobs),
      meta: { has_more: hasMore, next_cursor: nextCursor, total_returned: jobs.length },
    };
  }

  static groupBlocksByCustomer(jobs: ServiceM8Record[], blocks: JobDetailDataBlock[]): CustomerJobGroup[] {
    const groupIndexByCompany = new Map<string, number>();
    const groups: CustomerJobGroup[] = [];

    blocks.forEach((block, index) => {
      const rawJob = jobs[index] ?? {};
      const companyKey = textOrNull(rawJob.company_uuid) ?? `${SOLO_JOB_KEY_PREFIX}${String(rawJob.uuid)}`;

      let groupIndex = groupIndexByCompany.get(companyKey);
      if (groupIndex === undefined) {
        groupIndex = groups.length;
        groupIndexByCompany.set(companyKey, groupIndex);
        groups.push({ contact: block.contact, site: block.site, head_office: block.head_office, job_count: block.job.job_count, jobs: [] });
      }

      const { job_count: _jobCount, ...jobFields } = block.job;
      groups[groupIndex]?.jobs.push({
        job: jobFields,
        engineer: block.engineer,
        payment: block.payment,
        activities: block.activities,
        jobmaterials: block.jobmaterials,
        notes: block.notes,
      });
    });

    return groups;
  }

  static async getAllJobIds(userId: string) {
    const jobs = (await fetchServiceM8Records(userId, "job")).map(normalizeServiceM8Record);
    if (jobs.length === 0) return [];

    jobs.sort((first, second) =>
      String(first.generated_job_id ?? "").localeCompare(String(second.generated_job_id ?? ""), undefined, { numeric: true })
    );

    const companies = await fetchServiceM8RecordsMatching(userId, "company", "uuid", collectValues(jobs, "company_uuid"));
    const companyNameByUuid = new Map(companies.map((company) => [String(company.uuid), textOrNull(company.name)]));
    const jobCountByCompany = countJobsPerCompany(jobs);

    return jobs.map((job) => {
      const companyUuid = textOrNull(job.company_uuid);
      return {
        generated_job_id: job.generated_job_id,
        job_name: job.job_description || "No Description",
        customer_name: companyUuid ? companyNameByUuid.get(companyUuid) ?? "Unknown" : "No Customer",
        status: job.status,
        number_of_jobs: companyUuid ? jobCountByCompany.get(companyUuid) ?? 1 : 1,
      };
    });
  }
}
