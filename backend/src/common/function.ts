import { Request } from "express";
import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../modules/auth/jwt.js";
import { leadshubIntegrationRepository } from "../modules/leadshub/repositories/leadshub-integration.repository.js";

const ACCESS_TOKEN_COOKIE = "jm_access_token";
const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const MILLISECONDS_PER_SECOND = 1000;

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.authorization;
  return authHeader?.startsWith("Bearer ")
    ? authHeader.replace(/^Bearer\s+/i, "").trim()
    : null;
}

export const getUserId = async (req: Request): Promise<string> => {
  const jwtUserId = req.user?.id;
  if (jwtUserId && typeof jwtUserId === "string") {
    return jwtUserId;
  }

  const token = readCookie(req.headers.cookie, ACCESS_TOKEN_COOKIE) || readBearerToken(req);
  if (token) {
    return verifyAccessToken(token).sub;
  }

  throw new ApiError(401, "Unauthorized: User ID not found");
};

/**
 * Get location_id of the user's most recent LeadsHub integration.
 * @param userId - UUID of the user
 * @returns location_id string
 */
export const getLocationIdByUserId = async (userId: string): Promise<string> => {
  if (!userId || typeof userId !== "string") {
    throw new ApiError(400, "Invalid or missing user ID");
  }

  const integration = await leadshubIntegrationRepository.findLatestByUserId(userId);
  if (!integration?.location_id) {
    throw new ApiError(404, "LeadHub integration not found for this user");
  }

  return integration.location_id;
};

/**
 * Get the active LeadsHub integration for a location.
 * expires_in is a BigInt column, so it is converted to a number to stay JSON-safe.
 * @param locationId - Location ID from GHL
 */
export const getLeadsHubIntegrationByLocationId = async (locationId: string) => {
  if (!locationId || typeof locationId !== "string") {
    throw new ApiError(400, "Invalid or missing location ID");
  }

  const integration = await leadshubIntegrationRepository.findActiveByLocationId(locationId);
  if (!integration) {
    throw new ApiError(404, "LeadHub integration not found for this location");
  }

  return {
    ...integration,
    expires_in: integration.expires_in === null ? null : Number(integration.expires_in),
  };
};

interface GhlTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function requestRefreshedGhlTokens(refreshToken: string): Promise<GhlTokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", process.env.GHL_CLIENT_ID!);
  params.append("client_secret", process.env.GHL_CLIENT_SECRET!);
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);

  const response = await axios.post<GhlTokenResponse>(GHL_TOKEN_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
}

/**
 * Return a valid access token for a location, refreshing it with the refresh_token when expired.
 * @param locationId - Location ID from GHL
 */
export const getValidAccessToken = async (locationId: string): Promise<string> => {
  if (!locationId || typeof locationId !== "string") {
    throw new ApiError(400, "Invalid or missing location ID");
  }

  const integration = await getLeadsHubIntegrationByLocationId(locationId);

  const isTokenStillValid = integration.expires_at !== null && new Date() < integration.expires_at;
  if (isTokenStillValid) {
    return integration.access_token as string;
  }

  if (!integration.refresh_token) {
    throw new ApiError(401, "Refresh token not available. Please reconnect your GHL account.");
  }

  try {
    const tokenData = await requestRefreshedGhlTokens(integration.refresh_token);
    await leadshubIntegrationRepository.updateTokensByLocationId(locationId, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      expires_at: new Date(Date.now() + tokenData.expires_in * MILLISECONDS_PER_SECOND),
    });
    return tokenData.access_token;
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if (axios.isAxiosError(error)) {
      const ghlError = (error.response?.data as { error?: string } | undefined)?.error;
      throw new ApiError(401, ghlError || "Failed to refresh access token");
    }
    throw error;
  }
};

/**
 * Get valid access token by user_id (convenience wrapper).
 * Automatically refreshes if expired.
 * @param userId - UUID of the user
 */
export const getValidAccessTokenByUserId = async (userId: string): Promise<string> => {
  const locationId = await getLocationIdByUserId(userId);
  return getValidAccessToken(locationId);
};
