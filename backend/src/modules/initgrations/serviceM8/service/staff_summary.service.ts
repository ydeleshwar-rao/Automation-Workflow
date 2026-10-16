import { ApiError } from "../../../../utils/ApiError.js";
import {
  equalsCondition,
  fetchServiceM8Records,
  fetchServiceM8RecordsMatching,
  normalizeServiceM8Record,
  type ServiceM8Record,
} from "./serviceM8Api.client.js";

export type JobCustomer = {
  name: string | null;
  email: string | null;
  phone: string | null;
  type: string | null;
  address: string | null;
};

export type StaffJobDetail = {
  generated_job_id: string | null;
  status: string | null;
  job_address: string | null;
  billing_address: string | null;
  job_description: string | null;
  quote_date: string | null;
  work_order_date: string | null;
  completion_date: string | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_amount: string | null;
  total_invoice_amount: string | null;
  customer: JobCustomer | null;
};

/**
 * Common staff response shape — reuse this wherever staff info is returned
 * (e.g. ServiceM8, Commonsoft, or any other integration that exposes staff).
 */
export type StaffDetailDataBlock = {
  name: string;
  email: string | null;
  mobile: string | null;
  job_title: string | null;
  total_jobs: number;
  jobs: StaffJobDetail[];
};

export type StaffFilters = {
  jobTitle?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
};

const ACTIVE_CONDITION = "active eq 1";
const PRIMARY_CONTACT_FLAG = "1";
const UNKNOWN_STAFF_NAME = "Unknown";

const textOrNull = (value: unknown): string | null => (value == null ? null : String(value));

const joinName = (record: ServiceM8Record) =>
  [record.first, record.last].filter(Boolean).join(" ") || null;

/** Concatenate a ServiceM8 company's address parts into one readable string */
function buildAddress(site: ServiceM8Record): string | null {
  const parts = [
    site.address,
    site.address_street,
    site.address_city,
    site.address_state,
    site.address_postcode,
    site.address_country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

const findActiveStaffUuid = async (userId: string, field: "email" | "mobile", value: string) => {
  const matches = await fetchServiceM8Records(userId, "staff", [ACTIVE_CONDITION, equalsCondition(field, value)]);
  return textOrNull(matches[0]?.uuid);
};

/** When both email AND phone are given they must identify the same staff member. */
const assertEmailAndPhoneMatchSameStaff = async (userId: string, email: string, phone: string) => {
  const [emailStaffUuid, phoneStaffUuid] = await Promise.all([
    findActiveStaffUuid(userId, "email", email),
    findActiveStaffUuid(userId, "mobile", phone),
  ]);

  if (!emailStaffUuid && !phoneStaffUuid) {
    throw new ApiError(404, "No staff member found matching the provided email or phone");
  }
  if (!emailStaffUuid) throw new ApiError(404, `No staff member found with email: ${email}`);
  if (!phoneStaffUuid) throw new ApiError(404, `No staff member found with phone: ${phone}`);
  if (emailStaffUuid !== phoneStaffUuid) {
    throw new ApiError(
      400,
      "Email and phone do not belong to the same staff member. Please verify the details and try again."
    );
  }
};

/** Email / phone are narrowed by ServiceM8 `$filter`; the job-title "contains" match is done here. */
const findMatchingStaff = async (userId: string, filters: StaffFilters) => {
  const conditions = [ACTIVE_CONDITION];
  if (filters.email) conditions.push(equalsCondition("email", filters.email));
  if (filters.phone) conditions.push(equalsCondition("mobile", filters.phone));

  const staffMembers = (await fetchServiceM8Records(userId, "staff", conditions)).map(normalizeServiceM8Record);
  const jobTitleFilter = filters.jobTitle?.toLowerCase();
  if (!jobTitleFilter) return staffMembers;
  return staffMembers.filter((staffMember) =>
    String(staffMember.job_title ?? "").toLowerCase().includes(jobTitleFilter)
  );
};

/** Customer (primary contact first, then any contact) + site address, keyed by company uuid. */
const loadCustomersByCompany = async (userId: string, companyUuids: string[]) => {
  const [contacts, sites] = await Promise.all([
    fetchServiceM8RecordsMatching(userId, "companycontact", "company_uuid", companyUuids),
    fetchServiceM8RecordsMatching(userId, "company", "uuid", companyUuids),
  ]);
  const siteByUuid = new Map(sites.map((site) => [String(site.uuid), normalizeServiceM8Record(site)]));
  const primaryFirst = [...contacts].sort(
    (first, second) =>
      Number(second.is_primary_contact === PRIMARY_CONTACT_FLAG) - Number(first.is_primary_contact === PRIMARY_CONTACT_FLAG)
  );

  const customerByCompany = new Map<string, JobCustomer>();
  for (const contact of primaryFirst.map(normalizeServiceM8Record)) {
    const companyUuid = textOrNull(contact.company_uuid);
    if (!companyUuid || customerByCompany.has(companyUuid)) continue;
    const site = siteByUuid.get(companyUuid);
    customerByCompany.set(companyUuid, {
      name: joinName(contact),
      email: textOrNull(contact.email),
      phone: textOrNull(contact.phone),
      type: textOrNull(contact.type),
      address: site ? buildAddress(site) : null,
    });
  }
  return customerByCompany;
};

const toStaffJobDetail = (job: ServiceM8Record, customer: JobCustomer | null): StaffJobDetail => ({
  generated_job_id:     textOrNull(job.generated_job_id),
  status:               textOrNull(job.status),
  job_address:          textOrNull(job.job_address),
  billing_address:      textOrNull(job.billing_address),
  job_description:      textOrNull(job.job_description),
  quote_date:           textOrNull(job.quote_date),
  work_order_date:      textOrNull(job.work_order_date),
  completion_date:      textOrNull(job.completion_date),
  payment_date:         textOrNull(job.payment_date),
  payment_method:       textOrNull(job.payment_method),
  payment_amount:       textOrNull(job.payment_amount),
  total_invoice_amount: textOrNull(job.total_invoice_amount),
  customer,
});

export class StaffSummaryService {
  /** Active ServiceM8 staff (filtered by job title / email / phone) with the active jobs they created. */
  static async getStaffs(userId: string, filters: StaffFilters = {}): Promise<StaffDetailDataBlock[]> {
    if (filters.email && filters.phone) {
      await assertEmailAndPhoneMatchSameStaff(userId, filters.email, filters.phone);
    }

    const staffList = await findMatchingStaff(userId, filters);
    if (staffList.length === 0) return [];

    const staffUuids = staffList.map((staffMember) => String(staffMember.uuid));
    const jobs = (
      await fetchServiceM8RecordsMatching(userId, "job", "created_by_staff_uuid", staffUuids, [ACTIVE_CONDITION])
    ).map(normalizeServiceM8Record);

    const companyUuids = [
      ...new Set(jobs.map((job) => textOrNull(job.company_uuid)).filter((uuid): uuid is string => Boolean(uuid))),
    ];
    const customerByCompany = await loadCustomersByCompany(userId, companyUuids);

    return staffList.map((staffMember) => {
      const jobDetails = jobs
        .filter((job) => job.created_by_staff_uuid === staffMember.uuid)
        .map((job) => toStaffJobDetail(job, customerByCompany.get(textOrNull(job.company_uuid) ?? "") ?? null));

      return {
        name:       joinName(staffMember) ?? UNKNOWN_STAFF_NAME,
        email:      textOrNull(staffMember.email),
        mobile:     textOrNull(staffMember.mobile),
        job_title:  textOrNull(staffMember.job_title),
        total_jobs: jobDetails.length,
        jobs:       jobDetails,
      };
    });
  }
}
