/**
 * DEPRECATED — clientkey concept removed.
 *
 * The `clientkey` header is no longer used.
 * All app API calls are authenticated via HttpOnly cookies.
 * User identity is extracted from the JWT `sub` (user_id) claim on the backend.
 *
 * ❌ Do NOT use this file.
 * ✅ Auth is handled automatically by axiosInstance interceptors.
 */

export {}; // kept to prevent missing module errors

