/**
 * DEPRECATED — Direct Supabase DB access removed.
 * simPRO token management now lives in the backend (job-management-backEnd).
 * This file is kept as an empty stub to prevent import errors in legacy callers.
 */

export interface SimproConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

export async function getSimproToken(_userId: string): Promise<null> {
  return null;
}

export async function refreshSimproToken(
  _userId: string,
  _refreshToken: string,
  _config: SimproConfig,
): Promise<null> {
  return null;
}

export async function makeSimproRequest(
  _userId: string,
  _method: string,
  _endpoint: string,
  _body?: unknown,
): Promise<never> {
  throw new Error("makeSimproRequest: use the backend API instead.");
}
