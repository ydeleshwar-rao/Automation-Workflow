import { ApiError } from "../../../utils/ApiError.js";

const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const MILLISECONDS_PER_SECOND = 1000;

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
  name?: string;
  picture?: string;
};

export interface GoogleAccount {
  email: string;
  name: string;
  picture: string | null;
}

/** Verifies a Google ID token with Google's tokeninfo endpoint and returns the verified account. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleAccount> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new ApiError(500, "Google sign-in is not configured (GOOGLE_CLIENT_ID is missing)");

  const response = await fetch(`${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) throw new ApiError(401, "Invalid Google sign-in token");
  const tokenInfo = (await response.json()) as GoogleTokenInfo;

  if (tokenInfo.aud !== clientId) throw new ApiError(401, "Google token was issued for a different app");
  if (Number(tokenInfo.exp ?? 0) * MILLISECONDS_PER_SECOND < Date.now()) {
    throw new ApiError(401, "Google token has expired");
  }
  if (!tokenInfo.email || String(tokenInfo.email_verified) !== "true") {
    throw new ApiError(401, "Google email is not verified");
  }

  return {
    email: tokenInfo.email.trim().toLowerCase(),
    name: tokenInfo.name?.trim() ?? "",
    picture: tokenInfo.picture ?? null,
  };
}
