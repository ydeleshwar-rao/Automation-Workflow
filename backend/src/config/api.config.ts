/**
 * API versioning — every backend route is served under this prefix,
 * e.g. POST /api/v1/auth/login. Bump (and mount a new router) for v2.
 */
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;
