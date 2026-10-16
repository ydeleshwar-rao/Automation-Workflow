import axios from "axios";
import { randomUUID } from "crypto";
import { ApiError } from "../../../../utils/ApiError.js";
import {
  COMMUSOFT_OPPORTUNITY_ARRAY_KEYS,
  extractCommusoftArray,
} from "../../../../utils/commusoft-helpers.js";
import { commusoftIntegrationRepository } from "../repositories/commusoft-integration.repository.js";

const COMMUSOFT_API_BASE = "https://app.commusoft.co.uk/webservice_dev.php/api/v1";

const CUSTOMER_DETAILS_BATCH_SIZE = 15;
const CUSTOMER_DETAILS_BATCH_DELAY_MS = 200;

export interface EngineerUserDetails {
  name: string;
  email: string;
  phone: string;
  mobile: string;
}

export interface AssignedEngineer {
  engineerId: number;
  engineerName: string;
  email: string;
  phone: string;
  mobile: string;
}

export interface CustomerJob {
  jobId: number;
  jobNumber: string;
  description: string;
  status: string;
  createdDate: string;
  completedDate: string;
  assignedEngineers: AssignedEngineer[];
}

export interface CustomerContact {
  contactId: number;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface CustomerDetailRecord {
  customerId: number;
  customerName: string;
  email: string;
  phone: string;
  mobile: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  postcode: string;
  country: string;
  customerType: string;
  contacts: CustomerContact[];
  totalJobCount: number;
  jobs: CustomerJob[];
}

export interface FormattedCustomerJob {
  job: {
    job_id: string;
    status: string;
    start_date: string;
    end_date: string;
    description: string;
    completion_date: string;
  };
  engineer: {
    name: string;
    email: string;
    phone: string;
    mobile: string;
  };
}

export interface FormattedCustomerDetail {
  contact: {
    name: string;
    email: string;
    phone: string;
    mobile: string;
    type: string;
  };
  site: {
    name: string;
    address: string;
    address_city: string;
    address_postcode: string;
    address_country: string;
  };
  job_count: number;
  jobs: FormattedCustomerJob[];
}


function pickString(record: any, ...keys: string[]): string {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function pickNumber(record: any, ...keys: string[]): number {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

/** Map a Commusoft /users record to contact fields used on job engineer objects. */
function mapUserToDetails(user: any): EngineerUserDetails {
  const name =
    pickString(user, "name", "full_name", "fullName", "display_name") ||
    [pickString(user, "firstname", "first_name"), pickString(user, "surname", "last_name")]
      .filter(Boolean)
      .join(" ");
  return {
    name,
    email: pickString(user, "email", "Email", "emailaddress"),
    phone: pickString(
      user,
      "telephonenumber",
      "phone",
      "landline",
      "company_landline",
      "contact_landline"
    ),
    mobile: pickString(user, "mobile", "company_mobile", "contact_mobile"),
  };
}

type UsersLookupMaps = {
  byId: Map<number, EngineerUserDetails>;
  byEmail: Map<string, EngineerUserDetails>;
};

/** Build userId and email indexes from GET /api/v1/users staff records. */
function buildUsersLookupMap(users: any[]): UsersLookupMaps {
  const byId = new Map<number, EngineerUserDetails>();
  const byEmail = new Map<string, EngineerUserDetails>();

  for (const user of users) {
    const details = mapUserToDetails(user);
    const userId = pickNumber(user, "id", "commusoft_id", "user_id", "userId");
    if (userId > 0) byId.set(userId, details);
    const emailKey = details.email.trim().toLowerCase();
    if (emailKey) byEmail.set(emailKey, details);
  }

  return { byId, byEmail };
}

function resolveUserPhones(
  engineerId: number,
  email: string,
  lookup: UsersLookupMaps
): { phone: string; mobile: string } {
  let details: EngineerUserDetails | undefined;
  if (engineerId > 0) details = lookup.byId.get(engineerId);
  if (!details && email) {
    details = lookup.byEmail.get(email.trim().toLowerCase());
  }
  return {
    phone: details?.phone ?? "",
    mobile: details?.mobile ?? "",
  };
}

function applyUserPhonesToEngineer(
  engineer: AssignedEngineer,
  lookup: UsersLookupMaps
): AssignedEngineer {
  const { phone, mobile } = resolveUserPhones(engineer.engineerId, engineer.email, lookup);
  return {
    ...engineer,
    phone: engineer.phone || phone,
    mobile: engineer.mobile || mobile,
  };
}

function resolveCustomerApiId(customer: any): string | null {
  const raw =
    customer?.customer_id ??
    customer?.customerId ??
    customer?.id ??
    customer?.commusoft_id ??
    customer?.["Customer ID"] ??
    customer?.["Customer Id"];

  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return null;
  }
  return String(raw).trim();
}


function formatDiaryEventStartDate(start: string | null | undefined): string {
  if (!start) return "";
  const match = String(start).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match?.[1] || !match[2] || !match[3]) return "";
  const yy = match[1].slice(-2);
  return `${match[3]}/${match[2]}/${yy}`;
}

/**
 * Commusoft uses Symfony forms — bracketed keys like `customertype[contacts][name]`
 * must be sent as application/x-www-form-urlencoded so PHP parses them into a
 * nested array. Sending JSON makes Symfony see literal-bracket string keys and
 * fail validation on every required field.
 */
function toFormBody(payload: Record<string, any>): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    body.append(key, String(value));
  }
  return body;
}



const COMMUSOFT_API_BATCH_SIZE = 300; // Reduced from 500 for better stability
const COMMUSOFT_API_TIMEOUT_MS = 30_000;
const COMMUSOFT_API_PAGE_DELAY_MS = 100;
/** Large pages keep full job scans to a few round-trips; each call stays under the timeout. */
const COMMUSOFT_JOBS_FULL_PAGE_SIZE = 20_000;
const COMMUSOFT_JOBS_TIMEOUT_MS = 60_000;
const FIRST_STARTING_RECORD = 1;

export interface CommusoftJobFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerID?: string | number;
}

/** Maps our filter names to the Commusoft /jobs query parameters. */
function buildJobFilterParams(filters: CommusoftJobFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (filters.status) params["status"] = filters.status;
  if (filters.dateFrom) params["jobCreatedStartDate"] = filters.dateFrom;
  if (filters.dateTo) params["jobCreatedEndDate"] = filters.dateTo;
  if (filters.customerID) params["customerID"] = filters.customerID;
  return params;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCustomerDetail(customer: CustomerDetailRecord): FormattedCustomerDetail {
  return {
    contact: {
      name: customer.customerName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      mobile: customer.mobile || "",
      type: "customer",
    },
    site: {
      name: customer.customerName || "",
      address: customer.addressLine1 || "",
      address_city: customer.town || "",
      address_postcode: customer.postcode || "",
      address_country: customer.country || "",
    },
    job_count: customer.totalJobCount || 0,
    jobs: (customer.jobs || []).map((job) => {
      const primaryEngineer = job.assignedEngineers?.[0];
      return {
        job: {
          job_id: String(job.jobId || ""),
          status: job.status || "",
          start_date: job.createdDate || "",
          end_date: job.completedDate || "",
          description: job.description || "",
          completion_date: job.completedDate || "",
        },
        engineer: {
          name: primaryEngineer?.engineerName || "",
          email: primaryEngineer?.email || "",
          phone: primaryEngineer?.phone || "",
          mobile: primaryEngineer?.mobile || "",
        },
      };
    }),
  };
}


async function fetchAllCommusoftCustomers(
  authParams: Record<string, unknown>
): Promise<any[]> {
  const response = await axios.get(`${COMMUSOFT_API_BASE}/customers`, {
    params: authParams,
    timeout: COMMUSOFT_API_TIMEOUT_MS,
  });
  const records = extractCommusoftArray(response.data, ["Customers", "customers", "Customer"]);
  console.log(`[Commusoft:customers] fetched=${records.length}`);
  return records;
}


function opportunityIdOf(record: any): string | null {
  const raw =
    record?.opportunityId ??
    record?.opportunity_id ??
    record?.["Opportunity Id"] ??
    record?.["Opportunity ID"] ??
    record?.id ??
    record?.ID;

  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return null;
  }

  return String(raw).trim();
}


const getIntegration = async (userId: string) => {
  const integration = await commusoftIntegrationRepository.findByUserId(userId);

  if (!integration) {
    throw new ApiError(
      404,
      "Commusoft integration not found. Please connect your account first."
    );
  }

  return integration;
};

/**
 * Auth params (token) for Commusoft requests
 */
export const getParams = async (userId: string) => {
  const integrations = await getIntegration(userId);
  return {
    token: integrations.access_token,
  };
};




/**
 * Commusoft Business Service
 */
export class CommusoftService {

  /**
   * Generate Access Token
   */
  static async generateAccessToken(
  userId: string,
  clientId: string,
  username: string,
  password: string,
  applicationId: string
) {

  try {
    const response = await axios.post(
      `${COMMUSOFT_API_BASE}/getToken`,
      {
        clientId,
        username,
        password,
        applicationId
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const tokenData = response.data;

    if (!tokenData?.token) {
      throw new ApiError(400, "Commusoft token not returned");
    }

    await commusoftIntegrationRepository.saveCredentials({
      user_id: userId,
      access_token: tokenData.token,
      client_id: clientId,
      application_id: applicationId,
      username,
      password,
    });

 

  } catch (error: any) {

    if (error?.response) {
      throw new ApiError(
        error.response.status,
        error.response.data?.error_description ||
          "Commusoft API request failed"
      );
    }
    throw error;
  }
  }


  /** Live customer list from GET /customers. */
  static async getCustomers(userId: string) {
    const authParams = await getParams(userId);
    return fetchAllCommusoftCustomers(authParams);
  }

  /**
   * Live customer list with contacts, jobs and engineers.
   * Only the requested slice is enriched, because enrichment costs two API calls per customer.
   */
  static async getCustomerDetails(
    userId: string,
    limit?: number,
    offset: number = 0
  ): Promise<FormattedCustomerDetail[]> {
    const customers = await CommusoftService.getCustomers(userId);
    const requestedCustomers =
      limit === undefined ? customers : customers.slice(offset, offset + limit);

    const records = await CommusoftService.buildCustomerDetailRecords(userId, requestedCustomers);
    return records.map(formatCustomerDetail);
  }

  private static async buildCustomerDetailRecords(
    userId: string,
    customers: any[]
  ): Promise<CustomerDetailRecord[]> {
    const params = await getParams(userId);
    const total = customers.length;

    let staffRecords: any[] = [];
    try {
      staffRecords = await CommusoftService.getStaffMembers(userId);
      console.log(
        `[Commusoft:customerDetails] fetched ${staffRecords.length} users from /users for engineer phone lookup`
      );
    } catch (err: any) {
      console.warn(
        `[Commusoft:customerDetails] users lookup failed (engineer phone/mobile may be empty): ${err?.message ?? err}`
      );
    }

    const usersLookup = buildUsersLookupMap(staffRecords);
    const staffById = new Map<number, any>();
    for (const staff of staffRecords) {
      const staffId = pickNumber(staff, "id", "commusoft_id", "user_id", "userId");
      if (staffId > 0) staffById.set(staffId, staff);
    }

    const mapContact = (raw: any): CustomerContact => {
      const contactFirstName = pickString(raw, "name");
      const contactSurname = pickString(raw, "surname");
      const contactName =
        contactFirstName && contactSurname
          ? `${contactFirstName} ${contactSurname}`.trim()
          : contactFirstName ||
            contactSurname ||
            pickString(
              raw,
              "contact_name",
              "fullName",
              "full_name",
              "Contact Name",
              "first_name",
              "firstname"
            );

      return {
        contactId: pickNumber(raw, "id", "contactId", "contact_id", "commusoft_id"),
        name: contactName,
        email: pickString(raw, "emailaddress", "email", "contactemail", "contact_email", "Email"),
        phone: "",
        role: pickString(raw, "position", "role", "type", "contact_type", "job_title", "title"),
      };
    };

    const mapEngineer = (
      raw: any,
      staffMap: Map<number, any>,
      lookup: UsersLookupMaps
    ): AssignedEngineer => {
      const engineerId = pickNumber(
        raw,
        "engineerId",
        "engineer_id",
        "resource_id",
        "resourceId",
        "user_id",
        "userId",
        "id"
      );
      const staff = engineerId > 0 ? staffMap.get(engineerId) : undefined;
      const nameFromStaff = staff
        ? pickString(
            staff,
            "name",
            "full_name",
            "fullName",
            "display_name",
            "firstname",
            "first_name"
          ) ||
          [pickString(staff, "firstname", "first_name"), pickString(staff, "surname", "last_name")]
            .filter(Boolean)
            .join(" ")
        : "";

      const email =
        pickString(raw, "email", "Email") || pickString(staff, "email", "Email");

      const base: AssignedEngineer = {
        engineerId,
        engineerName: pickString(
          raw,
          "engineerName",
          "engineer_name",
          "name",
          "resource_name",
          "Resource Name",
          "Engineer Name"
        ) || nameFromStaff,
        email,
        phone: "",
        mobile: "",
      };

      return applyUserPhonesToEngineer(base, lookup);
    };

    const extractAssignedEngineers = (
      job: any,
      staffMap: Map<number, any>,
      lookup: UsersLookupMaps
    ): AssignedEngineer[] => {
      const embeddedLists = [
        job?.assignedEngineers,
        job?.engineers,
        job?.resources,
        job?.assigned_engineers,
        job?.["Assigned Engineers"],
      ].filter(Array.isArray);

      if (embeddedLists.length > 0 && embeddedLists[0]) {
        return embeddedLists[0].map((entry: any) => mapEngineer(entry, staffMap, lookup));
      }

      const singleId = pickNumber(
        job,
        "resource_id",
        "resourceId",
        "engineer_id",
        "engineerId",
        "assigned_engineer_id",
        "user_id"
      );
      if (singleId > 0) {
        return [mapEngineer({ id: singleId, engineerId: singleId }, staffMap, lookup)];
      }

      const singleName = pickString(
        job,
        "engineer_name",
        "Engineer Name",
        "resource_name",
        "Resource Name",
        "assigned_engineer"
      );
      if (singleName) {
        return [
          applyUserPhonesToEngineer(
            {
              engineerId: singleId,
              engineerName: singleName,
              email: pickString(job, "engineer_email", "Engineer Email"),
              phone: "",
              mobile: "",
            },
            lookup
          ),
        ];
      }

      return [];
    };

    const mapJob = (
      raw: any,
      staffMap: Map<number, any>,
      lookup: UsersLookupMaps
    ): CustomerJob => ({
      jobId: pickNumber(raw, "id", "jobId", "job_id", "Job ID", "Job Id"),
      jobNumber: "",
      description: pickString(
        raw,
        "description",
        "job_description",
        "Job Description",
        "work_description"
      ),
      status: pickString(raw, "status", "job_status", "Job Status", "stage"),
      createdDate: pickString(
        raw,
        "createdondatetime",
        "created_date",
        "createdDate",
        "date",
        "job_created_date",
        "Job Created Date",
        "created_at"
      ),
      completedDate: pickString(
        raw,
        "completedon",
        "completed_date",
        "completedDate",
        "completion_date",
        "Job Completed Date",
        "date_completed"
      ),
      assignedEngineers: extractAssignedEngineers(raw, staffMap, lookup),
    });

    const mapCustomerShell = (customer: any): CustomerDetailRecord => ({
      customerId: pickNumber(
        customer,
        "customer_id",
        "customerId",
        "id",
        "commusoft_id",
        "Customer ID"
      ),
      customerName: pickString(
        customer,
        "customer_name",
        "customerName",
        "name",
        "company_name",
        "contact_name",
        "Customer Name"
      ),
      email: pickString(
        customer,
        "emailaddress",
        "email",
        "company_email",
        "contactemail",
        "contact_email",
        "Customer Email"
      ),
      phone: pickString(
        customer,
        "telephonenumber",
        "phone",
        "landline",
        "company_landline",
        "contact_landline",
        "Customer Landline"
      ),
      mobile: pickString(
        customer,
        "mobile",
        "company_mobile",
        "contact_mobile",
        "Customer Mobile"
      ),
      addressLine1: pickString(
        customer,
        "addressline1",
        "address_line_1",
        "addressLine1",
        "address",
        "Customer Address Line 1",
        "address_street"
      ),
      addressLine2: pickString(
        customer,
        "addressline2",
        "address_line_2",
        "addressLine2",
        "Customer Address Line 2"
      ),
      town: pickString(customer, "town", "city", "Customer Address Town", "address_city"),
      postcode: pickString(
        customer,
        "postcode",
        "zip",
        "Customer Address Postcode",
        "address_postcode"
      ),
      country: pickString(customer, "countrycode", "country", "Customer Address Country", "address_country"),
      // TODO: resolve customertypesid to name via customer-type cache when loaded in this method
      customerType: "",
      contacts: [],
      totalJobCount: 0,
      jobs: [],
    });

    const enrichCustomer = async (customer: any): Promise<CustomerDetailRecord> => {
      const shell = mapCustomerShell(customer);
      const customerApiId = resolveCustomerApiId(customer);

      if (!customerApiId) {
        console.warn(
          `[Commusoft:customerDetails] skipping enrichment — missing customer id  name=${shell.customerName}`
        );
        return shell;
      }

      let contacts: CustomerContact[] = [];
      let jobs: CustomerJob[] = [];

      const [contactsResult, jobsResult] = await Promise.allSettled([
        axios.get(`${COMMUSOFT_API_BASE}/customers/${customerApiId}/contacts`, { params }),
        axios.get(`${COMMUSOFT_API_BASE}/customers/${customerApiId}/jobs`, { params }),
      ]);

      if (contactsResult.status === "fulfilled") {
        const contactsData = contactsResult.value.data;
        if (customerApiId === "1000") {
          console.log("[DEBUG] Raw contacts:", JSON.stringify(contactsData, null, 2));
        }
        const contactRows = extractCommusoftArray(contactsData, [
          "Contacts",
          "contacts",
          "Contact",
          "contact",
        ]);
        contacts = contactRows.map(mapContact);
      } else {
        const contactErr = contactsResult.reason as any;
        console.error(
          `[Commusoft:customerDetails] contacts failed  customerId=${customerApiId}  error=${contactErr?.message ?? contactErr}`
        );
      }

      if (jobsResult.status === "fulfilled") {
        const jobsData = extractCommusoftArray(jobsResult.value.data, ["Jobs", "jobs", "Job"]);
        if (customerApiId === "1000") {
          console.log(
            "[DEBUG] Raw jobs[0]:",
            JSON.stringify(jobsData[0] ?? jobsResult.value.data, null, 2)
          );
        }
        jobs = jobsData.map((job) => mapJob(job, staffById, usersLookup));
      } else {
        const jobErr = jobsResult.reason as any;
        console.error(
          `[Commusoft:customerDetails] jobs failed  customerId=${customerApiId}  error=${jobErr?.message ?? jobErr}`
        );
      }

      return {
        ...shell,
        customerId: shell.customerId || pickNumber({ id: customerApiId }, "id"),
        contacts,
        jobs,
        totalJobCount: jobs.length,
      };
    };

    const enriched: CustomerDetailRecord[] = [];

    for (let i = 0; i < customers.length; i += CUSTOMER_DETAILS_BATCH_SIZE) {
      const batch = customers.slice(i, i + CUSTOMER_DETAILS_BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((customer) => enrichCustomer(customer)));
      enriched.push(...batchResults);

      const processed = Math.min(i + batch.length, total);
      console.log(`[Commusoft:customerDetails] processed ${processed}/${total} customers`);

      if (i + CUSTOMER_DETAILS_BATCH_SIZE < customers.length) {
        await sleep(CUSTOMER_DETAILS_BATCH_DELAY_MS);
      }
    }

    // Enrich jobs with diary events (who worked, when it was scheduled)
    try {
      const engineersByJobId = new Map<number, AssignedEngineer[]>();
      const scheduledDateByJobId = new Map<number, string>();

      try {
        const diaryRes = await axios.get(`${COMMUSOFT_API_BASE}/diaryevents`, {
          params: {
            ...params,
            fromdate: "2020-01-01",
            todate: "2026-12-31",
          },
        });
        const diaryEvents = extractCommusoftArray(diaryRes.data, ["events", "Events"]);

        for (const event of diaryEvents as any[]) {
          const jobId = pickNumber(event?.redirectDetails ?? event, "jobId", "job_id", "id");
          if (jobId <= 0) continue;

          const resourceId = pickNumber(event, "resourceId", "resource_id");
          const engineerName = pickString(event, "userName", "user_name", "engineerName");
          if (!engineerName && resourceId <= 0) continue;

          const staff = resourceId > 0 ? staffById.get(resourceId) : undefined;
          const email = pickString(staff, "email", "Email");
          const entry = applyUserPhonesToEngineer(
            {
              engineerId: resourceId > 0 ? resourceId : 0,
              engineerName:
                engineerName ||
                [pickString(staff, "firstname", "first_name"), pickString(staff, "surname", "last_name")]
                  .filter(Boolean)
                  .join(" ") ||
                pickString(staff, "name", "full_name"),
              email,
              phone: "",
              mobile: "",
            },
            usersLookup
          );
          if (!entry.engineerName) continue;

          const existing = engineersByJobId.get(jobId) ?? [];
          const isAlreadyListed = existing.some(
            (existingEngineer) =>
              existingEngineer.engineerId === entry.engineerId &&
              existingEngineer.engineerName.toLowerCase() === entry.engineerName.toLowerCase()
          );
          if (!isAlreadyListed) existing.push(entry);
          engineersByJobId.set(jobId, existing);

          const eventDate = formatDiaryEventStartDate(event.start);
          if (eventDate && !scheduledDateByJobId.has(jobId)) {
            scheduledDateByJobId.set(jobId, eventDate);
          }
        }

        if (engineersByJobId.size > 0) {
          console.log(
            `[Commusoft:customerDetails] diary events mapped for ${engineersByJobId.size} jobs`
          );
        }
      } catch (diaryErr: any) {
        console.log(
          "[Commusoft:customerDetails] diary lookup failed:",
          diaryErr?.message ?? diaryErr
        );
      }


      for (const customer of enriched) {
        if (!customer.jobs) continue;
        for (const job of customer.jobs) {
          const diaryEngineers = engineersByJobId.get(job.jobId);
          if (diaryEngineers && diaryEngineers.length > 0) {
            job.assignedEngineers = diaryEngineers;
          }
          const diaryDate = scheduledDateByJobId.get(job.jobId);
          if (diaryDate) {
            job.createdDate = diaryDate;
          }
        }
      }

      for (const customer of enriched) {
        if (!customer.jobs) continue;
        for (const job of customer.jobs) {
          job.assignedEngineers = job.assignedEngineers.map((engineer) =>
            applyUserPhonesToEngineer(engineer, usersLookup)
          );
        }
      }
    } catch (error: any) {
      console.log("[Commusoft:customerDetails] enrichment threw:", error?.message);
    }

    return enriched;
  }

  
static async getStaffMembers(userId: string) {
  const params = await getParams(userId);

  const response = await axios.get(`${COMMUSOFT_API_BASE}/users`, {
    params,
  });

  console.log("getStaffMembers response keys:", Object.keys(response.data));

  const records: any[] =
    response.data.users ?? response.data.Users ?? response.data;

  if (!Array.isArray(records)) {
    throw new ApiError(502, "Commusoft users response invalid format");
  }

  if (records.length === 0) {
    console.log("No staff records found");
    return [];
  }


  return records;
}


static async getCustomerTypeRecords(userId: string) {
    const params = await getParams(userId);

    const response = await axios.get(`${COMMUSOFT_API_BASE}/customertypes`, {
      params,
    });

    const records = response.data.customertypes;
    console.log("Fetched customer types from Commusoft:", records);
    if (!Array.isArray(records)) {
      throw new ApiError(502, "Commusoft customertypes response invalid format");
    }


    return records;
}


static async getCustomerTypes(userId: string) {
    const records = await CommusoftService.getCustomerTypeRecords(userId);
    return records.map((customerTypeRecord: any) => customerTypeRecord.description);
}


static async getUserPreference(userId: string) {
    const params = await getParams(userId);

    const response = await axios.get(`${COMMUSOFT_API_BASE}/diary/userpreference`, {
      params,
      timeout: COMMUSOFT_API_TIMEOUT_MS,
    });

    const Resdata = response.data?.data?.users ?? response.data?.users;

    if (!Array.isArray(Resdata)) {
      throw new ApiError(502, "Commusoft user preference response invalid format");
    }


    return Resdata;
}

static async getDiaryEvents(
  userId: string,
  filters: Record<string, string | undefined> = {}
) {
    const params = await getParams(userId);
    const requestParams = Object.fromEntries(
      Object.entries({ ...params, ...filters }).filter(([, value]) => value)
    );

    const response = await axios.get(`${COMMUSOFT_API_BASE}/diaryevents`, {
      params: requestParams,
    });

    return response.data;
}

static async getJobDescriptions(userId: string) {
    const params = await getParams(userId);

    const response = await axios.get(`${COMMUSOFT_API_BASE}/jobdescriptions`, {
      params,
    });

    return response.data;
}

static async getOpportunityPipelines(
  userId: string,
  filters: Record<string, string | undefined> = {}
) {
    const params = await getParams(userId);
    const requestParams = Object.fromEntries(
      Object.entries({ ...params, ...filters }).filter(([, value]) => value)
    );

    const response = await axios.get(`${COMMUSOFT_API_BASE}/pipelines`, {
      params: requestParams,
    });

    return response.data;
}

static async getOpportunityPipelineStages(userId: string, pipelineId: string) {
    const params = await getParams(userId);

    try {
      const response = await axios.get(`${COMMUSOFT_API_BASE}/pipelines/${pipelineId}`, {
        params,
      });

      const stages = extractCommusoftArray(response.data, [
        ...COMMUSOFT_OPPORTUNITY_ARRAY_KEYS,
      ]);
      if (stages.length > 0) {
        return response.data;
      }
    } catch (err: any) {
      console.warn(
        `[Commusoft] /pipelines/${pipelineId} did not return usable stages; falling back to stage scan: ${err?.response?.status ?? err?.message}`
      );
    }

    const scan = await CommusoftService.scanStageOpportunities(userId, {
      from: 1,
      to: 50,
      limit: "5",
    });

    return {
      pipelineId,
      stages: scan.matches.map((match) => {
        const sample = match.sample ?? {};
        const sampleTitle =
          sample.Title ??
          sample.title ??
          sample.opportunityName ??
          sample.fullContactName ??
          sample.customerName;

        return {
          id: match.stageId,
          stageId: match.stageId,
          description: sampleTitle
            ? `Stage ${match.stageId} (${match.count} opportunit${match.count === 1 ? "y" : "ies"} - ${sampleTitle})`
            : `Stage ${match.stageId} (${match.count} opportunit${match.count === 1 ? "y" : "ies"})`,
          count: match.count,
          source: "stageopportunities-scan",
        };
      }),
      scan,
    };
}

static async getStageOpportunities(
  userId: string,
  stageId: string,
  filters: Record<string, string | undefined> = {}
) {
    const params = await getParams(userId);
    const requestParams = Object.fromEntries(
      Object.entries({ ...params, ...filters }).filter(([, value]) => value)
    );

    const response = await axios.get(`${COMMUSOFT_API_BASE}/sales/${stageId}/stageopportunities`, {
      params: requestParams,
    });

    return response.data;
}

static async getOpportunityDetails(userId: string, opportunityId: string) {
    const params = await getParams(userId);

    const response = await axios.get(`${COMMUSOFT_API_BASE}/opportunitydetails/${opportunityId}`, {
      params,
    });

    return response.data;
}

static async getCustomerOpportunityStages(
  userId: string,
  customerId: string,
  opportunityId: string
) {
    const params = await getParams(userId);

    const response = await axios.get(
      `${COMMUSOFT_API_BASE}/customers/${customerId}/opportunities/${opportunityId}/stages`,
      { params }
    );

    return response.data;
}

static async getOpportunityTemplates(userId: string) {
    const params = await getParams(userId);

    const response = await axios.get(`${COMMUSOFT_API_BASE}/opportunitytemplates`, {
      params,
    });

    return response.data;
}

static async getOutstandingJobsAndEstimates(
  userId: string,
  filters: Record<string, string | undefined> = {}
) {
    const params = await getParams(userId);
    const requestParams = Object.fromEntries(
      Object.entries({ ...params, ...filters }).filter(([, value]) => value)
    );

    const response = await axios.get(`${COMMUSOFT_API_BASE}/alloutstandingjobsandestimate`, {
      params: requestParams,
    });

    return response.data;
}

static async scanStageOpportunities(
  userId: string,
  options: {
    from?: number;
    to?: number;
    limit?: string;
    enrich?: boolean;
    searchText?: string;
    salesPersonId?: string;
    lowValue?: string;
    highValue?: string;
  } = {}
) {
    const from = Math.max(1, options.from ?? 1);
    const to = Math.min(Math.max(from, options.to ?? 50), 200);
    const results: Array<{
      stageId: number;
      count: number;
      hasRecords: boolean;
      sample?: any;
      error?: string;
    }> = [];

    for (let stageId = from; stageId <= to; stageId += 1) {
      try {
        const body = await CommusoftService.getStageOpportunities(userId, String(stageId), {
          limit: options.limit,
          searchText: options.searchText,
          salesPersonId: options.salesPersonId,
          lowValue: options.lowValue,
          highValue: options.highValue,
        });
        const records = extractCommusoftArray(body, [...COMMUSOFT_OPPORTUNITY_ARRAY_KEYS]);
        let sample = records[0] as Record<string, unknown> | undefined;
        const sampleId = opportunityIdOf(sample);
        if (options.enrich && sampleId) {
          try {
            sample = {
              ...sample,
              opportunityDetails: await CommusoftService.getOpportunityDetails(userId, sampleId),
            };
          } catch (detailErr: any) {
            sample = {
              ...sample,
              opportunityDetailsError: detailErr?.response?.status
                ? `HTTP ${detailErr.response.status}`
                : detailErr?.message ?? "Unknown error",
            };
          }
        }
        results.push({
          stageId,
          count: records.length,
          hasRecords: records.length > 0,
          ...(sample ? { sample } : {}),
        });
      } catch (stageError: any) {
        results.push({
          stageId,
          count: 0,
          hasRecords: false,
          error: stageError?.response?.status
            ? `HTTP ${stageError.response.status}`
            : stageError?.message ?? "Unknown error",
        });
      }
    }

    return {
      from,
      to,
      matches: results.filter((result) => result.hasRecords),
      results,
    };
}

  static async findConnection(userId: string) {
    return commusoftIntegrationRepository.findByUserId(userId);
  }

  static async getConnectionStatus(userId: string) {
    const [integration, ownerProfile] = await Promise.all([
      commusoftIntegrationRepository.findByUserId(userId),
      commusoftIntegrationRepository.findOwnerProfile(userId),
    ]);

    return {
      connected: Boolean(integration),
      account: integration
        ? {
            ownerName: ownerProfile?.full_name.trim() || ownerProfile?.email || null,
            companyName: ownerProfile?.organization.name ?? null,
            username: integration.username,
            clientId: integration.client_id,
            applicationId: integration.application_id,
            connectedAt: integration.updated_at,
          }
        : null,
    };
  }

  /**
   * Disconnect (remove stored credentials) for a user
   */
  static async disconnect(userId: string) {
    const deletedCount = await commusoftIntegrationRepository.deleteByUserId(userId);

    if (deletedCount === 0) {
      throw new ApiError(404, "No active Commusoft connection found for this user");
    }

    return { disconnected: true };
  }

  /**
   * Create a new customer in Commusoft.
   *
   * Flow:
   *  1. Fetch the customer types live from Commusoft so a type added in the
   *     Commusoft UI is always resolvable.
   *  2. Resolve { id, uuid } by the description the UI sent — id drives the
   *     URL path, uuid goes into the customertype[uuid] body field.
   *  3. Generate a fresh uuid for customertype[contacts][uuid]. That field
   *     identifies the new contact record (per-record), not the type.
   */
  static async createCustomer(
    userId: string,
    customerData: Record<string, any>
  ) {
    const params = await getParams(userId);
    const customerTypeDescription = customerData.customer_type;

    if (!customerTypeDescription) {
      throw new ApiError(400, "customer_type is required");
    }

    const customerTypes = await CommusoftService.getCustomerTypeRecords(userId);
    const customerType = customerTypes.find(
      (customerTypeRecord: any) =>
        String(customerTypeRecord.description ?? "").trim().toLowerCase() ===
        String(customerTypeDescription).trim().toLowerCase()
    );

    if (!customerType) {
      throw new ApiError(
        404,
        `Customer type "${customerTypeDescription}" not found after refresh`
      );
    }

    const { id: customerTypeId, uuid: customerTypeUuid } = customerType;

    const { customer_type, ...restData } = customerData;
    const payload: Record<string, any> = {};

    // Customer-level simple fields (flat mapping)
    const customerFieldMap: Record<string, string> = {
      address_line_1: "customertype[addressline1]",
      address_line_2: "customertype[addressline2]",
      address_line_3: "customertype[addressline3]",
      town: "customertype[town]",
      county: "customertype[county]",
      postcode: "customertype[postcode]",
    };

    for (const [key, value] of Object.entries(restData)) {
      if (value === undefined || value === null || value === "") continue;
      const apiKey = customerFieldMap[key];
      if (apiKey) payload[apiKey] = value;
    }

    // Contact name — company_name takes precedence over name for commercial types
    const contactName = restData.company_name || restData.name;
    if (contactName) payload["customertype[contacts][name]"] = contactName;

    if (restData.surname) {
      payload["customertype[contacts][surname]"] = restData.surname;
    }

    // Title: API expects numeric settingsTitlesid. Send only if the UI
    // provided an id-like value; skip raw strings like "Mr" so the POST
    // isn't rejected wholesale for one optional field.
    if (restData.title && !Number.isNaN(Number(restData.title))) {
      payload["customertype[contacts][settingsTitlesid]"] = restData.title;
    }

    // Email — company_email wins over email (commercial types fill the
    // company field; individuals fill the regular one). Both collapse to the
    // same Commusoft field since the API has no separate "company email".
    const contactEmail = restData.company_email || restData.email;
    if (contactEmail) {
      payload["customertype[contacts][contactsemail][emailaddress]"] =
        contactEmail;
    }

    // Phone numbers: Commusoft uses indexed slots under contactstelephone.
    // Slot 0 = landline, slot 1 = mobile. Country code is sent per-slot.
    // company_landline wins over landline on the same priority logic as email.
    const contactLandline = restData.company_landline || restData.landline;
    if (contactLandline) {
      payload[
        "customertype[contacts][contactstelephone][0][telephonenumber]"
      ] = contactLandline;
      if (restData.country_code) {
        payload[
          "customertype[contacts][contactstelephone][0][countrycode]"
        ] = restData.country_code;
      }
    }

    if (restData.mobile) {
      payload[
        "customertype[contacts][contactstelephone][1][telephonenumber]"
      ] = restData.mobile;
      if (restData.country_code) {
        payload[
          "customertype[contacts][contactstelephone][1][countrycode]"
        ] = restData.country_code;
      }
    }

    // Fresh UUIDs per request — Commusoft treats customertype[uuid] as the new
    // customer's primary key and rejects duplicate values with a 500.
    const freshCustomerUuid = randomUUID();
    const freshContactUuid  = randomUUID();

    console.log(`[Commusoft:createCustomer] 🆕 fresh UUIDs generated  customer=${freshCustomerUuid}  contact=${freshContactUuid}`);

    payload["customertype[uuid]"]           = freshCustomerUuid;
    payload["customertype[contacts][uuid]"] = freshContactUuid;

    const formBody = toFormBody(payload);
    const targetUrl = `${COMMUSOFT_API_BASE}/customers/${customerTypeId}`;

    console.log("=====================================");
    console.log("📤 [Commusoft:createCustomer] FINAL REQUEST");
    console.log("→ URL:    ", targetUrl);
    console.log("→ Method: POST");
    console.log("→ customer_type:", {
      description: customerTypeDescription,
      id: customerTypeId,
      typeUuid: customerTypeUuid,
      freshCustomerUuid,
      freshContactUuid,
    });
    console.log("→ payload (object):", JSON.stringify(payload, null, 2));
    console.log("→ payload (form-urlencoded):", formBody.toString());
    console.log("=====================================");

    try {
      const response = await axios.post(targetUrl, formBody, {
        params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      console.log(
        `✅ [Commusoft:createCustomer] success  status=${response.status}  uuid=${freshCustomerUuid}  response=${JSON.stringify(response.data)?.slice(0, 400)}`
      );


      return {
        ...response.data,
        customer_uuid: freshCustomerUuid,
        contact_uuid: freshContactUuid,
      };
    } catch (err: any) {
      console.error("=====================================");
      console.error("❌ [Commusoft:createCustomer] FAILED");
      console.error("  status:        ", err?.response?.status);
      console.error("  statusText:    ", err?.response?.statusText);
      console.error("  response body: ", JSON.stringify(err?.response?.data, null, 2));
      console.error("  sent payload:  ", JSON.stringify(payload, null, 2));
      console.error("=====================================");
      throw err;
    }
  }

  /**
   * Resolve a Commusoft customer_id from a direct id/uuid, name, or email.
   * Always fetches live data from Commusoft (GET /customers) so lookups are
   * never stale.
   */
  static async resolveCustomerId(
    userId: string,
    lookup: {
      customer_id?: string | number;
      uuid?: string;
      customer_name?: string;
      email?: string;
    }
  ): Promise<string> {
    const hasCriteria =
      lookup.customer_id || lookup.uuid || lookup.customer_name || lookup.email;
    if (!hasCriteria) {
      throw new ApiError(
        400,
        "customer_id, uuid, customer_name, or email is required to identify the customer"
      );
    }

    if (lookup.customer_id) {
      return String(lookup.customer_id);
    }

    const records: any[] = await CommusoftService.getCustomers(userId);

    const normalizeText = (value: any) => String(value ?? "").trim().toLowerCase();
    const target = {
      id: lookup.customer_id ? String(lookup.customer_id) : "",
      uuid: normalizeText(lookup.uuid),
      name: normalizeText(lookup.customer_name),
      email: normalizeText(lookup.email),
    };

    const match = records.find((customer: any) => {
      if (
        target.id &&
        (String(customer.customer_id) === target.id || String(customer.id) === target.id)
      )
        return true;
      if (target.uuid && normalizeText(customer.uuid) === target.uuid) return true;
      if (
        target.email &&
        (normalizeText(customer.email) === target.email ||
          normalizeText(customer.emailaddress) === target.email ||
          normalizeText(customer.company_email) === target.email ||
          normalizeText(customer.contactemail) === target.email)
      )
        return true;
      if (target.name) {
        const candidates = [
          customer.customer_name,
          customer.name,
          [customer.name, customer.surname].filter(Boolean).join(" "),
          customer.company_name,
          customer.companyname,
          customer.contact_name,
        ].map(normalizeText);
        if (candidates.some((candidate) => candidate && candidate.includes(target.name))) return true;
      }
      return false;
    });

    const resolved = match?.customer_id ?? match?.id ?? match?.uuid;
    if (!resolved) {
      throw new ApiError(
        404,
        `Commusoft customer not found for lookup ${JSON.stringify(lookup)}`
      );
    }
    return String(resolved);
  }

  /**
   * Create a new job in Commusoft under a customer.
   * POST /api/v1/customers/{customerId}/jobs with job[...] form params.
   */
  static async createJob(userId: string, jobData: Record<string, any>) {
    const params = await getParams(userId);

    const customerId = await CommusoftService.resolveCustomerId(userId, {
      customer_id: jobData.customer_id,
      uuid: jobData.customer_uuid,
      customer_name: jobData.customer_name,
      email: jobData.email,
    });

    if (!jobData.description && !jobData.job_description) {
      throw new ApiError(400, "description (or job_description) is required");
    }

    const fieldMap: Record<string, string> = {
      description: "job[description]",
      job_description: "job[description]",
      engineer_notes: "job[engineernotes]",
      po_number: "job[ponumber]",
      priority: "job[priority]",
      quoted_amount: "job[quotedamount]",
      invoice_category_id: "job[invoicecategoryid]",
      user_group_id: "job[usergroupsid]",
      access_notes: "job[accessnotes]",
      access_method: "job[workaddressaccessmethod]",
      contact_id: "job[contactid]",
      additional_contact_id: "job[additionalcontactid]",
      settings_job_description_id: "job[settingsjobdescriptionid]",
      is_service_job: "job[isservicejob]",
      uuid: "job[uuid]",
      selected_skill: "job[selectedSkill]",
    };

    const skipKeys = new Set([
      "customer_id",
      "customer_uuid",
      "customer_name",
      "email",
    ]);
    const payload: Record<string, any> = {};
    for (const [key, value] of Object.entries(jobData)) {
      if (skipKeys.has(key)) continue;
      if (value === undefined || value === null || value === "") continue;
      const apiKey = fieldMap[key] ?? key;
      payload[apiKey] = value;
    }

    if (!payload["job[uuid]"]) {
      payload["job[uuid]"] = randomUUID();
    }

    const response = await axios.post(
      `${COMMUSOFT_API_BASE}/customers/${customerId}/jobs`,
      toFormBody(payload),
      {
        params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return response.data;
  }

  /**
   * Create a Commusoft diary event. For survey bookings we normally create a
   * job first, then book a diary event against that job with eventType=job.
   */
  static async createDiaryEvent(
    userId: string,
    diaryData: Record<string, any>
  ) {
    const params = await getParams(userId);

    const fieldMap: Record<string, string> = {
      event_type: "data[eventType]",
      eventType: "data[eventType]",
      description: "data[description]",
      engineer_notes: "data[engineer_notes]",
      event_start: "data[event_start]",
      event_end: "data[event_end]",
      all_day: "data[allDay]",
      allDay: "data[allDay]",
      resource_id: "data[resourceId]",
      resourceId: "data[resourceId]",
      estimate_id: "data[estimateid]",
      estimateid: "data[estimateid]",
      job_id: "data[jobid]",
      jobid: "data[jobid]",
      milestone_id: "data[milestoneId]",
      milestoneId: "data[milestoneId]",
      is_recurring_event: "data[is_recurring_event]",
      repeat_type: "data[repeat_type]",
      repeats_every: "data[repeats_every]",
      repeats_on: "data[repeats_on]",
      occurrences: "data[occurrences]",
      uuid: "data[uuid]",
      access_method: "data[accessmethod]",
      accessmethod: "data[accessmethod]",
      access_notes: "data[accessnotes]",
      accessnotes: "data[accessnotes]",
    };

    const payload: Record<string, any> = {};
    for (const [key, value] of Object.entries(diaryData)) {
      if (value === undefined || value === null || value === "") continue;
      const apiKey = fieldMap[key] ?? key;
      payload[apiKey] = value;
    }

    if (!payload["data[uuid]"]) {
      payload["data[uuid]"] = randomUUID();
    }

    const response = await axios.post(
      `${COMMUSOFT_API_BASE}/diaryevents`,
      toFormBody(payload),
      {
        params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return response.data;
  }

  /**
   * Create a Commusoft sales opportunity for an existing customer.
   *
   * Commusoft's public Zapier action exposes this as "Create Opportunity" and
   * requires an opportunity template. The API shape follows the customer/job
   * pattern: POST under the customer with Symfony form-encoded opportunity data.
   */
  static async createOpportunity(
    userId: string,
    opportunityData: Record<string, any>
  ) {
    const params = await getParams(userId);

    const customerId = await CommusoftService.resolveCustomerId(userId, {
      customer_id: opportunityData.customer_id,
      uuid: opportunityData.customer_uuid,
      customer_name: opportunityData.customer_name,
      email: opportunityData.email,
    });

    let templateId =
      opportunityData.opportunity_template_id ?? opportunityData.template_id;

    if (!templateId) {
      const templates = extractCommusoftArray(
        await CommusoftService.getOpportunityTemplates(userId),
        [...COMMUSOFT_OPPORTUNITY_ARRAY_KEYS]
      );
      const firstTemplate = templates[0] as Record<string, any> | undefined;
      templateId =
        firstTemplate?.id ??
        firstTemplate?.ID ??
        firstTemplate?.templateId ??
        firstTemplate?.template_id ??
        firstTemplate?.["Template Id"] ??
        firstTemplate?.["Template ID"];
      if (!templateId) {
        throw new ApiError(400, "opportunity_template_id is required and no default Commusoft opportunity template was found");
      }
      console.log(`[Commusoft:createOpportunity] no template supplied — using first available template id=${templateId}`);
    }

    const skipKeys = new Set([
      "customer_id",
      "customer_uuid",
      "customer_name",
      "email",
      "template_id",
      "opportunity_template_id",
    ]);

    const fieldMap: Record<string, string> = {
      opportunity_name: "opportunity[name]",
      name: "opportunity[name]",
      opportunity_notes: "opportunity[notes]",
      notes: "opportunity[notes]",
      description: "opportunity[description]",
      sales_person_id: "opportunity[salesPersonId]",
      salesperson_id: "opportunity[salesPersonId]",
      value: "opportunity[value]",
      estimated_value: "opportunity[value]",
      uuid: "opportunity[uuid]",
    };

    const basePayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(opportunityData)) {
      if (skipKeys.has(key)) continue;
      if (value === undefined || value === null || value === "") continue;
      const apiKey = fieldMap[key] ?? key;
      basePayload[apiKey] = value;
    }

    if (!basePayload["opportunity[uuid]"]) {
      basePayload["opportunity[uuid]"] = randomUUID();
    }

    const templateKeys = [
      "opportunity[opportunityTemplateId]",
      "opportunity[opportunitytemplateid]",
      "opportunity[templateId]",
      "opportunity[templateid]",
      "opportunity[opportunitytemplatesid]",
    ];

    let lastError: any = null;
    for (const templateKey of templateKeys) {
      const payload = {
        ...basePayload,
        [templateKey]: templateId,
      };

      try {
        console.log(
          `[Commusoft:createOpportunity] → POST /customers/${customerId}/opportunities  templateKey=${templateKey}  fields=[${Object.keys(payload).join(", ")}]`
        );
        const response = await axios.post(
          `${COMMUSOFT_API_BASE}/customers/${customerId}/opportunities`,
          toFormBody(payload),
          {
            params,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }
        );

        return {
          ...response.data,
          customer_id: customerId,
          opportunity_template_id: templateId,
        };
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status;
        const body = err?.response?.data;
        console.warn(
          `[Commusoft:createOpportunity] attempt failed templateKey=${templateKey} status=${status} body=${JSON.stringify(body)?.slice(0, 300)}`
        );
        if (status && status >= 500) break;
      }
    }

    throw lastError;
  }

  /**
   * Fetch jobs from the live Commusoft API with optional filters (first page only).
   * Filter keys match the ones the UI sends for ServiceM8, so the frontend needs no changes.
   * staffUuid / categoryUuid / queueUuid have no Commusoft jobs-API equivalent.
   */
  static async listJobsFiltered(
    userId: string,
    filters: CommusoftJobFilters
  ): Promise<Record<string, unknown>[]> {
    const jobs = await CommusoftService.fetchJobsPage(
      userId,
      { startingRecord: FIRST_STARTING_RECORD, pageSize: COMMUSOFT_API_BATCH_SIZE },
      filters
    );

    console.log(
      `[Commusoft:listJobsFiltered] filters=${JSON.stringify(filters)}  returned=${jobs.length} jobs`
    );
    return jobs;
  }

  /** One page of GET /jobs. `startingRecord` is 1-based, as the Commusoft API expects. */
  static async fetchJobsPage(
    userId: string,
    page: { startingRecord: number; pageSize: number },
    filters: CommusoftJobFilters = {}
  ): Promise<Record<string, unknown>[]> {
    const authParams = await getParams(userId);

    const response = await axios.get(`${COMMUSOFT_API_BASE}/jobs`, {
      params: {
        ...authParams,
        ...buildJobFilterParams(filters),
        "number of records": page.pageSize,
        "starting record": page.startingRecord,
      },
      timeout: COMMUSOFT_JOBS_TIMEOUT_MS,
    });

    return extractCommusoftArray(response.data, ["Jobs", "jobs", "Job"]) as Record<string, unknown>[];
  }

  /** Every job matching the filters, page by page until the API returns a short page. */
  static async fetchAllJobs(
    userId: string,
    filters: CommusoftJobFilters = {}
  ): Promise<Record<string, unknown>[]> {
    const allJobs: Record<string, unknown>[] = [];

    for (
      let startingRecord = FIRST_STARTING_RECORD;
      ;
      startingRecord += COMMUSOFT_JOBS_FULL_PAGE_SIZE
    ) {
      const jobsPage = await CommusoftService.fetchJobsPage(
        userId,
        { startingRecord, pageSize: COMMUSOFT_JOBS_FULL_PAGE_SIZE },
        filters
      );
      allJobs.push(...jobsPage);

      if (jobsPage.length < COMMUSOFT_JOBS_FULL_PAGE_SIZE) return allJobs;
      await sleep(COMMUSOFT_API_PAGE_DELAY_MS);
    }
  }
}
