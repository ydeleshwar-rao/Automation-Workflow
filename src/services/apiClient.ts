import axios from "axios"
import {
  loadSession,
  saveSession,
  clearSession,
  isSessionValid,
  loadSelectedClientId,
  StoredSession,
} from "@/src/store/localStorage"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Auto-attach Authorization + x-target-user-id from localStorage.
// Read from localStorage (not the Redux store) to avoid a circular import:
// axiosBaseQuery → store → reducers → axiosBaseQuery. Slice writes mirror to localStorage.
axiosInstance.interceptors.request.use((config) => {
  // axios 1.x exposes AxiosHeaders here; use .set/.get for case-safe access.
  const headers = config.headers
  const session = loadSession()
  if (session?.accessToken) {
    const existing =
      typeof headers?.get === "function"
        ? headers.get("Authorization")
        : (headers as Record<string, unknown>)?.["Authorization"]
    if (!existing) {
      if (typeof headers?.set === "function") {
        headers.set("Authorization", `Bearer ${session.accessToken}`)
      } else {
        ;(headers as Record<string, unknown>)["Authorization"] = `Bearer ${session.accessToken}`
      }
    }
  }
  const targetId = loadSelectedClientId()
  if (targetId) {
    const existing =
      typeof headers?.get === "function"
        ? headers.get("x-target-user-id")
        : (headers as Record<string, unknown>)?.["x-target-user-id"]
    if (!existing) {
      if (typeof headers?.set === "function") {
        headers.set("x-target-user-id", targetId)
      } else {
        ;(headers as Record<string, unknown>)["x-target-user-id"] = targetId
      }
    }
  }
  return config
})

// On 401 — attempt token refresh once, then clear session
let isRefreshing = false
type QueueEntry = {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}
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

    // Don't try to refresh on auth endpoints themselves — that would loop.
    const url: string = originalRequest.url ?? ""
    if (url.includes("/auth/login") || url.includes("/auth/refresh") || url.includes("/auth/session/refresh")) {
      return Promise.reject(error)
    }

    const session = loadSession()
    if (!session?.refreshToken) {
      clearSession()
      return Promise.reject(error)
    }

    // If already refreshing, queue this request
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
      const { data } = await axios.post(`${BASE_URL}/auth/session/refresh`, {
        refresh_token: session.refreshToken,
      })

      const refreshed = data?.data
      if (!refreshed?.access_token) throw new Error("No token in refresh response")

      const updatedSession: StoredSession = {
        ...session,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? session.refreshToken,
        expiresAt: refreshed.expires_at ?? session.expiresAt,
      }
      saveSession(updatedSession)

      // Flush the queue with the new token
      const queue = refreshQueue
      refreshQueue = []
      queue.forEach((entry) => entry.resolve(updatedSession.accessToken))

      setAuthHeader(originalRequest, updatedSession.accessToken)
      return axiosInstance(originalRequest)
    } catch (refreshErr) {
      // Reject all queued requests so they don't hang forever
      const queue = refreshQueue
      refreshQueue = []
      queue.forEach((entry) => entry.reject(refreshErr))

      clearSession()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export { isSessionValid }
export default axiosInstance
