import axios, { AxiosInstance } from "axios";
import type { ZohoFormsIntegration } from "@prisma/client";
import { buildPublicApiUrl } from "../../../../config/api.config.js";
import { ApiError } from "../../../../utils/ApiError.js";
import { refreshZohoFormsAccessToken } from "../utils/refreshAccessToken.js";
import { zohoFormsRepository } from "../repositories/zohoForms.repository.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const ZOHO_FORMS_BASE = "https://forms.zoho.com/api/v1";
const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com";
const ZOHO_FORMS_TIMEOUT_MS = 30_000;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const refreshLocks = new Map<string, Promise<any>>();

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZohoFormsIntegrationRow = ZohoFormsIntegration;

export interface ZohoForm {
  form_id: string;
  form_name: string;
  form_link_name: string;
  report_link_name: string;
  description: string;
  status: string;
  created_time: string;
  modified_time: string;
}

export interface ZohoFormSubmission {
  submission_id: string;
  form_id: string;
  submitted_at: string;
  data: Record<string, any>;
}

// ─── Integration row helpers ──────────────────────────────────────────────────

const getIntegrationRaw = async (userId: string): Promise<ZohoFormsIntegrationRow> => {
  const integration = await zohoFormsRepository.findIntegrationByUserId(userId);

  if (!integration) {
    throw new ApiError(
      404,
      "Zoho Forms integration not found. Please connect your account first."
    );
  }
  return integration;
};

export const getIntegration = async (
  userId: string,
  forceRefresh = false
): Promise<ZohoFormsIntegrationRow> => {
  const row = await getIntegrationRaw(userId);

  if (row.needs_reauth) {
    throw new ApiError(401, "Zoho Forms requires re-authentication. Please reconnect.");
  }

  const isExpiringSoon = row.expires_at.getTime() <= Date.now() + REFRESH_BUFFER_MS;

  if (!isExpiringSoon && !forceRefresh) return row;

  const lockKey = `zohoforms:refresh:${userId}`;
  if (refreshLocks.has(lockKey)) {
    await refreshLocks.get(lockKey);
    return await getIntegrationRaw(userId);
  }

  const refreshPromise = refreshZohoFormsAccessToken(userId, row.refresh_token)
    .then(() => getIntegrationRaw(userId))
    .finally(() => refreshLocks.delete(lockKey));

  refreshLocks.set(lockKey, refreshPromise);
  return await refreshPromise;
};

// ─── Axios client ─────────────────────────────────────────────────────────────

const getAxiosClient = (token: string): AxiosInstance =>
  axios.create({
    baseURL: ZOHO_FORMS_BASE,
    timeout: ZOHO_FORMS_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

async function formsRequest<T>(
  userId: string,
  fn: (client: AxiosInstance) => Promise<T>
): Promise<T> {
  let integration = await getIntegration(userId);
  let client = getAxiosClient(integration.access_token);

  try {
    return await fn(client);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      console.warn(`[ZohoForms] 401 for user=${userId} — forcing token refresh`);
      integration = await getIntegration(userId, true);
      client = getAxiosClient(integration.access_token);
      return await fn(client);
    }
    throw err;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ZohoFormsService {
  // ─── OAuth ──────────────────────────────────────────────────────────────

  static getConnectUrl(userId: string): string {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const redirectUri = process.env.ZOHO_FORMS_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new ApiError(500, "Zoho Forms config missing (ZOHO_CLIENT_ID / ZOHO_FORMS_REDIRECT_URI)");
    }

    const scopes = [
      "ZohoForms.form.READ",
      "ZohoForms.form.CREATE",
      "ZohoForms.submission.READ",
      "ZohoForms.submission.CREATE",
    ].join(",");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      access_type: "offline",
      state: Buffer.from(JSON.stringify({ userId, app: "zoho_forms" })).toString("base64url"),
    });

    return `${ZOHO_ACCOUNTS_URL}/oauth/v2/auth?${params.toString()}`;
  }

  static async exchangeCodeForTokens(userId: string, code: string): Promise<void> {
    const redirectUri = process.env.ZOHO_FORMS_REDIRECT_URI!;

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
      throw new ApiError(400, `Zoho Forms OAuth failed: ${body.error || body.message}`);
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (body.expires_in || 3600));

    await zohoFormsRepository.saveTokens(userId, {
      access_token: body.access_token,
      refresh_token: body.refresh_token ?? null,
      expires_at: expiresAt,
    });

    console.log(`[ZohoForms] ✅ Connected user=${userId}`);
  }

  static async getConnectionStatus(userId: string) {
    const integration = await zohoFormsRepository.findIntegrationByUserId(userId);

    if (!integration) return { connected: false };
    return {
      connected: true,
      needs_reauth: integration.needs_reauth,
      expires_at: integration.expires_at,
    };
  }

  static async disconnect(userId: string) {
    await zohoFormsRepository.deleteIntegration(userId);
    await zohoFormsRepository.deleteWebhooksForUser(userId);

    return { disconnected: true };
  }

  // ─── Forms API ───────────────────────────────────────────────────────────

  static async listForms(userId: string): Promise<ZohoForm[]> {
    const data = await formsRequest(userId, (client) =>
      client.get(`/forms`).then((response) => response.data)
    );

    const forms: ZohoForm[] = (data.forms ?? data ?? []).map((form: any) => ({
      form_id: String(form.form_id ?? form.id),
      form_name: form.form_name ?? form.name,
      form_link_name: form.form_link_name ?? "",
      report_link_name: form.report_link_name ?? "",
      description: form.description ?? "",
      status: form.status ?? "Active",
      created_time: form.created_time ?? "",
      modified_time: form.modified_time ?? "",
    }));

    return forms;
  }

  static async getFormDetails(userId: string, formId: string) {
    const data = await formsRequest(userId, (client) =>
      client.get(`/forms/${formId}`).then((response) => response.data)
    );
    return data.form ?? data;
  }

  static async getFormFields(userId: string, formId: string) {
    const details = await ZohoFormsService.getFormDetails(userId, formId);
    return details.fields ?? details.form_fields ?? [];
  }

  // ─── Submissions ─────────────────────────────────────────────────────────

  static async getSubmissions(
    userId: string,
    formId: string,
    page = 1,
    perPage = 100
  ): Promise<ZohoFormSubmission[]> {
    const data = await formsRequest(userId, (client) =>
      client
        .get(`/forms/${formId}/submissions`, { params: { page, per_page: perPage } })
        .then((response) => response.data)
    );

    const submissions: ZohoFormSubmission[] = (data.submissions ?? []).map((submission: any) => ({
      submission_id: String(submission.submission_id ?? submission.id),
      form_id: formId,
      submitted_at: submission.submitted_time ?? submission.created_time ?? new Date().toISOString(),
      data: submission.data ?? submission,
    }));

    return submissions;
  }

  // ─── Webhook Setup ───────────────────────────────────────────────────────
  // Registers our backend URL as the webhook receiver on a Zoho form
  // so we get notified on every new submission.

  static async setupWebhook(userId: string, formId: string) {
    const receiverUrl = buildPublicApiUrl(`/zoho-forms/webhook/${userId}/${formId}`);

    const data = await formsRequest(userId, (client) =>
      client
        .post(`/forms/${formId}/webhooks`, {
          url: receiverUrl,
          content_type: "application/json",
        })
        .then((response) => response.data)
    );

    await zohoFormsRepository.saveWebhook(userId, formId, {
      webhook_url: receiverUrl,
      zoho_webhook_id: String(data.webhook_id ?? ""),
    });

    return { webhook_url: receiverUrl, zoho_response: data };
  }

  static async removeWebhook(userId: string, formId: string) {
    const webhook = await zohoFormsRepository.findWebhook(userId, formId);

    // A failed remote delete must not block removing our record
    if (webhook?.zoho_webhook_id) {
      await formsRequest(userId, (client) =>
        client.delete(`/forms/${formId}/webhooks/${webhook.zoho_webhook_id}`)
      ).catch(() => {});
    }

    await zohoFormsRepository.deleteWebhook(userId, formId);

    return { removed: true };
  }

  static listWebhooks(userId: string) {
    return zohoFormsRepository.findWebhooksByUserId(userId);
  }

  // ─── Incoming Webhook Handler ────────────────────────────────────────────
  // Called by our webhook receiver route when Zoho posts a submission.
  // The submission is acknowledged but not stored: we keep config, not vendor data.

  static async handleIncomingSubmission(
    userId: string,
    formId: string,
    payload: Record<string, any>
  ) {
    const webhook = await zohoFormsRepository.findWebhook(userId, formId);
    if (!webhook?.active) {
      console.warn(`[ZohoForms] Ignored submission for unregistered webhook form=${formId} user=${userId}`);
      return { received: false, reason: "No active webhook registered for this form" };
    }

    const submissionId = String(
      payload.submission_id ?? payload.id ?? Date.now()
    );

    console.log(`[ZohoForms] 📥 Incoming submission received form=${formId} user=${userId}`);
    return { received: true, submission_id: submissionId };
  }

  // ─── Live reads in the shape of the former "from DB" endpoints ───────────
  // Fetched from Zoho on every call; response keys match the old DB rows.

  static async getFormsFromDb(userId: string) {
    const forms = await ZohoFormsService.listForms(userId);
    return forms.map((form) => ({ ...form, user_id: userId, zoho_id: form.form_id }));
  }

  static async getSubmissionsFromDb(userId: string, formId?: string) {
    const formIds = formId
      ? [formId]
      : (await ZohoFormsService.listForms(userId)).map((form) => form.form_id);

    const submissions: ZohoFormSubmission[] = [];
    for (const currentFormId of formIds) {
      submissions.push(...(await ZohoFormsService.getSubmissions(userId, currentFormId)));
    }

    return submissions
      .sort((first, second) => second.submitted_at.localeCompare(first.submitted_at))
      .map((submission) => ({
        user_id: userId,
        zoho_id: submission.submission_id,
        form_id: submission.form_id,
        submitted_at: submission.submitted_at,
        submission_data: submission.data,
      }));
  }
}
