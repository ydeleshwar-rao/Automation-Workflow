/**
 * API versioning — every backend route is served under this prefix,
 * e.g. POST /api/v1/auth/login. Bump (and mount a new router) for v2.
 */
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;

const LOCAL_BASE_URL = "http://localhost:5000";

/**
 * Public origin of this backend (no path), e.g. https://api.example.com.
 * Vendors (ServiceM8, Razorpay, Zoho, …) post webhooks here, so in
 * development it must be a tunnel URL (cloudflared / ngrok) to be reachable.
 */
export function getPublicBaseUrl(): string {
  const configuredUrl = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || LOCAL_BASE_URL;
  return configuredUrl.replace(/\/+$/, "");
}

/** Full public URL for a versioned API path, e.g. buildPublicApiUrl("/razorpay/webhook/123"). */
export function buildPublicApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicBaseUrl()}${API_PREFIX}${normalizedPath}`;
}
