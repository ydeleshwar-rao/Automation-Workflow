import axios, { AxiosInstance } from "axios";
import type { ZohoInventoryIntegration } from "@prisma/client";
import { ApiError } from "../../../../utils/ApiError.js";
import { refreshZohoAccessToken } from "../utils/refreshAccessToken.js";
import { zohoInventoryRepository } from "../repositories/zohoInventory.repository.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const ZOHO_API_BASE = "https://www.zohoapis.com/inventory/v1";
const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com";
const ZOHO_PAGE_SIZE = 200;
const ZOHO_API_TIMEOUT_MS = 30_000;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const refreshLocks = new Map<string, Promise<any>>();

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZohoIntegrationRow = ZohoInventoryIntegration;

export type ZohoResourceKey = "contacts" | "items" | "invoices" | "salesorders";

// ─── Integration row helpers ──────────────────────────────────────────────────

const getIntegrationRaw = async (userId: string): Promise<ZohoIntegrationRow> => {
  const integration = await zohoInventoryRepository.findByUserId(userId);

  if (!integration) {
    throw new ApiError(
      404,
      "Zoho Inventory integration not found. Please connect your account first."
    );
  }
  return integration;
};

export const getIntegration = async (
  userId: string,
  forceRefresh = false
): Promise<ZohoIntegrationRow> => {
  const row = await getIntegrationRaw(userId);

  if (row.needs_reauth) {
    throw new ApiError(
      401,
      "Zoho connection requires re-authentication. Please reconnect your Zoho Inventory account."
    );
  }

  const isExpiringSoon = row.expires_at.getTime() <= Date.now() + REFRESH_BUFFER_MS;

  if (!isExpiringSoon && !forceRefresh) return row;

  const lockKey = `zoho:refresh:${userId}`;
  if (refreshLocks.has(lockKey)) {
    await refreshLocks.get(lockKey);
    return await getIntegrationRaw(userId);
  }

  const refreshPromise = refreshZohoAccessToken(userId, row.refresh_token)
    .then(() => getIntegrationRaw(userId))
    .finally(() => refreshLocks.delete(lockKey));

  refreshLocks.set(lockKey, refreshPromise);
  return await refreshPromise;
};

// ─── Axios instance with 401 auto-retry ──────────────────────────────────────

const getAxiosClient = (token: string): AxiosInstance =>
  axios.create({
    baseURL: ZOHO_API_BASE,
    timeout: ZOHO_API_TIMEOUT_MS,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
  });

async function zohoRequest<T>(
  userId: string,
  fn: (client: AxiosInstance, orgId: string) => Promise<T>
): Promise<T> {
  let integration = await getIntegration(userId);
  let client = getAxiosClient(integration.access_token);

  try {
    return await fn(client, integration.organization_id);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      console.warn(`[Zoho] 401 for user=${userId} — forcing token refresh`);
      integration = await getIntegration(userId, true);
      client = getAxiosClient(integration.access_token);
      return await fn(client, integration.organization_id);
    }
    throw err;
  }
}


// ─── Live list helper ─────────────────────────────────────────────────────────
// Vendor data is not copied into our database (credentials/config only), so the
// list endpoints page through the Zoho API on every call.

async function fetchAllPages(
  userId: string,
  resource: ZohoResourceKey
): Promise<Record<string, any>[]> {
  const records: Record<string, any>[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await zohoRequest(userId, (client, orgId) =>
      client
        .get(`/${resource}`, {
          params: { organization_id: orgId, page, per_page: ZOHO_PAGE_SIZE },
        })
        .then((response) => response.data)
    );

    records.push(...(data[resource] ?? []));
    hasMore = data.page_context?.has_more_page === true;
    page++;
  }

  return records;
}

// Mappers keep the response keys of the former DB-backed endpoints.

const toContactRecord = (contact: Record<string, any>) => ({
  zoho_id: String(contact.contact_id),
  contact_name: contact.contact_name,
  company_name: contact.company_name,
  email: contact.email,
  phone: contact.phone,
  status: contact.status,
  contact_type: contact.contact_type,
  raw: contact,
});

const toItemRecord = (item: Record<string, any>) => ({
  zoho_id: String(item.item_id),
  name: item.name,
  sku: item.sku,
  rate: item.rate,
  status: item.status,
  description: item.description,
  stock_on_hand: item.stock_on_hand,
  unit: item.unit,
  raw: item,
});

const toInvoiceRecord = (invoice: Record<string, any>) => ({
  zoho_id: String(invoice.invoice_id),
  invoice_number: invoice.invoice_number,
  customer_name: invoice.customer_name,
  contact_id: String(invoice.customer_id),
  status: invoice.status,
  date: invoice.date,
  due_date: invoice.due_date,
  total: invoice.total,
  balance: invoice.balance,
  raw: invoice,
});

const toSalesorderRecord = (salesorder: Record<string, any>) => ({
  zoho_id: String(salesorder.salesorder_id),
  salesorder_number: salesorder.salesorder_number,
  customer_name: salesorder.customer_name,
  contact_id: String(salesorder.customer_id),
  status: salesorder.status,
  date: salesorder.date,
  shipment_date: salesorder.shipment_date,
  total: salesorder.total,
  raw: salesorder,
});

// ─── OAuth ────────────────────────────────────────────────────────────────────

export class ZohoService {
  static getConnectUrl(userId: string): string {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const redirectUri = process.env.ZOHO_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new ApiError(500, "Zoho client config missing (ZOHO_CLIENT_ID / ZOHO_REDIRECT_URI)");
    }

    const scopes = [
      "ZohoInventory.contacts.ALL",
      "ZohoInventory.items.ALL",
      "ZohoInventory.invoices.ALL",
      "ZohoInventory.salesorders.ALL",
    ].join(",");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      access_type: "offline",
      state: Buffer.from(JSON.stringify({ userId })).toString("base64url"),
    });

    return `${ZOHO_ACCOUNTS_URL}/oauth/v2/auth?${params.toString()}`;
  }

  static async exchangeCodeForTokens(
    userId: string,
    code: string
  ): Promise<void> {
    const redirectUri = process.env.ZOHO_REDIRECT_URI!;

    const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const body: any = await res.json();
    if (!res.ok || body.error) {
      throw new ApiError(400, `Zoho OAuth exchange failed: ${body.error || body.message}`);
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (body.expires_in || 3600));

    // Fetch organization_id
    const orgRes = await axios.get(`${ZOHO_API_BASE}/organizations`, {
      headers: { Authorization: `Zoho-oauthtoken ${body.access_token}` },
    });

    const orgId: string =
      orgRes.data?.organizations?.[0]?.organization_id ?? "";

    await zohoInventoryRepository.saveConnection(userId, {
      access_token: body.access_token,
      refresh_token: body.refresh_token ?? null,
      expires_at: expiresAt,
      organization_id: orgId,
    });

    console.log(`[Zoho] ✅ Connected user=${userId} org=${orgId}`);
  }

  static async getConnectionStatus(userId: string) {
    const integration = await zohoInventoryRepository.findByUserId(userId);

    if (!integration) return { connected: false };
    return {
      connected: true,
      organization_id: integration.organization_id,
      needs_reauth: integration.needs_reauth,
      expires_at: integration.expires_at,
    };
  }

  static async disconnect(userId: string) {
    await zohoInventoryRepository.delete(userId);
    return { disconnected: true };
  }

  // ─── Triggers: live reads from Zoho ──────────────────────────────────────

  static async getContacts(userId: string) {
    return (await fetchAllPages(userId, "contacts")).map(toContactRecord);
  }

  static async getItems(userId: string) {
    return (await fetchAllPages(userId, "items")).map(toItemRecord);
  }

  static async getInvoices(userId: string) {
    return (await fetchAllPages(userId, "invoices")).map(toInvoiceRecord);
  }

  static async getSalesorders(userId: string) {
    return (await fetchAllPages(userId, "salesorders")).map(toSalesorderRecord);
  }

  // ─── Actions: Create ─────────────────────────────────────────────────────

  static async createContact(userId: string, payload: Record<string, any>) {
    return zohoRequest(userId, async (client, orgId) => {
      const { data } = await client.post(`/contacts`, payload, {
        params: { organization_id: orgId },
      });
      if (data.code !== 0) throw new ApiError(400, data.message ?? "Failed to create contact");
      return data.contact;
    });
  }

  static async createItem(userId: string, payload: Record<string, any>) {
    return zohoRequest(userId, async (client, orgId) => {
      const { data } = await client.post(`/items`, payload, {
        params: { organization_id: orgId },
      });
      if (data.code !== 0) throw new ApiError(400, data.message ?? "Failed to create item");
      return data.item;
    });
  }

  static async createInvoice(userId: string, payload: Record<string, any>) {
    return zohoRequest(userId, async (client, orgId) => {
      const { data } = await client.post(`/invoices`, payload, {
        params: { organization_id: orgId },
      });
      if (data.code !== 0) throw new ApiError(400, data.message ?? "Failed to create invoice");
      return data.invoice;
    });
  }

  static async createSalesorder(userId: string, payload: Record<string, any>) {
    return zohoRequest(userId, async (client, orgId) => {
      const { data } = await client.post(`/salesorders`, payload, {
        params: { organization_id: orgId },
      });
      if (data.code !== 0) throw new ApiError(400, data.message ?? "Failed to create salesorder");
      return data.salesorder;
    });
  }
}
