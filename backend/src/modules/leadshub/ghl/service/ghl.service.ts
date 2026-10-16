import axios from "axios";
import { Request } from "express";
import { getUserId } from "../../../../common/function.js";
import { leadshubIntegrationRepository } from "../../repositories/leadshub-integration.repository.js";

const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const MILLISECONDS_PER_SECOND = 1000;

interface GhlAuthorizationTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  companyId?: string;
  locationId?: string;
  userType?: string;
}

export async function ghlInstallService(req: Request): Promise<string> {
  const baseUrl = process.env.BASE_MARKETPLACE_URL;

  const userId = await getUserId(req);

  const existing = await leadshubIntegrationRepository.findActiveByUserId(userId);
  if (existing) {
    throw Object.assign(new Error("Already connected to LeadsHub"), { statusCode: 409 });
  }

  const statePayload = Buffer.from(JSON.stringify({ userId })).toString("base64url");

  const scope = process.env.GHL_SCOPES!.split(/\s+/).filter(Boolean).join(' ');

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.GHL_CLIENT_ID!,
    redirect_uri: process.env.GHL_REDIRECT_URI!,
    scope,
    state: statePayload,
  });

  return `${baseUrl}?${params.toString()}`;
}

export async function ghlCallbackService(req: Request) {
  const { code, state } = req.query;

  if (!code) {
    throw new Error("Authorization code missing");
  }

  if (!state) {
    throw new Error("State parameter missing");
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state as string, "base64url").toString("utf8"));
    userId = decoded.userId;
  } catch {
    throw new Error("Invalid state parameter");
  }

  if (!userId) throw new Error("User ID missing in state");

  const params = new URLSearchParams();
  params.append("client_id", process.env.GHL_CLIENT_ID!);
  params.append("client_secret", process.env.GHL_CLIENT_SECRET!);
  params.append("grant_type", "authorization_code");
  params.append("code", code as string);
  params.append("redirect_uri", process.env.GHL_REDIRECT_URI!);

  const response = await axios.post<GhlAuthorizationTokenResponse>(GHL_TOKEN_URL, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const tokenData = response.data;

  await leadshubIntegrationRepository.save({
    user_id: userId,
    company_id: tokenData.companyId ?? null,
    location_id: tokenData.locationId ?? null,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    expires_in: tokenData.expires_in,
    user_type: tokenData.userType ?? null,
    expires_at: new Date(Date.now() + tokenData.expires_in * MILLISECONDS_PER_SECOND),
  });

  return true;
}

export async function ghlDisconnectService(userId: string) {
  await leadshubIntegrationRepository.deleteByUserId(userId);
  return true;
}

export async function ghlStatusService(userId: string) {
  const integration = await leadshubIntegrationRepository.findActiveWithOwnerByUserId(userId);

  return {
    connected: Boolean(integration),
    account: integration
      ? {
          ownerName: integration.user.full_name || integration.user.email || null,
          companyName: integration.user.organization.name || null,
          companyId: integration.company_id ?? null,
          locationId: integration.location_id ?? null,
          userType: integration.user_type ?? null,
          connectedAt: integration.updated_at,
        }
      : null,
  };
}
