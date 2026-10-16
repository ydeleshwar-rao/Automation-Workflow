import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import type { RazorpayIntegration } from "@prisma/client";
import { buildPublicApiUrl } from "../../../../config/api.config.js";
import { ApiError } from "../../../../utils/ApiError.js";
import { razorpayRepository } from "../repositories/razorpay.repository.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
const RAZORPAY_TIMEOUT_MS = 30_000;
const RAZORPAY_PAGE_SIZE = 100;

// ─── Webhook event names (matching Zapier triggers in screenshot) ─────────────

export const RAZORPAY_EVENTS = {
  PAYMENT_CAPTURED:            "payment.captured",
  PAYMENT_FAILED:              "payment.failed",
  INVOICE_PAID:                "invoice.paid",
  INVOICE_PARTIALLY_PAID:      "invoice.partially_paid",
  PAYMENT_LINK_PAID:           "payment_link.paid",
  PAYMENT_LINK_PARTIALLY_PAID: "payment_link.partially_paid",
  PAYMENT_PAGE_PAID:           "payment_page.paid",
} as const;

export type RazorpayEvent = typeof RAZORPAY_EVENTS[keyof typeof RAZORPAY_EVENTS];

// ─── Types ────────────────────────────────────────────────────────────────────

export type RazorpayIntegrationRow = RazorpayIntegration;

type RazorpayEntity = Record<string, any>;

// ─── Axios client (Basic Auth with key_id:key_secret) ─────────────────────────

const getClient = (keyId: string, keySecret: string): AxiosInstance =>
  axios.create({
    baseURL: RAZORPAY_API_BASE,
    timeout: RAZORPAY_TIMEOUT_MS,
    auth: { username: keyId, password: keySecret },
    headers: { "Content-Type": "application/json" },
  });

const getCredentials = async (userId: string): Promise<RazorpayIntegrationRow> => {
  const integration = await razorpayRepository.findByUserId(userId);

  if (!integration) {
    throw new ApiError(404, "Razorpay not connected. Please add your API keys first.");
  }
  return integration;
};

// ─── Live list helper ─────────────────────────────────────────────────────────
// Vendor data is not copied into our database (credentials/config only), so the
// list endpoints page through the Razorpay API on every call.

async function fetchAllPages(userId: string, resourcePath: string): Promise<RazorpayEntity[]> {
  const credentials = await getCredentials(userId);
  const client = getClient(credentials.key_id, credentials.key_secret);
  const records: RazorpayEntity[] = [];
  let skip = 0;

  while (true) {
    const { data } = await client.get(resourcePath, {
      params: { count: RAZORPAY_PAGE_SIZE, skip },
    });
    // Payment links are listed under `payment_links`; other collections under `items`
    const items: RazorpayEntity[] = data.items ?? data.payment_links ?? [];
    records.push(...items);
    if (items.length < RAZORPAY_PAGE_SIZE) break;
    skip += RAZORPAY_PAGE_SIZE;
  }

  return records;
}

const unixSecondsToIso = (unixSeconds?: number | null): string | null =>
  unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;

// Mappers keep the response keys of the former DB-backed endpoints.

const toPaymentRecord = (userId: string, payment: RazorpayEntity) => ({
  user_id: userId,
  razorpay_id: payment.id,
  order_id: payment.order_id,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  method: payment.method,
  email: payment.email,
  contact: payment.contact,
  description: payment.description,
  captured_at: unixSecondsToIso(payment.captured_at),
  raw: payment,
});

const toInvoiceRecord = (userId: string, invoice: RazorpayEntity) => ({
  user_id: userId,
  razorpay_id: invoice.id,
  invoice_number: invoice.invoice_number,
  customer_name: invoice.customer_details?.name,
  customer_email: invoice.customer_details?.email,
  amount: invoice.amount,
  amount_paid: invoice.amount_paid,
  amount_due: invoice.amount_due,
  currency: invoice.currency,
  status: invoice.status,
  date: unixSecondsToIso(invoice.date),
  raw: invoice,
});

const toPaymentLinkRecord = (userId: string, paymentLink: RazorpayEntity) => ({
  user_id: userId,
  razorpay_id: paymentLink.id,
  amount: paymentLink.amount,
  amount_paid: paymentLink.amount_paid,
  currency: paymentLink.currency,
  status: paymentLink.status,
  description: paymentLink.description,
  short_url: paymentLink.short_url,
  customer_name: paymentLink.customer?.name,
  customer_email: paymentLink.customer?.email,
  customer_contact: paymentLink.customer?.contact,
  event_type: "payment_link",
  raw: paymentLink,
});

// ─── Service ──────────────────────────────────────────────────────────────────

export class RazorpayService {
  // ─── Connect (save API keys) ─────────────────────────────────────────────

  static async connect(userId: string, keyId: string, keySecret: string) {
    // Verify keys are valid by calling a lightweight endpoint
    try {
      await axios.get(`${RAZORPAY_API_BASE}/payments?count=1`, {
        auth: { username: keyId, password: keySecret },
        timeout: RAZORPAY_TIMEOUT_MS,
      });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        throw new ApiError(401, "Invalid Razorpay API keys. Please check key_id and key_secret.");
      }
      throw new ApiError(400, `Razorpay key validation failed: ${err.message}`);
    }

    const webhookSecret = crypto.randomBytes(24).toString("hex");

    await razorpayRepository.saveCredentials(userId, {
      key_id: keyId,
      key_secret: keySecret,
      webhook_secret: webhookSecret,
    });

    console.log(`[Razorpay] ✅ Connected user=${userId}`);

    return {
      connected: true,
      webhook_url: buildPublicApiUrl(`/razorpay/webhook/${userId}`),
      webhook_secret: webhookSecret,
      message: "Add the webhook_url and webhook_secret to your Razorpay Dashboard → Webhooks.",
    };
  }

  static async getConnectionStatus(userId: string) {
    const integration = await razorpayRepository.findByUserId(userId);

    if (!integration) return { connected: false };

    return {
      connected: true,
      key_id: integration.key_id,
      webhook_url: buildPublicApiUrl(`/razorpay/webhook/${userId}`),
      webhook_secret: integration.webhook_secret,
      razorpay_webhook_id: integration.razorpay_webhook_id,
    };
  }

  static async disconnect(userId: string) {
    await razorpayRepository.delete(userId);
    return { disconnected: true };
  }

  // ─── Auto-register webhook on Razorpay (optional) ────────────────────────
  // Razorpay allows creating webhooks via their API.
  // Users can also add the webhook URL manually in their Dashboard.

  static async registerWebhook(userId: string) {
    const creds = await getCredentials(userId);
    const client = getClient(creds.key_id, creds.key_secret);

    const webhookUrl = buildPublicApiUrl(`/razorpay/webhook/${userId}`);

    const events: Record<string, boolean> = {};
    Object.values(RAZORPAY_EVENTS).forEach((eventName) => { events[eventName] = true; });

    try {
      const { data } = await client.post(`/webhooks`, {
        url: webhookUrl,
        secret: creds.webhook_secret,
        alert_email: "",
        active: true,
        events,
      });

      await razorpayRepository.saveRazorpayWebhookId(userId, data.id);

      return { registered: true, webhook_id: data.id, webhook_url: webhookUrl };
    } catch (err: any) {
      const msg = err?.response?.data?.description || err.message;
      throw new ApiError(400, `Webhook registration failed: ${msg}`);
    }
  }

  // ─── Webhook Signature Verification ──────────────────────────────────────

  /** Secret that signs this user's incoming webhooks, or null when not connected. */
  static async getWebhookSecret(userId: string): Promise<string | null> {
    const integration = await razorpayRepository.findByUserId(userId);
    return integration?.webhook_secret ?? null;
  }

  static verifySignature(
    rawBody: Buffer | string,
    signature: string,
    secret: string
  ): boolean {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return expected === signature;
  }

  // ─── Incoming Webhook Handler ─────────────────────────────────────────────
  // All 7 Zapier triggers come through here as real-time Instant events.
  // The event is acknowledged but not stored: we keep config, not vendor data.

  static async handleWebhookEvent(
    userId: string,
    event: string,
    payload: Record<string, any>
  ) {
    const eventId = payload.payload?.payment?.entity?.id
      ?? payload.payload?.invoice?.entity?.id
      ?? payload.payload?.payment_link?.entity?.id
      ?? payload.payload?.payment_page?.entity?.id
      ?? `${event}_${Date.now()}`;

    console.log(`[Razorpay] 📥 Event=${event} user=${userId} id=${eventId}`);
    return { received: true, event, event_id: eventId };
  }

  // ─── Triggers: live reads from Razorpay ──────────────────────────────────

  static async getPayments(userId: string) {
    const payments = await fetchAllPages(userId, "/payments");
    return payments.map((payment) => toPaymentRecord(userId, payment));
  }

  static async getInvoices(userId: string) {
    const invoices = await fetchAllPages(userId, "/invoices");
    return invoices.map((invoice) => toInvoiceRecord(userId, invoice));
  }

  static async getPaymentLinks(userId: string) {
    const paymentLinks = await fetchAllPages(userId, "/payment_links");
    return paymentLinks.map((paymentLink) => toPaymentLinkRecord(userId, paymentLink));
  }
}
