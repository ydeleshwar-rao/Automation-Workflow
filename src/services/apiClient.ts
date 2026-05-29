/**
 * Axios instance for all backend API calls.
 *
 * Features:
 *  - Auto-attaches Authorization: Bearer <access_token> from localStorage session
 *  - On 401: attempts one silent token refresh via POST /auth/refresh
 *  - On refresh failure: clears session (forces re-login)
 *  - No clientkey header (removed — auth is user_id based)
 */

import axios from "axios"
import { loadSession, saveSession, clearSession, isSessionValid } from "@/src/store/localStorage"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────

axiosInstance.interceptors.request.use((config) => {
  const session = loadSession()
  if (session?.accessToken) {
    const h = config.headers
    const existing = typeof h?.get === "function" ? h.get("Authorization") : (h as any)?.["Authorization"]
    if (!existing) {
      if (typeof h?.set === "function") {
        h.set("Authorization", `Bearer ${session.accessToken}`)
      } else {
        ;(h as any)["Authorization"] = `Bearer ${session.accessToken}`
      }
    }
  }
  return config
})

// ── Response interceptor: silent token refresh on 401 ────────────────────────

let isRefreshing = false
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void }
let refreshQueue: QueueEntry[] = []

function setAuthHeader(config: any, token: string): void {
  if (!config) return
  if (!config.headers) config.headers = {}
  if (typeof config.headers.set === "function") {
    config.headers.set("Authorization", `Bearer ${token}`)
  } else {
    config.headers["Authorization"] = `Bearer ${token}`
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
      return Promise.reject(error)
    }

    // Skip refresh for auth endpoints to prevent loops
    const url: string = originalRequest.url ?? ""
    if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
      return Promise.reject(error)
    }

    const session = loadSession()
    if (!session?.refreshToken) {
      clearSession()
      if (typeof window !== "undefined") window.location.href = "/login"
      return Promise.reject(error)
    }

    // Queue requests while refreshing
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (newToken: string) => {
            setAuthHeader(originalRequest, newToken)
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
      // POST /auth/refresh — our custom refresh endpoint
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: session.refreshToken,
      })

      const refreshed = data?.data
      if (!refreshed?.access_token) throw new Error("No access_token in refresh response")

      // Update stored session with new tokens + updated permissions
      saveSession({
        ...session,
        accessToken:  refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? session.refreshToken,
        expiresIn:    refreshed.expires_in ?? session.expiresIn,
        // Update permissions if re-fetched during refresh
        permissions:  refreshed.user?.permissions ?? session.permissions,
        role:         refreshed.user?.role ?? session.role,
      })

      const queue = refreshQueue
      refreshQueue = []
      queue.forEach((entry) => entry.resolve(refreshed.access_token))

      setAuthHeader(originalRequest, refreshed.access_token)
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
