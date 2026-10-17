/**
 * Axios instance for all backend API calls.
 *
 * Features:
 *  - Sends HttpOnly auth cookies with each request
 *  - On 401: attempts one silent token refresh via POST /auth/refresh
 *  - On refresh failure: clears session (forces re-login)
 *  - No clientkey header (removed — auth is user_id based)
 */

import axios from "axios"
import { loadSession, saveSession, clearSession, isSessionValid } from "@/src/store/localStorage"
import { API_BASE_URL, API_ROUTES } from "@/src/constants/api.constants"

const BASE_URL = API_BASE_URL

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────

// Auth is cookie-only. Do not attach bearer tokens from localStorage.

// ── Response interceptor: silent token refresh on 401 ────────────────────────

/**
 * Endpoints called without a session (or that are the refresh itself). A 401 from them is
 * a real answer (wrong password, invalid SSO token, expired reset link) — refreshing would
 * loop or bounce the user to /login, so the error goes straight back to the caller.
 */
const ENDPOINTS_WITHOUT_TOKEN_REFRESH: readonly string[] = [
  API_ROUTES.AUTH.LOGIN,
  API_ROUTES.AUTH.GOOGLE,
  API_ROUTES.AUTH.REGISTER,
  API_ROUTES.AUTH.REFRESH,
  API_ROUTES.AUTH.SETUP,
  API_ROUTES.AUTH.FORGOT_PASSWORD,
  API_ROUTES.AUTH.RESET_PASSWORD,
  API_ROUTES.SSO.CALLBACK,
  API_ROUTES.SSO.DISCOVER,
]

const ABSOLUTE_URL_PATTERN = /^https?:\/\//

function shouldSkipTokenRefresh(requestUrl: string): boolean {
  const absoluteUrl = ABSOLUTE_URL_PATTERN.test(requestUrl) ? requestUrl : `${BASE_URL}${requestUrl}`
  return ENDPOINTS_WITHOUT_TOKEN_REFRESH.some((endpoint) => absoluteUrl.startsWith(endpoint))
}

let isRefreshing = false
type QueueEntry = { resolve: () => void; reject: (err: unknown) => void }
let refreshQueue: QueueEntry[] = []

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
      return Promise.reject(error)
    }

    if (shouldSkipTokenRefresh(originalRequest.url ?? "")) {
      return Promise.reject(error)
    }

    const session = loadSession()

    // Queue requests while refreshing
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: () => {
            originalRequest._retried = true
            resolve(axiosInstance(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retried = true
    isRefreshing = true

    try {
      // POST /auth/refresh. Refresh token is sent only via HttpOnly cookie.
      // Plain axios (not axiosInstance) so a 401 here cannot recurse into this interceptor
      const { data } = await axios.post(API_ROUTES.AUTH.REFRESH, {}, { withCredentials: true })

      const refreshed = data?.data
      if (!refreshed?.user) throw new Error("No user in refresh response")

      // Update stored user metadata. Tokens remain cookie-only.
      saveSession({
        ...session,
        expiresIn:    refreshed.expires_in ?? session?.expiresIn ?? 900,
        // Update permissions if re-fetched during refresh
        permissions:  refreshed.user?.permissions ?? session?.permissions ?? [],
        role:         refreshed.user?.role ?? session?.role ?? "developer",
        userId:       refreshed.user?.id ?? session?.userId ?? "",
        email:        refreshed.user?.email ?? session?.email ?? "",
        organizationId:
          refreshed.user?.organization_id ??
          refreshed.user?.organizationId ??
          session?.organizationId,
      })

      const queue = refreshQueue
      refreshQueue = []
      queue.forEach((entry) => entry.resolve())

      return axiosInstance(originalRequest)
    } catch (refreshErr) {
      const queue = refreshQueue
      refreshQueue = []
      queue.forEach((entry) => entry.reject(refreshErr))
      clearSession()
      if (typeof window !== "undefined") window.location.href = "/login"
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export { isSessionValid }
export default axiosInstance
