/**
 * DEPRECATED — clientkey concept removed.
 *
 * The `clientkey` header is no longer used.
 * All API calls are authenticated via custom JWT (Authorization: Bearer <token>).
 * User identity is extracted from the JWT `sub` (user_id) claim on the backend.
 *
 * ❌ Do NOT use this file.
 * ✅ Auth is handled automatically by axiosInstance interceptors.
 */

export {}; // kept to prevent missing module errors

