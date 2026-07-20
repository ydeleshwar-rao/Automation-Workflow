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

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────

// Auth is cookie-only. Do not attach bearer tokens from localStorage.

// ── Response interceptor: silent token refresh on 401 ────────────────────────

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

    // Skip refresh for auth endpoints to prevent loops
    const url: string = originalRequest.url ?? ""
    if (url.includes("/auth/login") || url.includes("/auth/google") || url.includes("/auth/refresh")) {
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
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )

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
