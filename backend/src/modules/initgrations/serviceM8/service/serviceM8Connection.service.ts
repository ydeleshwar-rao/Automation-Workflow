import axios from "axios";
import { ApiError } from "../../../../utils/ApiError.js";
import { servicem8IntegrationRepository } from "../repositories/servicem8-integration.repository.js";
import { refreshAccessToken } from "../utils/refreshAccessToken.js";
import { SERVICEM8_BASE_URL } from "./serviceM8Api.client.js";

const SERVICEM8_AUTHORIZE_URL = "https://go.servicem8.com/oauth/authorize";
const DEFAULT_SERVICEM8_TOKEN_URL = "https://go.servicem8.com/oauth/access_token";
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;
const MILLISECONDS_PER_SECOND = 1000;
const LOG_BODY_PREVIEW_LENGTH = 300;

interface ServiceM8TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  user_id?: string;
  error?: string;
  error_description?: string;
}

export type ConnectUrlResult =
  | { alreadyConnected: true; expires_at: Date | null; scopes: string | null }
  | { alreadyConnected: false; url: string };

export interface BackfillSummary {
  total: number;
  updated: number;
  failed: number;
}

const expiryFromNow = (expiresInSeconds: number | undefined) =>
  new Date(Date.now() + (expiresInSeconds || DEFAULT_TOKEN_LIFETIME_SECONDS) * MILLISECONDS_PER_SECOND);

const authorizedGet = (accessToken: string, resource: string) =>
  fetch(`${SERVICEM8_BASE_URL}/${resource}.json`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });

const readFirstUuid = (payload: unknown): string | null => {
  const firstRecord = Array.isArray(payload) ? payload[0] : payload;
  const uuid = (firstRecord as { uuid?: unknown } | undefined)?.uuid;
  return typeof uuid === "string" && uuid ? uuid : null;
};

/** OAuth callback reads the first /company.json record (kept as before). */
const CALLBACK_ACCOUNT_RESOURCES = ["company"];
/** Backfill prefers the CompanyConfig account record and falls back to /company.json. */
const BACKFILL_ACCOUNT_RESOURCES = ["CompanyConfig", "company"];

/**
 * The ServiceM8 account uuid lets token refreshes be shared by every user on the same account.
 * Returns the uuid of the first record from the first resource that has one.
 */
const fetchAccountUuid = async (accessToken: string, resources: string[]): Promise<string | null> => {
  for (const resource of resources) {
    const response = await authorizedGet(accessToken, resource);
    if (response.ok) {
      const uuid = readFirstUuid(await response.json());
      if (uuid) return uuid;
      continue;
    }
    const body = await response.text().catch(() => "(unreadable)");
    console.warn(`[SM8 Account] /${resource}.json HTTP ${response.status} — body: ${body.slice(0, LOG_BODY_PREVIEW_LENGTH)}`);
  }
  return null;
};

/** Returns a working access token, refreshing it when the stored one is rejected. */
const getWorkingAccessToken = async (
  userId: string,
  accessToken: string,
  refreshToken: string | null
): Promise<string | null> => {
  const probeResponse = await authorizedGet(accessToken, "CompanyConfig");
  if (probeResponse.ok) return accessToken;
  if (!refreshToken) {
    console.warn(`[Backfill] user=${userId} — no refresh_token, cannot renew`);
    return null;
  }
  try {
    const refreshedToken = await refreshAccessToken(userId, refreshToken);
    return refreshedToken.access_token;
  } catch (error) {
    console.warn(`[Backfill] user=${userId} — refresh failed:`, error);
    return null;
  }
};

const backfillOneConnection = async (
  userId: string,
  accessToken: string,
  refreshToken: string | null
): Promise<boolean> => {
  const workingToken = await getWorkingAccessToken(userId, accessToken, refreshToken);
  if (!workingToken) return false;

  const accountUuid = await fetchAccountUuid(workingToken, BACKFILL_ACCOUNT_RESOURCES);
  if (!accountUuid) return false;

  await servicem8IntegrationRepository.setAccountUuid(userId, accountUuid);
  console.log(`[Backfill] user=${userId} → sm8_account_uuid=${accountUuid}`);
  return true;
};

export class ServiceM8ConnectionService {
  static async getConnectUrl(userId: string): Promise<ConnectUrlResult> {
    const clientId = process.env.SERVICEM8_CLIENT_ID;
    const redirectUri = process.env.SERVICEM8_REDIRECT_URI;
    if (!clientId || !redirectUri) throw new ApiError(500, "ServiceM8 config missing");

    const existing = await servicem8IntegrationRepository.findByUserId(userId);
    if (existing && !existing.needs_reauth) {
      return { alreadyConnected: true, expires_at: existing.expires_at, scopes: existing.scopes };
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: process.env.SERVICEM8_SCOPE ?? "",
      state: Buffer.from(JSON.stringify({ userId })).toString("base64url"),
    });
    return { alreadyConnected: false, url: `${SERVICEM8_AUTHORIZE_URL}?${params.toString()}` };
  }

  /** Exchanges the OAuth code for tokens and stores the connection. */
  static async completeOAuthCallback(userId: string, authorizationCode: string): Promise<void> {
    const tokenResponse = await fetch(process.env.SERVICEM8_TOKEN_URL || DEFAULT_SERVICEM8_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.SERVICEM8_CLIENT_ID ?? "",
        client_secret: process.env.SERVICEM8_CLIENT_SECRET ?? "",
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: process.env.SERVICEM8_REDIRECT_URI ?? "",
      }),
    });
    const tokenData = (await tokenResponse.json()) as ServiceM8TokenResponse;
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new ApiError(tokenResponse.ok ? 502 : tokenResponse.status, tokenData.error_description || tokenData.error || "Token exchange failed");
    }

    let accountUuid: string | null = null;
    try {
      accountUuid = await fetchAccountUuid(tokenData.access_token, CALLBACK_ACCOUNT_RESOURCES);
    } catch (error) {
      // The connection still works without the account uuid; the startup backfill fills it later.
      console.warn("[ServiceM8 Callback] Could not fetch account UUID:", error);
    }

    await servicem8IntegrationRepository.saveConnection(userId, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at: expiryFromNow(tokenData.expires_in),
      scopes: tokenData.scope ?? null,
      ...(accountUuid ? { sm8_account_uuid: accountUuid } : {}),
    });
    console.log(`[ServiceM8 Callback] Integration saved — userId=${userId}  sm8_account_uuid=${accountUuid ?? "null"}`);
  }

  static async authenticateWithCredentials(userId: string, username: string, password: string) {
    const clientId = process.env.SERVICEM8_CLIENT_ID;
    const clientSecret = process.env.SERVICEM8_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new ApiError(500, "ServiceM8 client credentials are not configured");

    const tokenResponse = await axios.post<ServiceM8TokenResponse>(
      DEFAULT_SERVICEM8_TOKEN_URL,
      new URLSearchParams({ grant_type: "password", username, password, client_id: clientId, client_secret: clientSecret }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" } }
    );
    const tokenData = tokenResponse.data;
    if (!tokenData.access_token) throw new ApiError(502, "Failed to obtain access token from ServiceM8");

    const expiresAt = expiryFromNow(tokenData.expires_in);
    await servicem8IntegrationRepository.saveConnection(userId, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at: expiresAt,
      scopes: tokenData.scope ?? null,
    });

    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user_id: tokenData.user_id || userId,
      expires_at: expiresAt.toISOString(),
      expires_in: tokenData.expires_in || DEFAULT_TOKEN_LIFETIME_SECONDS,
      scope: tokenData.scope,
    };
  }

  static async disconnect(userId: string): Promise<void> {
    const existing = await servicem8IntegrationRepository.findByUserId(userId);
    if (!existing) {
      throw new ApiError(404, "No active ServiceM8 connection found. Account is already disconnected.");
    }
    await servicem8IntegrationRepository.deleteByUserId(userId);
  }

  static async getConnectionStatus(userId: string) {
    const integration = await servicem8IntegrationRepository.findByUserId(userId);
    return { connected: Boolean(integration), needs_reauth: integration?.needs_reauth ?? false };
  }

  /** Populates sm8_account_uuid for every connection where it is still missing. */
  static async backfillAccountUuids(): Promise<BackfillSummary> {
    const connections = await servicem8IntegrationRepository.findConnectionsMissingAccountUuid();
    let updated = 0;
    let failed = 0;

    for (const connection of connections) {
      try {
        const isUpdated = await backfillOneConnection(connection.user_id, connection.access_token, connection.refresh_token);
        if (isUpdated) updated++;
        else failed++;
      } catch (error) {
        console.error(`[Backfill] user=${connection.user_id} error:`, error);
        failed++;
      }
    }

    return { total: connections.length, updated, failed };
  }
}
