import { CommusoftService, type CommusoftJobFilters } from "./commusoft.service.js";

const DEFAULT_PAGE_LIMIT = 50;
/** Commusoft "starting record" is 1-based. */
const FIRST_STARTING_RECORD = 1;
const PHONE_MATCH_DIGITS = 9;

export type JobDetailDataBlock = {
  contact: {
    name: string | null;
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

  head_office: {
    name: string | null;
    address: string | null;
  } | null;

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
    job_uuid: string | null;
    job_property_type: string | null;
    job_property_uuid: string | null;
    is_recall: string | null;
    number_of_certificates: string | null;
    job_stage: string | null;
    created_from: string | null;
    job_on_hold_reasons: string | null;
    customer_contract: string | null;
    job_contract: string | null;
    priority: string | null;
  };

  engineer: {
    name: string | null;
    email: string | null;
    mobile: string | null;
    job_title: string | null;
    status_message: string | null;
    last_engineer_on_site: string | null;
    next_engineer_on_site: string | null;
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

  activities: {
    start_date: unknown;
    end_date: unknown;
    scheduled: unknown;
    last_diary_event: string | null;
    next_diary_event: string | null;
    number_of_diary_events: string | null;
  }[];

  jobmaterials: {
    name: string | null;
    quantity: unknown;
    price: unknown;
    total: unknown;
    displayed_amount: unknown;
    cost: unknown;
    displayed_cost: unknown;
  }[];
};

export type CustomerJobGroup = {
  contact: JobDetailDataBlock["contact"];
  site: JobDetailDataBlock["site"];
  head_office: JobDetailDataBlock["head_office"];
  job_count: number;
  jobs: Array<{
    job: JobDetailDataBlock["job"];
    engineer: JobDetailDataBlock["engineer"];
    payment: JobDetailDataBlock["payment"];
    activities: JobDetailDataBlock["activities"];
    jobmaterials: JobDetailDataBlock["jobmaterials"];
  }>;
};


export class CommusoftSummaryService {

  /**
   * Helper - clean "No Numbers Saved" to null
   */
  private static cleanPhone(value: string | null | undefined): string | null {
    if (!value || value.trim() === "No Numbers Saved") return null;
    return value.trim();
  }

  /**
   * Helper - build full address from parts
   */
  private static buildAddress(...parts: (string | null | undefined)[]): string | null {
    const result = parts
      .map(part => part?.trim())
      .filter(part => part && part !== "")
      .join(", ");
    return result || null;
  }

  private static firstNonEmpty(...values: unknown[]): string | null {
    for (const value of values) {
      const text = String(value ?? "").trim();
      if (text) return text;
    }
    return null;
  }

  private static customerKeyFromParts(...values: unknown[]): string | null {
    return CommusoftSummaryService.firstNonEmpty(...values)?.toLowerCase() ?? null;
  }

  private static customerKeyFromBlock(block: JobDetailDataBlock): string {
    return (
      CommusoftSummaryService.customerKeyFromParts(
        block.contact?.email,
        block.contact?.mobile,
        block.contact?.phone,
        block.contact?.name,
        block.site?.address,
      ) ?? `job-${block.job.generated_job_id ?? Math.random().toString(36).slice(2)}`
    );
  }

  private static customerKeyFromRow(row: Record<string, any>): string | null {
    return CommusoftSummaryService.customerKeyFromParts(
      row.email,
      row.emailaddress,
      row["Customer Email"],
      row.mobile,
      row.phone,
      row.landline,
      row.telephonenumber,
      row.name,
      [row.name, row.surname].filter(Boolean).join(" "),
      row.companyname,
      row["Customer Name"],
      row.id,
      row.uuid,
      row.commusoft_id,
    );
  }

  private static mapCustomerRowToGroup(row: Record<string, any>): CustomerJobGroup {
    const firstName = CommusoftSummaryService.firstNonEmpty(row.name, row["Customer Name"], row.company_name, row.companyname);
    const surname = CommusoftSummaryService.firstNonEmpty(row.surname, row.last_name);
    const companyName = CommusoftSummaryService.firstNonEmpty(row.companyname, row.company_name);
    const personName = [row.name, row.surname].filter(Boolean).join(" ").trim();
    const fullName = companyName || personName || [firstName, surname].filter(Boolean).join(" ").trim() || firstName;
    const address = CommusoftSummaryService.buildAddress(
      row.address,
      row["Address Line 1"],
      row.address_line_1,
      row.addressline1,
      row.addressline2,
      row.addressline3,
      row.town,
      row.county,
      row.postcode,
    );

    return {
      contact: {
        name: fullName,
        email: CommusoftSummaryService.firstNonEmpty(row.email, row.emailaddress, row["Customer Email"]),
        phone: CommusoftSummaryService.cleanPhone(
          CommusoftSummaryService.firstNonEmpty(row.phone, row.landline, row.telephonenumber, row["Customer Landline"]),
        ),
        mobile: CommusoftSummaryService.cleanPhone(
          CommusoftSummaryService.firstNonEmpty(row.mobile, row["Customer Mobile"]),
        ),
        type: CommusoftSummaryService.firstNonEmpty(row.customer_type, row.type, row.customertypesid),
        is_primary_contact: null,
      },
      site: {
        name: fullName,
        website: null,
        abn_number: CommusoftSummaryService.firstNonEmpty(row.commusoft_id, row.id, row.uuid, row.contactid),
        address,
        address_street: CommusoftSummaryService.firstNonEmpty(row.address_line_2, row["Address Line 2"]),
        address_city: CommusoftSummaryService.firstNonEmpty(row.town, row.city),
        address_state: CommusoftSummaryService.firstNonEmpty(row.county, row.state),
        address_postcode: CommusoftSummaryService.firstNonEmpty(row.postcode),
        address_country: CommusoftSummaryService.firstNonEmpty(row.country),
        billing_address: address,
        fax_number: null,
      },
      head_office: {
        name: fullName,
        address,
      },
      job_count: 0,
      jobs: [],
    };
  }

  /** Commusoft workflow statuses (not Yes/No from "Is Job Complete"). */
  private static readonly WORKFLOW_STATUSES = new Set([
    "completed",
    "ongoing",
    "on_hold",
    "waiting_for_customer",
    "reserved",
  ]);

  static resolveWorkflowStatus(job: Record<string, any>): string {
    const candidates = [
      job["Job Status"],
      job.job_status,
      job.status,
    ];

    for (const raw of candidates) {
      if (raw == null || String(raw).trim() === "") continue;
      const normalized = String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (normalized === "yes" || normalized === "no" || normalized === "in_progress") {
        continue;
      }
      if (CommusoftSummaryService.WORKFLOW_STATUSES.has(normalized)) {
        return normalized;
      }
    }

    if (String(job["Job on hold reasons"] ?? "").trim()) {
      return "on_hold";
    }
    if (String(job["Is Job Complete"] ?? "").trim().toLowerCase() === "yes") {
      return "completed";
    }
    return "ongoing";
  }

  /**
   * Map a raw Commusoft /jobs record to JobDetailDataBlock
   */
  static mapToJobDetailBlock(job: Record<string, any>): JobDetailDataBlock {
    return {
      contact: {
        name: job["Contact Name"] ?? null,
        email: job["Customer Email"] ?? null,
        phone: CommusoftSummaryService.cleanPhone(job["Customer Landline"]),
        mobile: CommusoftSummaryService.cleanPhone(job["Customer Mobile"]),
        type: job["Job Property Type"] ?? null,
        is_primary_contact: null
      },

      site: {
        name: job["Job Address Name"] ?? null,
        website: null,
        abn_number: job["Customer.Account.Number"] ?? null,
        address: job["Job Address Line 1"] ?? null,
        address_street: job["Job Address Line 2"] ?? null,
        address_city: job["Job Address Town"] ?? null,
        address_state: job["Job Address County"] ?? null,
        address_postcode: job["Job Address Postcode"] ?? null,
        address_country: null,
        billing_address: job["Customer Address Line 1"] ?? null,
        fax_number: null
      },

      head_office: {
        name: job["Customer Name"] ?? null,
        address: job["Customer Address Line 1"] ?? null
      },

      job: {
        generated_job_id: job["jobId"] ?? job["Job Number"] ?? null,
        status: CommusoftSummaryService.resolveWorkflowStatus(job),
        date: job["Job Date"] ?? null,
        job_address: CommusoftSummaryService.buildAddress(
          job["Job Address Line 1"],
          job["Job Address Line 2"],
          job["Job Address Line 3"],
          job["Job Address Town"],
          job["Job Address County"],
          job["Job Address Postcode"]
        ),
        job_description: job["Job Description"] ?? null,
        work_done_description: job["Job Notes"] ?? null,
        total_invoice_amount: job["Quoted Amount"] ?? null,
        purchase_order_number: job["Customer reference"] ?? null,
        category: job["Business unit"] ?? null,
        quote_date: job["Preferred date"] ?? null,
        completion_date: job["Completed Date"] ?? null,
        job_uuid: job["Job Uuid"] ?? null,
        job_property_type: job["Job Property Type"] ?? null,
        job_property_uuid: job["Job Property Uuid"] ?? null,
        is_recall: job["Is a Recall"] ?? null,
        number_of_certificates: job["Number of certificates"] ?? null,
        job_stage: job["Job stage"] ?? null,
        created_from: job["Created From"] ?? null,
        job_on_hold_reasons: job["Job on hold reasons"] ?? null,
        customer_contract: job["Customer contract"] ?? null,
        job_contract: job["Job contract"] ?? null,
        priority: job["Priority"] ?? null
      },

      engineer: job["Engineer Name"]
        ? {
            name: job["Engineer Name"] ?? null,
            email: job["Job Address Email"] ?? null,
            mobile: CommusoftSummaryService.cleanPhone(job["Job Address Mobile"]),
            job_title: null,
            status_message: job["Last Engineer Mobile Status"] ?? null,
            last_engineer_on_site: job["Last Engineer Name On Site"] ?? null,
            next_engineer_on_site: job["Next Engineer Name On Site"] ?? null
          }
        : null,

      payment: {
        status: job["Number of Invoices Raised"] ?? "0",
        amount: job["Quoted Amount"] ?? null,
        method: null,
        date: job["Completed Date"] ?? null,
        total_invoice: job["Number of Invoices Raised"] ?? null,
        ready_to_invoice: job["Is Job Complete"] === "Yes",
        payments: []
      },

      activities: [
        {
          start_date: job["Last Diary Event"] ?? null,
          end_date: job["Next Diary Event"] ?? null,
          scheduled: job["Number of Diary Events"] ?? null,
          last_diary_event: job["Last Diary Event"] ?? null,
          next_diary_event: job["Next Diary Event"] ?? null,
          number_of_diary_events: job["Number of Diary Events"] ?? null
        }
      ],

      jobmaterials: []
    };
  }

  /**
   * Fetch one page of jobs live from Commusoft and group them by customer.
   *
   * Filter keys are kept identical to ServiceM8's getJobs so the UI sends
   * the same query params for both integrations.
   *
   * Commusoft API mappings:
   *   status   → status (only ongoing|reserved|on_hold|waiting_for_customer|completed)
   *   dateFrom → jobCreatedStartDate
   *   dateTo   → jobCreatedEndDate
   *
   * staffUuid / categoryUuid / queueUuid / companyUuid have no Commusoft
   * jobs-API equivalent — they are ignored.
   *
   * The cursor is the Commusoft "starting record" of the next page.
   */
  static async getJobs(
    userId: string,
    filters?: {
      queueUuid?: string;
      categoryUuid?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      staffUuid?: string;
      companyUuid?: string;
    },
    options?: { limit?: number; cursor?: string }
  ): Promise<{
    success: true;
    data: CustomerJobGroup[];
    meta: { has_more: boolean; next_cursor: string | null; total_returned: number };
  }> {
    const pageLimit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const startingRecord = CommusoftSummaryService.parseCursor(options?.cursor);

    // One extra record tells us whether another page exists.
    const jobs = await CommusoftService.fetchJobsPage(
      userId,
      { startingRecord, pageSize: pageLimit + 1 },
      CommusoftSummaryService.toCommusoftJobFilters(filters)
    );

    const hasMore = jobs.length > pageLimit;
    if (hasMore) jobs.pop();
    const nextCursor = hasMore ? String(startingRecord + pageLimit) : null;

    const blocks = jobs.map((job) => CommusoftSummaryService.mapToJobDetailBlock(job));
    const isFirstPage = startingRecord === FIRST_STARTING_RECORD;
    // Customers without jobs are added once, on the first page, so they are not repeated per page.
    const data = isFirstPage
      ? await CommusoftSummaryService.groupBlocksAndCustomersByCustomer(userId, blocks)
      : CommusoftSummaryService.sortGroups(CommusoftSummaryService.groupBlocksByCustomer(blocks));

    return {
      success: true,
      data,
      meta: { has_more: hasMore, next_cursor: nextCursor, total_returned: jobs.length },
    };
  }

  private static parseCursor(cursor: string | undefined): number {
    const startingRecord = Number.parseInt(cursor ?? "", 10);
    return Number.isFinite(startingRecord) && startingRecord >= FIRST_STARTING_RECORD
      ? startingRecord
      : FIRST_STARTING_RECORD;
  }

  private static toCommusoftJobFilters(filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): CommusoftJobFilters {
    const jobFilters: CommusoftJobFilters = {};
    const workflowStatus = CommusoftSummaryService.normalizeStatus(filters?.status);
    if (workflowStatus && CommusoftSummaryService.WORKFLOW_STATUSES.has(workflowStatus)) {
      jobFilters.status = workflowStatus;
    }
    if (filters?.dateFrom) jobFilters.dateFrom = filters.dateFrom;
    if (filters?.dateTo) jobFilters.dateTo = filters.dateTo;
    return jobFilters;
  }

  private static normalizeStatus(status: string | undefined): string | null {
    if (!status?.trim()) return null;
    return status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  }

  static groupBlocksByCustomer(blocks: JobDetailDataBlock[]): CustomerJobGroup[] {
    const groups = new Map<string, CustomerJobGroup>();

    for (const block of blocks) {
      const key = CommusoftSummaryService.customerKeyFromBlock(block);

      if (!groups.has(key)) {
        groups.set(key, {
          contact: block.contact,
          site: block.site,
          head_office: block.head_office,
          job_count: 0,
          jobs: [],
        });
      }

      const group = groups.get(key)!;
      group.job_count += 1;
      group.jobs.push({
        job: block.job,
        engineer: block.engineer,
        payment: block.payment,
        activities: block.activities,
        jobmaterials: block.jobmaterials,
      });
    }

    return Array.from(groups.values());
  }

  /** Groups the job blocks by customer and adds the customers (fetched live) that have no jobs. */
  static async groupBlocksAndCustomersByCustomer(
    userId: string,
    blocks: JobDetailDataBlock[]
  ): Promise<CustomerJobGroup[]> {
    const groups = new Map<string, CustomerJobGroup>();

    for (const group of CommusoftSummaryService.groupBlocksByCustomer(blocks)) {
      const key = CommusoftSummaryService.customerKeyFromParts(
        group.contact?.email,
        group.contact?.mobile,
        group.contact?.phone,
        group.contact?.name,
        group.site?.address,
      ) ?? `group-${groups.size}`;
      groups.set(key, group);
    }

    const customers = await CommusoftService.getCustomers(userId);

    for (const customer of customers) {
      const key = CommusoftSummaryService.customerKeyFromRow(customer);
      if (!key || groups.has(key)) continue;
      groups.set(key, CommusoftSummaryService.mapCustomerRowToGroup(customer));
    }

    return CommusoftSummaryService.sortGroups(Array.from(groups.values()));
  }

  /** Customers with jobs first, then alphabetically by contact name. */
  private static sortGroups(groups: CustomerJobGroup[]): CustomerJobGroup[] {
    return groups.sort((first, second) => {
      const firstHasJobs = first.jobs.length > 0 ? 0 : 1;
      const secondHasJobs = second.jobs.length > 0 ? 0 : 1;
      if (firstHasJobs !== secondHasJobs) return firstHasJobs - secondHasJobs;
      return String(first.contact?.name ?? "").localeCompare(String(second.contact?.name ?? ""));
    });
  }

  /**
   * Get all job details by customer email or phone, searched live in Commusoft.
   * Phones match on their last 9 digits, so "+44 7734328664" and "07734328664" are the same number.
   */
  static async getJobDetailsListByEmailOrPhone(
    userId: string,
    email?: string,
    phone?: string
  ) {
    const normalizedEmail = email?.trim().toLowerCase() ?? "";
    const phoneDigits = CommusoftSummaryService.lastPhoneDigits(phone);

    if (!normalizedEmail && !phoneDigits) return { success: true, data: [] };

    const allJobs = await CommusoftService.fetchAllJobs(userId);
    const matchingJobs = allJobs.filter((job) => {
      const jobEmail = String(job["Customer Email"] ?? "").trim().toLowerCase();
      const jobPhoneDigits = CommusoftSummaryService.lastPhoneDigits(String(job["Customer Mobile"] ?? ""));
      const isEmailMatch = Boolean(normalizedEmail) && jobEmail === normalizedEmail;
      const isPhoneMatch = Boolean(phoneDigits) && jobPhoneDigits.endsWith(phoneDigits);
      return isEmailMatch || isPhoneMatch;
    });

    if (matchingJobs.length === 0) {
      return {
        success: false,
        message: "No job records found for the provided email or phone.",
        data: []
      };
    }

    const jobDetails: JobDetailDataBlock[] = matchingJobs.map((job) =>
      CommusoftSummaryService.mapToJobDetailBlock(job)
    );

    return {
      success: true,
      data: jobDetails
    };
  }

  private static lastPhoneDigits(phone: string | undefined): string {
    const digitsOnly = phone?.replace(/\D/g, "") ?? "";
    return digitsOnly.slice(-PHONE_MATCH_DIGITS);
  }
}
