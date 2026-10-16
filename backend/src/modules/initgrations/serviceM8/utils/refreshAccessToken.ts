import type { Servicem8Integration } from "@prisma/client";
import {
  servicem8IntegrationRepository,
  type ServiceM8TokenUpdate,
} from "../repositories/servicem8-integration.repository.js";

const SERVICEM8_TOKEN_URL = "https://go.servicem8.com/oauth/access_token";
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;
const MILLISECONDS_PER_SECOND = 1000;

export interface RefreshedServiceM8Token {
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
}

interface ServiceM8TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/** A sibling user sharing the ServiceM8 account may already have refreshed this row. */
const toTokenIfStillFresh = (
  integration: Servicem8Integration | null
): RefreshedServiceM8Token | null => {
  if (!integration?.expires_at) return null;
  const remainingMs = integration.expires_at.getTime() - Date.now();
  if (remainingMs <= REFRESH_BUFFER_MS) return null;
  return {
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expires_in: Math.floor(remainingMs / MILLISECONDS_PER_SECOND),
  };
};

const requestTokenRefresh = async (refreshToken: string) => {
  const response = await fetch(SERVICEM8_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.SERVICEM8_CLIENT_ID ?? "",
      client_secret: process.env.SERVICEM8_CLIENT_SECRET ?? "",
    }),
  });
  const tokenResponse = (await response.json()) as ServiceM8TokenResponse;
  return { isOk: response.ok, status: response.status, tokenResponse };
};

/** Handles a rejected refresh: reuse a sibling's fresh token or flag the user for re-auth. */
const handleRejectedRefresh = async (
  userId: string,
  tokenResponse: ServiceM8TokenResponse
): Promise<RefreshedServiceM8Token> => {
  const reason = tokenResponse.error_description || tokenResponse.error || "Unknown error";
  console.error(`[ServiceM8 Refresh] ServiceM8 rejected refresh for user ${userId}: ${reason}`);

  const siblingToken = toTokenIfStillFresh(await servicem8IntegrationRepository.findByUserId(userId));
  if (siblingToken) {
    console.log(`[ServiceM8 Refresh] Sibling refreshed while we were in-flight — using fresh token for user ${userId}`);
    return siblingToken;
  }

  await servicem8IntegrationRepository.markNeedsReauth(userId);
  console.warn(`[ServiceM8 Refresh] Marked user ${userId} as needs_reauth — they must reconnect ServiceM8`);
  throw new Error(`Token refresh failed for user ${userId}: ${reason}`);
};

/** Saves rotated tokens for this user and every user sharing the same ServiceM8 account. */
const saveRefreshedTokens = async (
  userId: string,
  sm8AccountUuid: string | null,
  tokenUpdate: ServiceM8TokenUpdate
) => {
  await servicem8IntegrationRepository.updateTokens(userId, tokenUpdate);
  if (!sm8AccountUuid) return;

  // ServiceM8 rotates refresh tokens — siblings must receive the new one or their next refresh fails.
  try {
    await servicem8IntegrationRepository.updateTokensForAccountSiblings(sm8AccountUuid, userId, tokenUpdate);
  } catch (error) {
    // The current user's row is already saved; a sibling sync failure must not fail this refresh.
    console.warn(`[ServiceM8 Refresh] Failed to sync tokens to sibling users for account ${sm8AccountUuid}:`, error);
  }
};

export const refreshAccessToken = async (
  userId: string,
  refreshToken: string | null
): Promise<RefreshedServiceM8Token> => {
  console.log(`[ServiceM8 Refresh] Starting token refresh for user: ${userId}`);

  if (!refreshToken) {
    console.error(`[ServiceM8 Refresh] No refresh token found for user ${userId} — manual re-login required`);
    throw new Error(`No refresh token available for user ${userId}`);
  }

  // Re-read the current row: a sibling may already have rotated the refresh token we were given.
  const currentIntegration = await servicem8IntegrationRepository.findByUserId(userId);
  const alreadyFreshToken = toTokenIfStillFresh(currentIntegration);
  if (alreadyFreshToken) {
    console.log(`[ServiceM8 Refresh] Token already refreshed by sibling — skipping API call for user ${userId}`);
    return alreadyFreshToken;
  }

  const activeRefreshToken = currentIntegration?.refresh_token ?? refreshToken;
  const { isOk, status, tokenResponse } = await requestTokenRefresh(activeRefreshToken);
  console.log(`[ServiceM8 Refresh] ServiceM8 response status: ${status}`);

  if (!isOk || !tokenResponse.access_token) return handleRejectedRefresh(userId, tokenResponse);

  const expiresInSeconds = tokenResponse.expires_in || DEFAULT_TOKEN_LIFETIME_SECONDS;
  const tokenUpdate: ServiceM8TokenUpdate = {
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token || activeRefreshToken,
    expires_at: new Date(Date.now() + expiresInSeconds * MILLISECONDS_PER_SECOND),
    needs_reauth: false,
  };

  await saveRefreshedTokens(userId, currentIntegration?.sm8_account_uuid ?? null, tokenUpdate);

  console.log(`[ServiceM8 Refresh] Token refresh complete for user ${userId}`);
  return {
    access_token: tokenUpdate.access_token,
    refresh_token: tokenUpdate.refresh_token,
    expires_in: expiresInSeconds,
  };
};
