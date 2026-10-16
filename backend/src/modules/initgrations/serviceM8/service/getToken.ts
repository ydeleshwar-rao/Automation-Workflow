import { ApiError } from "../../../../utils/ApiError.js";
import { servicem8IntegrationRepository } from "../repositories/servicem8-integration.repository.js";
import { refreshAccessToken } from "../utils/refreshAccessToken.js";

// Refresh proactively when <5 min remain — avoids tokens expiring mid-flight
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Prevents concurrent token refreshes for the same user from racing each other
const refreshLocks = new Map<string, Promise<string>>();

const isTokenFresh = (expiresAt: Date | null) =>
  expiresAt !== null && Date.now() < expiresAt.getTime() - REFRESH_BUFFER_MS;

const refreshOnce = (userId: string, refreshToken: string | null): Promise<string> => {
  const pendingRefresh = refreshLocks.get(userId);
  if (pendingRefresh) return pendingRefresh;

  const refreshPromise = refreshAccessToken(userId, refreshToken)
    .then((refreshedToken) => refreshedToken.access_token)
    .finally(() => refreshLocks.delete(userId));
  refreshLocks.set(userId, refreshPromise);
  return refreshPromise;
};

/**
 * Returns a usable ServiceM8 access token, refreshing it when it is expired, about to expire,
 * flagged for re-auth, or when the caller forces it (e.g. after a 401).
 */
export async function getServiceM8Token(userId: string, forceRefresh = false): Promise<string> {
  const integration = await servicem8IntegrationRepository.findByUserId(userId);
  if (!integration) {
    throw new ApiError(404, "ServiceM8 integration not found. Please connect your account first.");
  }

  if (!forceRefresh && !integration.needs_reauth && isTokenFresh(integration.expires_at)) {
    return integration.access_token;
  }

  return refreshOnce(userId, integration.refresh_token);
}
