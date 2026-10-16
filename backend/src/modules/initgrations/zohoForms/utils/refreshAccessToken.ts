import { zohoFormsRepository } from "../repositories/zohoForms.repository.js";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export const refreshZohoFormsAccessToken = async (
  userId: string,
  refreshToken: string | null
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> => {
  console.log(`[ZohoForms:refresh] 🔄 Starting token refresh for user=${userId}`);

  if (!refreshToken) {
    throw new Error(`No refresh token for user ${userId}`);
  }

  const currentRow = await zohoFormsRepository.findIntegrationByUserId(userId);

  if (currentRow && currentRow.expires_at.getTime() > Date.now() + REFRESH_BUFFER_MS) {
    console.log(`[ZohoForms:refresh] ✅ Token already fresh for user=${userId}`);
    return {
      access_token: currentRow.access_token,
      refresh_token: currentRow.refresh_token ?? refreshToken,
      expires_in: Math.floor((currentRow.expires_at.getTime() - Date.now()) / 1000),
    };
  }

  const res = await fetch(`https://accounts.zoho.com/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRow?.refresh_token ?? refreshToken,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
    }),
  });

  const body: any = await res.json();

  if (!res.ok || body.error) {
    const reason = body?.error_description || body?.error || "unknown";
    console.error(`[ZohoForms:refresh] ❌ Refresh failed for user=${userId}: ${reason}`);

    await zohoFormsRepository.markNeedsReauth(userId);

    throw new Error(`Zoho Forms token refresh failed: ${reason}`);
  }

  const newExpiry = new Date();
  newExpiry.setSeconds(newExpiry.getSeconds() + (body.expires_in || 3600));

  const keptRefreshToken: string = body.refresh_token || currentRow?.refresh_token || refreshToken;

  await zohoFormsRepository.saveTokens(userId, {
    access_token: body.access_token,
    refresh_token: keptRefreshToken,
    expires_at: newExpiry,
  });

  console.log(`[ZohoForms:refresh] ✅ Token refresh complete for user=${userId}`);
  return {
    access_token: body.access_token,
    refresh_token: keptRefreshToken,
    expires_in: body.expires_in || 3600,
  };
};
