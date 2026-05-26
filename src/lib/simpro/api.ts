import { createClient } from "@/src/lib/supabase/server";
import { SimproToken } from "./types";

export interface SimproConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

export async function getSimproToken(userId: string): Promise<SimproToken | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("simpro_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as SimproToken;
}

export async function refreshSimproToken(userId: string, refreshToken: string, config: SimproConfig): Promise<SimproToken | null> {
  try {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || data.error || "Failed to refresh token");

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 3600));

    const newToken: SimproToken = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt.toISOString()
    };

    const supabase = await createClient();
    await supabase
      .from("simpro_integrations")
      .update({
        access_token: newToken.access_token,
        refresh_token: newToken.refresh_token,
        expires_at: newToken.expires_at
      })
      .eq("user_id", userId);

    return newToken;
  } catch (err) {
    console.error("simPRO refresh error:", err);
    return null;
  }
}

export async function makeSimproRequest(userId: string, method: string, endpoint: string, body: any = null) {
  const supabase = await createClient();
  const { data: integration, error: intError } = await supabase
    .from("simpro_integrations")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (intError || !integration) throw new Error("simPRO integration not found");

  let accessToken = integration.access_token;
  const isExpired = new Date(integration.expires_at).getTime() < Date.now() + 60000;

  if (isExpired) {
    const refreshed = await refreshSimproToken(userId, integration.refresh_token, {
      clientId: process.env.SIMPRO_CLIENT_ID!,
      clientSecret: process.env.SIMPRO_CLIENT_SECRET!,
      tokenUrl: process.env.SIMPRO_TOKEN_URL!
    });
    if (!refreshed) throw new Error("Failed to refresh simPRO token");
    accessToken = refreshed.access_token;
  }

  const response = await fetch(`${integration.api_base_url}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `simPRO API error: ${response.statusText}`);
  }

  return response.json();
}
