import axios from "axios";
import type { SimproIntegration } from "@prisma/client";
import { ApiError } from "../../../../utils/ApiError.js";
import { stripHtml } from "../../../../utils/sanitize.js";
import { refreshSimproAccessToken } from "../utils/refreshAccessToken.js";
import { simproIntegrationRepository } from "../repositories/simpro-integration.repository.js";

/**
 * Simpro API integration.
 *
 * Two URLs are involved per tenant:
 *   • OAuth + API base = `https://{build}.simprosuite.com`
 *     - OAuth authorize:  /oauth2/authorize
 *     - OAuth token:      /oauth2/token
 *     - REST API:         /api/v1.0/companies/{companyId}/...
 *
 * Each Simpro tenant is a "build" with its own subdomain. The tenant build name
 * is captured at OAuth connect time (user enters it before being redirected to
 * authorize) and persisted on the `simpro_integrations` row alongside tokens.
 *
 * companyId on each request: most Simpro builds have a single company with id=0,
 * but multi-company builds expose more. We default to the value stored on the
 * integration row (set at connect time after listing /companies/).
 */

// Concurrency-safe token refresh (one in-flight refresh per user).
const refreshLocks = new Map<string, Promise<any>>();

// Refresh proactively 5 min before expiry — matches ServiceM8 adapter behaviour.
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const SIMPRO_CUSTOMER_COLUMNS =
  "ID,Type,CompanyName,GivenName,FamilyName,Email,Phone,AltPhone,Address,BillingAddress,AmountOwing,Archived,DateModified";
const SIMPRO_CUSTOMERS_PAGE_SIZE = 250;
const SIMPRO_CUSTOMERS_PAGE_DELAY_MS = 1100;

const SIMPRO_JOB_COLUMNS =
  "ID,Type,Customer,Site,SiteContact,OrderNo,RequestNo,Name,Description,Notes,Status,Stage,DateIssued,DueDate,Total,Tags,Technicians,DateModified";
const SIMPRO_JOBS_PAGE_SIZE = 250;
const SIMPRO_JOBS_PAGE_DELAY_MS = 150;

const SIMPRO_SITE_COLUMNS =
  "ID,Name,Address,Customers,Archived,DateModified";
const SIMPRO_SITES_PAGE_SIZE = 250;
const SIMPRO_SITES_PAGE_DELAY_MS = 150;

const SIMPRO_SCHEDULES_PAGE_SIZE = 250;
const SIMPRO_SCHEDULES_PAGE_DELAY_MS = 150;
const SIMPRO_SCHEDULES_TYPE_FILTER = "job";

/** List endpoint only accepts these columns (others return 422). */
const SIMPRO_EMPLOYEE_LIST_COLUMNS = "ID,Name,Archived";
const SIMPRO_EMPLOYEES_DETAIL_DELAY_MS = 200;

const SIMPRO_API_TIMEOUT_MS = 30_000;
const FIRST_PAGE = 1;
/** Safety stop for list endpoints that never return a short page. */
const SIMPRO_MAX_PAGES = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SimproIntegrationRow = SimproIntegration;

type SimproPageOptions = {
  pageSize: number;
  pageDelayMs: number;
  params?: Record<string, string>;
};

const getIntegrationRaw = async (
  userId: string
): Promise<SimproIntegrationRow> => {
  const integration = await simproIntegrationRepository.findByUserId(userId);

  if (!integration) {
    throw new ApiError(
      404,
      "Simpro integration not found. Please connect your account first."
    );
  }
  return integration;
};

/**
 * Returns a row guaranteed to have a valid access_token.
 * Refreshes 5 min before expiry; deduplicates concurrent refreshes per user.
 *
 * forceRefresh=true → skip the expiry check and refresh immediately.
 * Used by getSimproContext after a 401 to recover from externally-revoked tokens.
 */
export const getIntegration = async (
  userId: string,
  forceRefresh = false
): Promise<SimproIntegrationRow> => {
  const row = await getIntegrationRaw(userId);

  if (row.needs_reauth) {
    throw new ApiError(
      401,
      "Simpro connection requires re-authentication. Please reconnect your Simpro account."
    );
  }

  // expires_at = null means API key auth — never expires, never refresh
  if (!row.expires_at) return row;

  const expiry = new Date(row.expires_at).getTime();
  const tokenFresh = !forceRefresh && Date.now() < expiry - REFRESH_BUFFER_MS;

  if (tokenFresh) {
    return row;
  }

  if (!row.refresh_token) {
    throw new ApiError(401, "Simpro refresh token missing — user must reconnect");
  }

  if (!refreshLocks.has(userId)) {
    const refreshPromise = (async () => {
      const refreshed = await refreshSimproAccessToken(userId, row.refresh_token!);
      return {
        ...row,
        access_token:  refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at:    new Date(Date.now() + refreshed.expires_in * 1000),
        needs_reauth:  false,
      };
    })().finally(() => refreshLocks.delete(userId));

    refreshLocks.set(userId, refreshPromise);
  }

  return refreshLocks.get(userId)!;
};

type SimproContext = { headers: Record<string, string>; baseUrl: string; companyId: number };

const buildContext = (row: SimproIntegrationRow): SimproContext => ({
  headers: {
    Authorization:  `Bearer ${row.access_token}`,
    Accept:         "application/json",
    "Content-Type": "application/json",
  },
  baseUrl:   row.base_url.replace(/\/+$/, ""),
  companyId: row.company_id ?? 0,
});

/**
 * Convenience: bearer headers + tenant base URL + company id, all in one call.
 * Wraps a live call so a 401 triggers a force-refresh + single retry before
 * propagating the error (handles tokens revoked externally in Simpro admin).
 */
export const getSimproContext = async (userId: string): Promise<SimproContext> => {
  const row = await getIntegration(userId);
  return buildContext(row);
};

/**
 * Execute a Simpro API call with automatic 401 recovery.
 * On a 401 response the access token is force-refreshed once and the call is
 * retried. Use this wrapper for all outbound Simpro REST calls.
 */
export const withSimproRetry = async <T>(
  userId: string,
  fn: (ctx: SimproContext) => Promise<T>
): Promise<T> => {
  const ctx = await getSimproContext(userId);
  try {
    return await fn(ctx);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      console.warn(`[Simpro] 401 for user=${userId} — force-refreshing token and retrying`);
      const freshRow = await getIntegration(userId, true);
      return await fn(buildContext(freshRow));
    }
    throw err;
  }
};

/**
 * Just the bearer headers. Webhook adapter uses this without needing baseUrl.
 */
export const getSimproHeaders = async (
  userId: string
): Promise<Record<string, string>> => {
  const { headers } = await getSimproContext(userId);
  return headers;
};

// ─── Service class (mirrors ServiceM8Service / CommusoftService) ───────────
export class SimproService {
  /**
   * Exchange the OAuth authorization code for tokens and persist the row.
   * Called from the OAuth callback after the user picks their tenant (build).
   */
  static async exchangeCodeForTokens(
    userId: string,
    buildName: string,
    code: string,
    redirectUri: string
  ) {
    const baseUrl = `https://${buildName}.simprosuite.com`;
    const tokenUrl = `${baseUrl}/oauth2/token`;

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  redirectUri,
        client_id:     process.env.SIMPRO_CLIENT_ID!,
        client_secret: process.env.SIMPRO_CLIENT_SECRET!,
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new ApiError(
        tokenRes.status,
        tokenData?.error_description || tokenData?.error || "Simpro token exchange failed"
      );
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));

    // Try to resolve the first companyId so subsequent calls don't have to.
    let companyId = 0;
    try {
      const companies = await axios.get(`${baseUrl}/api/v1.0/companies/`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (Array.isArray(companies.data) && companies.data.length > 0) {
        companyId = Number(companies.data[0].ID ?? companies.data[0].id ?? 0);
      } else {
        companyId = 0;
      }
    } catch (err: any) {
      console.warn(`[Simpro] companies lookup failed during connect — defaulting to 0: ${err?.message}`);
      companyId = 0;
    }

    await simproIntegrationRepository.saveConnection({
      user_id:       userId,
      build_name:    buildName,
      base_url:      baseUrl,
      company_id:    companyId,
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at:    expiresAt,
      scopes:        tokenData.scope ?? null,
    });

    return { build_name: buildName, company_id: companyId, expires_at: expiresAt.toISOString() };
  }

  // ─── Live reads (simPRO data is never stored; every read calls the API) ──

  /** Reads every page of a simPRO list endpoint until a short page or Result-Total is reached. */
  private static async fetchAllPages(
    userId: string,
    resourcePath: string,
    options: SimproPageOptions
  ): Promise<Record<string, unknown>[]> {
    const allRecords: Record<string, unknown>[] = [];

    for (let page = FIRST_PAGE; page <= SIMPRO_MAX_PAGES; page++) {
      const { batch, totalRecords } = await SimproService.fetchPage(userId, resourcePath, page, options);
      allRecords.push(...batch);

      const hasReachedTotal = totalRecords > 0 && allRecords.length >= totalRecords;
      if (batch.length < options.pageSize || hasReachedTotal) break;
      await sleep(options.pageDelayMs);
    }

    return allRecords;
  }

  private static async fetchPage(
    userId: string,
    resourcePath: string,
    page: number,
    options: SimproPageOptions
  ): Promise<{ batch: Record<string, unknown>[]; totalRecords: number }> {
    return withSimproRetry(userId, async (context) => {
      const url = `${context.baseUrl}/api/v1.0/companies/${context.companyId}/${resourcePath}/`;
      const response = await axios.get(url, {
        headers: context.headers,
        timeout: SIMPRO_API_TIMEOUT_MS,
        params: { ...options.params, pageSize: options.pageSize, page },
      });

      const batch = Array.isArray(response.data) ? response.data : [];
      // axios lower-cases response header names.
      const totalRecords = parseInt(String(response.headers["result-total"] ?? "0"), 10) || 0;
      return { batch, totalRecords };
    });
  }

  private static toCustomerRecord(userId: string, customer: Record<string, unknown>) {
    const address = customer.Address as Record<string, unknown> | undefined;
    const billing = customer.BillingAddress as Record<string, unknown> | undefined;

    return {
      user_id: userId,
      customer_api_id: String(customer.ID),
      type: (customer.Type as string) || null,
      company_name: (customer.CompanyName as string) || null,
      given_name: (customer.GivenName as string) || null,
      family_name: (customer.FamilyName as string) || null,
      email: (customer.Email as string) || null,
      phone: (customer.Phone as string) || null,
      alt_phone: (customer.AltPhone as string) || null,
      address_line: (address?.Address as string) || null,
      city: (address?.City as string) || null,
      state: (address?.State as string) || null,
      postal_code: (address?.PostalCode as string) || null,
      country: (address?.Country as string) || null,
      billing_address_line: (billing?.Address as string) || null,
      billing_city: (billing?.City as string) || null,
      billing_state: (billing?.State as string) || null,
      billing_postal_code: (billing?.PostalCode as string) || null,
      billing_country: (billing?.Country as string) || null,
      amount_owing: customer.AmountOwing ?? 0,
      archived: customer.Archived ?? false,
      simpro_date_modified: (customer.DateModified as string) || null,
      payload: customer,
    };
  }

  /** GET /simpro/customers — every customer, live from simPRO. */
  static async getCustomers(userId: string) {
    const customers = await SimproService.fetchAllPages(userId, "customers", {
      pageSize: SIMPRO_CUSTOMERS_PAGE_SIZE,
      pageDelayMs: SIMPRO_CUSTOMERS_PAGE_DELAY_MS,
      params: { columns: SIMPRO_CUSTOMER_COLUMNS },
    });
    return customers.map((customer) => SimproService.toCustomerRecord(userId, customer));
  }

  private static toJobRecord(job: Record<string, unknown>, userId: string) {
    const customer = job.Customer as Record<string, unknown> | undefined;
    const site = job.Site as Record<string, unknown> | undefined;
    const siteContact = job.SiteContact as Record<string, unknown> | undefined;
    const status = job.Status as Record<string, unknown> | undefined;
    const total = job.Total as Record<string, unknown> | undefined;

    return {
      user_id: userId,
      job_api_id: String(job.ID),
      type: (job.Type as string) || null,
      name: (job.Name as string) || null,
      description: stripHtml(job.Description as string),
      notes: stripHtml(job.Notes as string),
      order_no: (job.OrderNo as string) || null,
      request_no: (job.RequestNo as string) || null,
      customer_api_id: customer?.ID != null ? String(customer.ID) : null,
      customer_type: (customer?.Type as string) || null,
      customer_company_name: (customer?.CompanyName as string) || null,
      customer_given_name: (customer?.GivenName as string) || null,
      customer_family_name: (customer?.FamilyName as string) || null,
      site_api_id: site?.ID != null ? String(site.ID) : null,
      site_name: (site?.Name as string) || null,
      site_contact_api_id: siteContact?.ID != null ? String(siteContact.ID) : null,
      site_contact_given_name: (siteContact?.GivenName as string) || null,
      site_contact_family_name: (siteContact?.FamilyName as string) || null,
      status_id: (status?.ID as number) ?? null,
      status_name: (status?.Name as string) || null,
      status_color: (status?.Color as string) || null,
      stage: (job.Stage as string) || null,
      date_issued: (job.DateIssued as string) || null,
      due_date: (job.DueDate as string) || null,
      simpro_date_modified: (job.DateModified as string) || null,
      total_ex_tax: total?.ExTax ?? null,
      total_tax: total?.Tax ?? null,
      total_inc_tax: total?.IncTax ?? null,
      technicians: job.Technicians ?? [],
      tags: job.Tags ?? [],
      payload: job,
    };
  }

  /** GET /simpro/jobs — every job, live from simPRO. */
  static async getJobs(userId: string) {
    const jobs = await SimproService.fetchAllPages(userId, "jobs", {
      pageSize: SIMPRO_JOBS_PAGE_SIZE,
      pageDelayMs: SIMPRO_JOBS_PAGE_DELAY_MS,
      params: { columns: SIMPRO_JOB_COLUMNS },
    });
    return jobs.map((job) => SimproService.toJobRecord(job, userId));
  }

  private static toSiteRecord(site: Record<string, unknown>, userId: string) {
    const address = site.Address as Record<string, unknown> | undefined;
    const customers = Array.isArray(site.Customers) ? site.Customers : [];
    const primaryCustomer = (customers[0] ?? {}) as Record<string, unknown>;

    return {
      user_id: userId,
      site_api_id: String(site.ID),
      name: (site.Name as string) || null,
      address_line: (address?.Address as string) || null,
      city: (address?.City as string) || null,
      state: (address?.State as string) || null,
      postal_code: (address?.PostalCode as string) || null,
      country: (address?.Country as string) || null,
      primary_customer_api_id:
        primaryCustomer.ID != null ? String(primaryCustomer.ID) : null,
      primary_customer_type: (primaryCustomer.Type as string) || null,
      primary_customer_company_name:
        (primaryCustomer.CompanyName as string) || null,
      primary_customer_given_name: (primaryCustomer.GivenName as string) || null,
      primary_customer_family_name:
        (primaryCustomer.FamilyName as string) || null,
      customers,
      customers_count: customers.length,
      archived: site.Archived ?? false,
      simpro_date_modified: (site.DateModified as string) || null,
      payload: site,
    };
  }

  /** GET /simpro/sites — every site, live from simPRO. */
  static async getSites(userId: string) {
    const sites = await SimproService.fetchAllPages(userId, "sites", {
      pageSize: SIMPRO_SITES_PAGE_SIZE,
      pageDelayMs: SIMPRO_SITES_PAGE_DELAY_MS,
      params: { columns: SIMPRO_SITE_COLUMNS },
    });
    return sites.map((site) => SimproService.toSiteRecord(site, userId));
  }

  private static toEmployeeRecord(
    employee: Record<string, unknown>,
    userId: string
  ) {
    const primaryContact = (employee.PrimaryContact ?? {}) as Record<string, unknown>;
    const address = (employee.Address ?? {}) as Record<string, unknown>;
    const accountSetup = (employee.AccountSetup ?? {}) as Record<string, unknown>;
    const userProfile = (employee.UserProfile ?? {}) as Record<string, unknown>;
    const payRates = (employee.PayRates ?? {}) as Record<string, unknown>;
    const storageDevice = (userProfile.StorageDevice ?? {}) as Record<string, unknown>;

    return {
      user_id: userId,
      employee_api_id: String(employee.ID),
      name: (employee.Name as string) || null,
      position: (employee.Position as string) || null,
      email: (primaryContact.Email as string) || null,
      secondary_email: (primaryContact.SecondaryEmail as string) || null,
      work_phone: (primaryContact.WorkPhone as string) || null,
      cell_phone: (primaryContact.CellPhone as string) || null,
      extension: (primaryContact.Extension as string) || null,
      address_line: (address.Address as string) || null,
      city: (address.City as string) || null,
      state: (address.State as string) || null,
      postal_code: (address.PostalCode as string) || null,
      country: (address.Country as string) || null,
      date_of_hire: (employee.DateOfHire as string) || null,
      pay_rate: payRates.PayRate ?? null,
      employment_cost: payRates.EmploymentCost ?? null,
      overhead: payRates.Overhead ?? null,
      username: (accountSetup.Username as string) || null,
      is_salesperson: userProfile.IsSalesperson ?? false,
      is_project_manager: userProfile.IsProjectManager ?? false,
      storage_device: (storageDevice.Name as string) || null,
      availability: employee.Availability ?? [],
      assigned_cost_centers: employee.AssignedCostCenters ?? [],
      zones: employee.Zones ?? [],
      custom_fields: employee.CustomFields ?? [],
      archived: employee.Archived ?? false,
      simpro_date_created: (employee.DateCreated as string) || null,
      simpro_date_modified: (employee.DateModified as string) || null,
      payload: employee,
    };
  }

  /** Minimal employee list (ID, Name, Archived only). */
  private static async fetchEmployeesList(
    userId: string
  ): Promise<Record<string, unknown>[]> {
    return withSimproRetry(userId, async (ctx) => {
      const url = `${ctx.baseUrl}/api/v1.0/companies/${ctx.companyId}/employees/`;
      const res = await axios.get(url, {
        headers: ctx.headers,
        timeout: SIMPRO_API_TIMEOUT_MS,
        params: { columns: SIMPRO_EMPLOYEE_LIST_COLUMNS },
      });
      return Array.isArray(res.data) ? res.data : [];
    });
  }

  /** Full employee record from detail endpoint. */
  private static async fetchEmployeeDetail(
    userId: string,
    employeeId: string
  ): Promise<Record<string, unknown>> {
    return withSimproRetry(userId, async (ctx) => {
      const url = `${ctx.baseUrl}/api/v1.0/companies/${ctx.companyId}/employees/${employeeId}`;
      const res = await axios.get(url, {
        headers: ctx.headers,
        timeout: SIMPRO_API_TIMEOUT_MS,
      });
      return (res.data ?? {}) as Record<string, unknown>;
    });
  }

  /** Full employee records, one detail call per id (the list endpoint only returns ID/Name/Archived). */
  private static async fetchEmployeeDetails(
    userId: string,
    employeeIds: string[]
  ): Promise<Record<string, unknown>[]> {
    const employees: Record<string, unknown>[] = [];

    for (const employeeId of employeeIds) {
      try {
        employees.push(await SimproService.fetchEmployeeDetail(userId, employeeId));
      } catch (error: any) {
        // One unreadable employee must not hide all the others.
        console.error(`[simPRO Employees] Employee ${employeeId} fetch failed:`, error?.message ?? error);
      }
      await sleep(SIMPRO_EMPLOYEES_DETAIL_DELAY_MS);
    }

    return employees;
  }

  /** GET /simpro/employees — every employee with full details, live from simPRO. */
  static async getEmployees(userId: string) {
    const employeesList = await SimproService.fetchEmployeesList(userId);
    const employeeIds = employeesList
      .map((employee) => String(employee.ID ?? ""))
      .filter(Boolean);

    const employees = await SimproService.fetchEmployeeDetails(userId, employeeIds);
    return employees.map((employee) => SimproService.toEmployeeRecord(employee, userId));
  }

  private static toScheduleRecord(schedule: Record<string, unknown>, userId: string) {
    const staff = (schedule.Staff ?? {}) as Record<string, unknown>;
    const project = (schedule.Project ?? {}) as Record<string, unknown>;
    const blocks = Array.isArray(schedule.Blocks) ? schedule.Blocks : [];
    const firstBlock = (blocks[0] ?? {}) as Record<string, unknown>;
    const scheduleRate = (firstBlock.ScheduleRate ?? {}) as Record<string, unknown>;

    return {
      user_id: userId,
      schedule_api_id: String(schedule.ID),
      type: (schedule.Type as string) || null,
      reference: (schedule.Reference as string) || null,
      total_hours: schedule.TotalHours ?? null,
      schedule_date: (schedule.Date as string) || null,

      staff_api_id: staff.ID != null ? String(staff.ID) : null,
      staff_name: (staff.Name as string) || null,
      staff_type: (staff.Type as string) || null,

      project_id: project.ProjectID != null ? String(project.ProjectID) : null,
      section_id: project.SectionID != null ? String(project.SectionID) : null,
      cost_center_id:
        project.CostCenterID != null ? String(project.CostCenterID) : null,

      blocks,

      schedule_rate_id: (scheduleRate.ID as number) ?? null,
      schedule_rate_name: (scheduleRate.Name as string) || null,
      start_time: (firstBlock.ISO8601StartTime as string) || null,
      end_time: (firstBlock.ISO8601EndTime as string) || null,

      payload: schedule,
    };
  }

  /** GET /simpro/schedules — every job schedule (Type=job), live from simPRO. */
  static async getSchedules(userId: string) {
    const schedules = await SimproService.fetchAllPages(userId, "schedules", {
      pageSize: SIMPRO_SCHEDULES_PAGE_SIZE,
      pageDelayMs: SIMPRO_SCHEDULES_PAGE_DELAY_MS,
      params: { Type: SIMPRO_SCHEDULES_TYPE_FILTER },
    });
    return schedules.map((schedule) => SimproService.toScheduleRecord(schedule, userId));
  }

  /**
   * Create a customer in Simpro. Type is decided by `customer_type` input:
   *   "company"    → POST /customers/companies/
   *   "individual" → POST /customers/individuals/
   * Defaults to "individual" since most lead-capture flows produce a person.
   */
  static async createCustomer(
    userId: string,
    customerData: Record<string, any>
  ): Promise<any> {
    const { headers, baseUrl, companyId } = await getSimproContext(userId);

    const kind = String(customerData.customer_type || "individual").toLowerCase();
    const endpoint =
      kind === "company"
        ? `customers/companies`
        : `customers/individuals`;

    const url = `${baseUrl}/api/v1.0/companies/${companyId}/${endpoint}/`;

    // Build payload — drop empty/null values, drop our control field, then
    // alias frontend-friendly keys to Simpro's PascalCase fields.
    const { customer_type, ...rest } = customerData;
    const aliasMap: Record<string, string> = {
      // snake_case convenience aliases
      first_name:    "GivenName",
      last_name:     "FamilyName",
      name:          "CompanyName",
      company_name:  "CompanyName",
      email:         "Email",
      phone:         "Phone",
      mobile:        "CellPhone",
      alt_phone:     "AltPhone",
      website:       "Website",
      fax:           "Fax",
      ein:           "EIN",
      company_number:"CompanyNumber",
      do_not_call:   "DoNotCall",
      archived:      "Archived",
      // Address aliases (snake_case → dot-path)
      address:       "Address.Address",
      city:          "Address.City",
      state:         "Address.State",
      postcode:      "Address.PostalCode",
      country:       "Address.Country",
      // Banking aliases (snake_case → dot-path)
      on_stop:                  "Banking.OnStop",
      vendor_order_no_required: "Banking.VendorOrderNoRequired",
      credit_limit:             "Banking.CreditLimit",
      bank_account_name:        "Banking.AccountName",
      bank_routing_no:          "Banking.RoutingNo",
      bank_account_no:          "Banking.AccountNo",
      bank_payment_method:      "Banking.PaymentMethod",
      // Rates aliases
      discount_fee: "Rates.DiscountFee",
      // Profile aliases
      notes:            "Profile.Notes",
      account_manager:  "Profile.AccountManager",
      currency:         "Profile.Currency",
      sites:            "Sites",
    };

    const payload: Record<string, any> = {};
    const dropped: string[] = [];
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
        dropped.push(k);
        continue;
      }
      // Skip section-header pseudo-fields (prefixed with _section_)
      if (k.startsWith("_section_")) continue;

      const apiKey = aliasMap[k] || k; // PascalCase keys pass through unchanged
      // Coerce boolean strings to actual booleans
      const coerced = v === "true" ? true : v === "false" ? false : v;
      // Sites must be an array of integer IDs
      if (apiKey === "Sites") {
        payload["Sites"] = [Number(v)];
      } else if (apiKey.includes(".")) {
        // Support dot-paths: Address.Address → { Address: { Address: v } }
        const [parent, child] = apiKey.split(".") as [string, string];
        // ID sub-fields (AccountManager, Currency, CustomerProfile, CustomerGroup, PaymentMethod) must be integers
        const ID_SUBFIELDS = new Set(["AccountManager", "Currency", "CustomerProfile", "CustomerGroup", "PaymentMethod"]);
        const finalVal = ID_SUBFIELDS.has(child) ? Number(coerced) : coerced;
        payload[parent] = { ...(payload[parent] || {}), [child]: finalVal };
      } else {
        payload[apiKey] = coerced;
      }
    }

    console.log(
      `[Simpro:createCustomer] → POST ${url}  kind=${kind}  fields=[${Object.keys(payload).join(", ")}]  dropped=[${dropped.join(", ") || "(none)"}]`
    );

    try {
      const res = await axios.post(url, payload, { headers });
      console.log(
        `[Simpro:createCustomer] ✓ status=${res.status}  id=${res.data?.ID ?? res.data?.id ?? "(none)"}  body=${JSON.stringify(res.data)?.slice(0, 300)}`
      );
      return res.data;
    } catch (err: any) {
      console.error(
        `[Simpro:createCustomer] ✖ failed  status=${err?.response?.status}  body=${JSON.stringify(err?.response?.data)?.slice(0, 400)}  message=${err?.message}`
      );
      throw err;
    }
  }

  static async createJob(
    userId: string,
    jobData: Record<string, any>
  ): Promise<any> {
    const { headers, baseUrl, companyId } = await getSimproContext(userId);
    const url = `${baseUrl}/api/v1.0/companies/${companyId}/jobs/`;

    const aliasMap: Record<string, string> = {
      // snake_case convenience aliases
      customer_id:        "Customer",
      customer_uuid:      "Customer",
      customer:           "Customer",
      site_id:            "Site",
      site:               "Site",
      customer_contact:   "CustomerContact",
      site_contact:       "SiteContact",
      order_no:           "OrderNo",
      name:               "Name",
      description:        "Description",
      job_description:    "Description",
      notes:              "Notes",
      date_issued:        "DateIssued",
      due_date:           "DueDate",
      due_time:           "DueTime",
      tags:               "Tags",
      salesperson:        "Salesperson",
      project_manager:    "ProjectManager",
      technician:         "Technician",
      stage:              "Stage",
      job_status:         "Status",
      status:             "Status",
      response_time:      "ResponseTime",
      auto_adjust_status: "AutoAdjustStatus",
    };

    const payload: Record<string, any> = {};
    const dropped: string[] = [];
    for (const [k, v] of Object.entries(jobData)) {
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
        dropped.push(k);
        continue;
      }
      if (k.startsWith("_section_")) continue;
      const apiKey = aliasMap[k] || k;
      const coerced = v === "true" ? true : v === "false" ? false : v;
      if (apiKey.includes(".")) {
        const [parent, child] = apiKey.split(".") as [string, string];
        payload[parent] = { ...(payload[parent] || {}), [child]: coerced };
      } else {
        payload[apiKey] = coerced;
      }
    }

    console.log(
      `[Simpro:createJob] → POST ${url}  fields=[${Object.keys(payload).join(", ")}]  dropped=[${dropped.join(", ") || "(none)"}]`
    );

    try {
      const res = await axios.post(url, payload, { headers });
      console.log(`[Simpro:createJob] ✓ status=${res.status}  id=${res.data?.ID ?? "(none)"}`);
      return res.data;
    } catch (err: any) {
      console.error(
        `[Simpro:createJob] ✖ failed  status=${err?.response?.status}  body=${JSON.stringify(err?.response?.data)?.slice(0, 400)}  message=${err?.message}`
      );
      throw err;
    }
  }

  // ─── API Key connect (Grant Type = "API Key" in Simpro Setup → API) ────────
  // The API key is a permanent non-expiring access_token. We store it with a
  // far-future expires_at so the refresh logic never triggers for it.
  static async connectWithApiKey(
    userId: string,
    buildName: string,
    apiKey: string
  ) {
    const baseUrl = `https://${buildName}.simprosuite.com`;

    // Verify the key works and resolve company id in one shot.
    let companyId = 0;
    try {
      const res = await axios.get(`${baseUrl}/api/v1.0/companies/`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        companyId = Number(res.data[0].ID ?? res.data[0].id ?? 0);
      }
      console.log(`[Simpro:apiKey] ✓ key valid  build=${buildName}  company_id=${companyId}`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw new ApiError(401, "Invalid Simpro API key — check the key and try again.");
      }
      console.warn(`[Simpro:apiKey] companies lookup failed (${status}) — defaulting to 0`);
    }

    await simproIntegrationRepository.saveConnection({
      user_id:       userId,
      build_name:    buildName,
      base_url:      baseUrl,
      company_id:    companyId,
      access_token:  apiKey,
      refresh_token: null,   // API keys have no refresh token
      expires_at:    null,   // null = never expires, refresh logic skipped
      scopes:        "api_key",
    });

    return { build_name: buildName, company_id: companyId, auth_type: "api_key" };
  }

  // ─── Contacts ──────────────────────────────────────────────────────────
  static async createContact(
    userId: string,
    customerId: string | number,
    contactData: Record<string, any>
  ): Promise<any> {
    const { headers, baseUrl, companyId } = await getSimproContext(userId);
    const url = `${baseUrl}/api/v1.0/companies/${companyId}/customers/${customerId}/contacts/`;

    const aliasMap: Record<string, string> = {
      first_name:  "GivenName",
      last_name:   "FamilyName",
      email:       "Email",
      phone:       "WorkPhone",   // simPRO uses WorkPhone not Phone for contacts
      work_phone:  "WorkPhone",
      mobile:      "CellPhone",
      position:    "Position",
      role:        "Position",
      title:       "Title",
      fax:         "Fax",
      department:  "Department",
      notes:       "Notes",
      alt_phone:   "AltPhone",
    };

    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(contactData)) {
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) continue;
      if (k.startsWith("_section_")) continue;
      payload[aliasMap[k] || k] = v;
    }

    console.log(`[Simpro:createContact] → POST ${url}  fields=[${Object.keys(payload).join(", ")}]`);
    try {
      const res = await axios.post(url, payload, { headers });
      console.log(`[Simpro:createContact] ✓ status=${res.status}  id=${res.data?.ID ?? "(none)"}`);
      return res.data;
    } catch (err: any) {
      console.error(`[Simpro:createContact] ✖ status=${err?.response?.status}  body=${JSON.stringify(err?.response?.data)?.slice(0, 400)}`);
      throw err;
    }
  }

  // ─── Leads ─────────────────────────────────────────────────────────────
  static async createLead(
    userId: string,
    leadData: Record<string, any>
  ): Promise<any> {
    const { headers, baseUrl, companyId } = await getSimproContext(userId);
    const url = `${baseUrl}/api/v1.0/companies/${companyId}/leads/`;

    const aliasMap: Record<string, string> = {
      // snake_case convenience aliases
      name:             "LeadName",
      lead_name:        "LeadName",
      description:      "Description",
      notes:            "Notes",
      follow_up_date:   "FollowUpDate",
      tags:             "Tags",
      customer:         "Customer",
      customer_id:      "Customer",
      site:             "Site",
      site_id:          "Site",
      customer_contact: "CustomerContact",
      sales_person:     "Salesperson",
      salesperson:      "Salesperson",
      project_manager:  "ProjectManager",
      status_id:        "Status",
      status:           "Status",
      cost_center:      "CostCenter",
      auto_adjust_status: "AutoAdjustStatus",
    };

    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(leadData)) {
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) continue;
      if (k.startsWith("_section_")) continue;
      const apiKey = aliasMap[k] || k; // PascalCase keys pass through unchanged
      const coerced = v === "true" ? true : v === "false" ? false : v;
      if (apiKey.includes(".")) {
        const [parent, child] = apiKey.split(".") as [string, string];
        payload[parent] = { ...(payload[parent] || {}), [child]: coerced };
      } else {
        payload[apiKey] = coerced;
      }
    }

    console.log(`[Simpro:createLead] → POST ${url}  fields=[${Object.keys(payload).join(", ")}]`);
    try {
      const res = await axios.post(url, payload, { headers });
      console.log(`[Simpro:createLead] ✓ status=${res.status}  id=${res.data?.ID ?? "(none)"}`);
      return res.data;
    } catch (err: any) {
      console.error(`[Simpro:createLead] ✖ status=${err?.response?.status}  body=${JSON.stringify(err?.response?.data)?.slice(0, 400)}`);
      throw err;
    }
  }

  // ─── Schedules ─────────────────────────────────────────────────────────
  static async createScheduleBlock(
    userId: string,
    scheduleData: Record<string, any>
  ): Promise<any> {
    const { headers, baseUrl, companyId } = await getSimproContext(userId);
    const url = `${baseUrl}/api/v1.0/companies/${companyId}/activitySchedules/`;

    // Block-level fields are assembled into a Blocks array
    const blockFields: Record<string, any> = {};
    const topLevel: Record<string, any> = {};

    const blockKeyMap: Record<string, string> = {
      start_time:    "StartTime",
      end_time:      "EndTime",
      schedule_rate: "ScheduleRate",
      StartTime:     "StartTime",
      EndTime:       "EndTime",
      ScheduleRate:  "ScheduleRate",
    };
    const topKeyMap: Record<string, string> = {
      staff_id:   "Staff",
      staff:      "Staff",
      date:       "Date",
      activity:   "Activity",
      notes:      "Notes",
      locked:     "IsLocked",
      is_locked:  "IsLocked",
      Staff:      "Staff",
      Date:       "Date",
      Activity:   "Activity",
      Notes:      "Notes",
      IsLocked:   "IsLocked",
    };

    for (const [k, v] of Object.entries(scheduleData)) {
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) continue;
      if (k.startsWith("_section_")) continue;
      const coerced = v === "true" ? true : v === "false" ? false : v;
      if (blockKeyMap[k]) {
        blockFields[blockKeyMap[k]] = coerced;
      } else if (topKeyMap[k]) {
        topLevel[topKeyMap[k]] = coerced;
      }
    }

    const payload: Record<string, any> = {
      ...topLevel,
      Blocks: [blockFields],
    };

    console.log(`[Simpro:createScheduleBlock] → POST ${url}  fields=[${Object.keys(payload).join(", ")}]  block=${JSON.stringify(blockFields)}`);
    try {
      const res = await axios.post(url, payload, { headers });
      console.log(`[Simpro:createScheduleBlock] ✓ status=${res.status}  id=${res.data?.ID ?? "(none)"}`);
      return res.data;
    } catch (err: any) {
      console.error(`[Simpro:createScheduleBlock] ✖ status=${err?.response?.status}  body=${JSON.stringify(err?.response?.data)?.slice(0, 400)}`);
      throw err;
    }
  }

  // ─── Sites ─────────────────────────────────────────────────────────────
  static async createSite(
    userId: string,
    siteData: Record<string, any>
  ): Promise<any> {
    const { headers, baseUrl, companyId } = await getSimproContext(userId);
    const url = `${baseUrl}/api/v1.0/companies/${companyId}/sites/`;

    const aliasMap: Record<string, string> = {
      // snake_case convenience aliases
      name:       "Name",
      customer_id:"Customers",
      address:    "Address.Address",
      city:       "Address.City",
      state:      "Address.State",
      postcode:   "Address.PostalCode",
      country:    "Address.Country",
      phone:      "Phone",
    };

    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(siteData)) {
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) continue;
      if (k.startsWith("_section_")) continue;
      const apiKey = aliasMap[k] || k;
      const coerced = v === "true" ? true : v === "false" ? false : v;
      // Customers must be an array of IDs
      if (apiKey === "Customers") {
        payload["Customers"] = [Number(v)];
      } else if (apiKey.includes(".")) {
        const [parent, child] = apiKey.split(".") as [string, string];
        payload[parent] = { ...(payload[parent] || {}), [child]: coerced };
      } else {
        payload[apiKey] = coerced;
      }
    }

    console.log(`[Simpro:createSite] → POST ${url}  fields=[${Object.keys(payload).join(", ")}]`);
    try {
      const res = await axios.post(url, payload, { headers });
      console.log(`[Simpro:createSite] ✓ status=${res.status}  id=${res.data?.ID ?? "(none)"}`);
      return res.data;
    } catch (err: any) {
      console.error(`[Simpro:createSite] ✖ status=${err?.response?.status}  body=${JSON.stringify(err?.response?.data)?.slice(0, 400)}`);
      throw err;
    }
  }

  // ─── Quotes ────────────────────────────────────────────────────────────
  static async createQuote(
    userId: string,
    quoteData: Record<string, any>
  ): Promise<any> {
    const { headers, baseUrl, companyId } = await getSimproContext(userId);
    const url = `${baseUrl}/api/v1.0/companies/${companyId}/quotes/`;

    const aliasMap: Record<string, string> = {
      // snake_case convenience aliases
      customer_id:      "Customer",
      site_id:          "Site",
      description:      "Description",
      name:             "Name",
      due_date:         "DueDate",
      date_issued:      "DateIssued",
      order_no:         "OrderNo",
      salesperson:      "Salesperson",
      project_manager:  "ProjectManager",
      auto_adjust_status: "AutoAdjustStatus",
    };

    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(quoteData)) {
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) continue;
      if (k.startsWith("_section_")) continue;
      const apiKey = aliasMap[k] || k;
      const coerced = v === "true" ? true : v === "false" ? false : v;
      if (apiKey.includes(".")) {
        const [parent, child] = apiKey.split(".") as [string, string];
        payload[parent] = { ...(payload[parent] || {}), [child]: coerced };
      } else {
        payload[apiKey] = coerced;
      }
    }

    console.log(`[Simpro:createQuote] → POST ${url}  fields=[${Object.keys(payload).join(", ")}]`);
    try {
      const res = await axios.post(url, payload, { headers });
      console.log(`[Simpro:createQuote] ✓ status=${res.status}  id=${res.data?.ID ?? "(none)"}`);
      return res.data;
    } catch (err: any) {
      console.error(`[Simpro:createQuote] ✖ status=${err?.response?.status}  body=${JSON.stringify(err?.response?.data)?.slice(0, 400)}`);
      throw err;
    }
  }

  // ─── Generic search helper ──────────────────────────────────────────────
  static async findRecords(
    userId: string,
    endpoint: string,
    searchParams: Record<string, any>
  ): Promise<any[]> {
    const { headers, baseUrl, companyId } = await getSimproContext(userId);
    const url = `${baseUrl}/api/v1.0/companies/${companyId}/${endpoint}`;

    const params: Record<string, any> = { pageSize: 10, page: 1 };
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== null && String(v).trim() !== "") params[k] = v;
    }

    console.log(`[Simpro:findRecords] → GET ${url}  params=${JSON.stringify(params)}`);
    try {
      const res = await axios.get(url, { headers, params });
      const results = Array.isArray(res.data) ? res.data : [];
      console.log(`[Simpro:findRecords] ← ${results.length} result(s)`);
      return results;
    } catch (err: any) {
      console.error(`[Simpro:findRecords] ✖ status=${err?.response?.status}  body=${JSON.stringify(err?.response?.data)?.slice(0, 400)}`);
      throw err;
    }
  }

  // ─── UI Dashboard (Commusoft-shape getalljobs) ───────────────────────────

  private static formatDateDDMMYY(d: string | null | undefined): string | null {
    if (!d) return null;
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(2)}`;
  }

  private static timeFromIso(iso: string | null | undefined): string {
    if (!iso || iso.length < 16) return "";
    return iso.substring(11, 16);
  }

  /**
   * Build the Commusoft-shape getalljobs response, live from simPRO.
   *
   * Paginates by distinct customers that have jobs (not all customers), so the
   * first page always returns groups with at least one job when data exists.
   * The cursor is the last customer id of the previous page.
   */
  static async getAllJobsCommusoftShape(
    userId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{
    data: Record<string, unknown>[];
    meta: {
      has_more: boolean;
      next_cursor: string | null;
      total_returned: number;
    };
  }> {
    const allJobs = await SimproService.getJobs(userId);

    const sortedCustomerIds = [
      ...new Set(
        allJobs
          .map((job) => job.customer_api_id)
          .filter((customerId): customerId is string => Boolean(customerId))
      ),
    ].sort();
    const remainingCustomerIds = cursor
      ? sortedCustomerIds.filter((customerId) => customerId > cursor)
      : sortedCustomerIds;
    const uniqueCustomerIds = remainingCustomerIds.slice(0, limit);

    if (uniqueCustomerIds.length === 0) {
      return {
        data: [],
        meta: { has_more: false, next_cursor: null, total_returned: 0 },
      };
    }

    const pageCustomerIds = new Set(uniqueCustomerIds);
    const jobRows = allJobs
      .filter((job) => job.customer_api_id !== null && pageCustomerIds.has(job.customer_api_id))
      .sort((first, second) => String(second.date_issued ?? "").localeCompare(String(first.date_issued ?? "")));
    const jobIds = new Set(jobRows.map((job) => job.job_api_id));
    const siteIds = new Set(
      jobRows.map((job) => job.site_api_id).filter((siteId): siteId is string => Boolean(siteId))
    );

    // Sequential on purpose: simPRO rate-limits parallel list scans.
    const customers = (await SimproService.getCustomers(userId)).filter((customer) =>
      pageCustomerIds.has(customer.customer_api_id)
    );
    const sites =
      siteIds.size > 0
        ? (await SimproService.getSites(userId)).filter((site) => siteIds.has(site.site_api_id))
        : [];
    const schedules = (await SimproService.getSchedules(userId))
      .filter((schedule) => schedule.project_id !== null && jobIds.has(schedule.project_id))
      .sort((first, second) => String(second.start_time ?? "").localeCompare(String(first.start_time ?? "")));

    const scheduledStaffIds = [
      ...new Set(
        schedules
          .map((schedule) => schedule.staff_api_id)
          .filter((staffId): staffId is string => Boolean(staffId))
      ),
    ];
    const employees = (await SimproService.fetchEmployeeDetails(userId, scheduledStaffIds)).map(
      (employee) => SimproService.toEmployeeRecord(employee, userId)
    );
    const sitesById = new Map(sites.map((site) => [site.site_api_id, site]));
    const employeesById = new Map(
      employees.map((employee) => [employee.employee_api_id, employee])
    );
    const employeesByName = new Map(
      employees.map((employee) => [employee.name, employee])
    );

    const schedulesByJobId = new Map<string, typeof schedules>();
    for (const schedule of schedules) {
      const jobId = schedule.project_id as string;
      if (!jobId) continue;
      if (!schedulesByJobId.has(jobId)) {
        schedulesByJobId.set(jobId, []);
      }
      schedulesByJobId.get(jobId)!.push(schedule);
    }

    const jobsByCustomerId = new Map<string, typeof jobRows>();
    for (const job of jobRows) {
      const customerId = job.customer_api_id as string;
      if (!customerId) continue;
      if (!jobsByCustomerId.has(customerId)) {
        jobsByCustomerId.set(customerId, []);
      }
      jobsByCustomerId.get(customerId)!.push(job);
    }

    const customersMap = new Map(
      customers.map((customer) => [customer.customer_api_id, customer])
    );

    const orderedCustomers = uniqueCustomerIds
      .map((id) => {
        const row = customersMap.get(id);
        if (row) return row;
        const firstJob = jobsByCustomerId.get(id)?.[0];
        if (!firstJob) return null;
        return {
          customer_api_id: id,
          company_name: firstJob.customer_company_name,
          given_name: firstJob.customer_given_name,
          family_name: firstJob.customer_family_name,
          type: firstJob.customer_type,
          email: null,
          phone: null,
          alt_phone: null,
          billing_address_line: null,
        };
      })
      .filter((customer): customer is NonNullable<typeof customer> => customer !== null);

    const result = orderedCustomers.map((customer) => {
        const customerJobs = jobsByCustomerId.get(customer.customer_api_id) ?? [];
        const firstJob = customerJobs[0];
        const primarySite = firstJob?.site_api_id
          ? sitesById.get(firstJob.site_api_id)
          : null;

        const customerName =
          customer.company_name ||
          `${customer.given_name || ""} ${customer.family_name || ""}`.trim() ||
          "Unknown";

        const customerAddress = customer.billing_address_line || "";

        return {
          contact: {
            name: customerName,
            email: customer.email || null,
            phone: customer.phone || null,
            mobile: customer.alt_phone || null,
            type: customer.type === "Company" ? "company" : "customer",
            is_primary_contact: null,
          },
          site: {
            name: primarySite?.name || customerName,
            website: null,
            abn_number: null,
            address: primarySite?.address_line || customerAddress,
            address_street: null,
            address_city: primarySite?.city || null,
            address_state: primarySite?.state || null,
            address_postcode: primarySite?.postal_code || null,
            address_country: primarySite?.country || null,
            billing_address: customerAddress,
            fax_number: null,
          },
          head_office: {
            name: customerName,
            address: customerAddress,
          },
          job_count: customerJobs.length,
          jobs: customerJobs.map((job) => {
            const jobSchedules = schedulesByJobId.get(job.job_api_id) ?? [];
            const latestSchedule = jobSchedules[0];

            const engineerEmployee = latestSchedule?.staff_api_id
              ? employeesById.get(latestSchedule.staff_api_id)
              : latestSchedule?.staff_name
                ? employeesByName.get(latestSchedule.staff_name)
                : null;

            const jobSite = job.site_api_id
              ? sitesById.get(job.site_api_id)
              : null;
            const jobAddressParts = [
              jobSite?.address_line,
              jobSite?.city,
              jobSite?.postal_code,
            ].filter(Boolean);

            const formatDiaryEvent = (schedule: (typeof schedules)[0]) => {
              const start = SimproService.timeFromIso(schedule.start_time);
              const end = SimproService.timeFromIso(schedule.end_time);
              const date = SimproService.formatDateDDMMYY(schedule.schedule_date);
              const hrs = schedule.total_hours ?? "";
              return `${date} ${hrs} hr(${start} to ${end})`;
            };

            return {
              job: {
                generated_job_id: job.job_api_id,
                status: job.status_name || job.stage || "pending",
                date: SimproService.formatDateDDMMYY(job.date_issued),
                job_address: jobAddressParts.join(", "),
                job_description: job.description || job.name || "",
                work_done_description: "",
                total_invoice_amount: job.total_inc_tax?.toString() || "0",
                purchase_order_number: job.order_no || null,
                category: null,
                quote_date: null,
                completion_date:
                  job.stage === "Complete"
                    ? SimproService.formatDateDDMMYY(job.date_issued)
                    : null,
                job_uuid: job.job_api_id,
                job_property_type: "customer",
                job_property_uuid: job.customer_api_id,
                is_recall: "No",
                number_of_certificates: null,
                job_stage: job.stage || null,
                created_from: "simPRO",
                job_on_hold_reasons: null,
                customer_contract: null,
                job_contract: null,
                priority: null,
              },
              engineer: {
                name: latestSchedule?.staff_name || null,
                email: engineerEmployee?.email || null,
                mobile: engineerEmployee?.cell_phone || null,
                job_title: engineerEmployee?.position || null,
                status_message: null,
                last_engineer_on_site: latestSchedule?.staff_name || null,
                next_engineer_on_site: null,
              },
              payment: {
                status: "0",
                amount: job.total_inc_tax?.toString() || "0",
                method: null,
                date: SimproService.formatDateDDMMYY(job.date_issued),
                total_invoice: job.total_inc_tax?.toString() || null,
                ready_to_invoice: job.stage === "Complete",
                payments: [],
              },
              activities:
                jobSchedules.length > 0
                  ? jobSchedules.map((schedule) => ({
                      start_date: formatDiaryEvent(schedule),
                      end_date: "",
                      scheduled: String(jobSchedules.length),
                      last_diary_event: latestSchedule
                        ? formatDiaryEvent(latestSchedule)
                        : "",
                      next_diary_event: "",
                      number_of_diary_events: String(jobSchedules.length),
                    }))
                  : [
                      {
                        start_date: "",
                        end_date: "",
                        scheduled: null,
                        last_diary_event: "",
                        next_diary_event: "",
                        number_of_diary_events: null,
                      },
                    ],
              jobmaterials: [],
            };
          }),
        };
    });

    const lastCustomerId =
      uniqueCustomerIds[uniqueCustomerIds.length - 1] ?? null;

    const hasMore = remainingCustomerIds.length > uniqueCustomerIds.length;

    return {
      data: result,
      meta: {
        has_more: hasMore,
        next_cursor: hasMore && lastCustomerId ? lastCustomerId : null,
        total_returned: result.length,
      },
    };
  }

  // ─── Connect / disconnect helpers ──────────────────────────────────────
  static async getConnectionStatus(userId: string) {
    const connection = await simproIntegrationRepository.findConnectionStatus(userId);
    return { connected: Boolean(connection), ...(connection ?? {}) };
  }

  static async disconnect(userId: string) {
    await simproIntegrationRepository.deleteByUserId(userId);
    return { disconnected: true };
  }
}
