/**
 * Global localStorage persistence for auth session, profile, and workflow state.
 *
 * Architecture note:
 *   - No clientkey concept — all auth is user_id based with custom JWT
 *   - No selected client / multi-tenant target — each user only accesses their own data
 *   - Permissions are embedded in the JWT, no separate fetch needed
 */

// ---------------------------------------------------------------------------
// Auth session storage
// ---------------------------------------------------------------------------

const SESSION_KEY = "job_mgmt_session"

export interface StoredSession {
  userId:       string
  email:        string
  role:         string                  // 'admin' | 'developer'
  organizationId?: string
  permissions:  string[]               // page keys from JWT, or ['*'] for admin
  expiresIn:    number                  // seconds (from login response)
  expiresAt:    number                  // unix timestamp (seconds) — computed on save
}

/** Persist auth session to localStorage. Computes expiresAt from expiresIn. */
export function saveSession(session: Omit<StoredSession, "expiresAt"> & { expiresAt?: number }): void {
  try {
    const full: StoredSession = {
      ...session,
      expiresAt: session.expiresAt ?? Math.floor(Date.now() / 1000) + session.expiresIn,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(full))
  } catch {
    // Storage quota exceeded or SSR — ignore
  }
}

/** Load stored auth session. Returns null if not found. */
export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

/** Check whether the stored access token is still valid (with 60-second buffer). */
export function isSessionValid(session: StoredSession): boolean {
  return session.expiresAt - 60 > Date.now() / 1000
}

/** Clear stored session (on logout or token refresh failure). */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Profile storage (name, avatar etc. — non-sensitive display data)
// ---------------------------------------------------------------------------

const PROFILE_KEY = "job_mgmt_profile"

export interface StoredProfile {
  userId:    string
  email:     string
  fullName?: string
  avatarUrl?: string | null
  role:      string
  organizationId?: string
}

export function saveProfile(profile: StoredProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // ignore
  }
}

export function loadProfile(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return JSON.parse(raw) as StoredProfile
  } catch {
    // ignore
  }
  return null
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Deprecated stubs — removed concepts kept to avoid import errors during migration
// ---------------------------------------------------------------------------

/**
 * @deprecated clientkey concept removed. Always returns null.
 * Callers that guard on `if (!clientkey) return` will gracefully skip API calls.
 * Gradually remove all usages and delete this stub.
 */
export function getActiveClientKey(): null {
  return null;
}

/** @deprecated Use clearSession() */
export function clearSelectedClientId(): void {
  try { localStorage.removeItem("job_mgmt_selected_client_id") } catch { /* ignore */ }
}

/** @deprecated Use clearSession() */
export function clearSelectedClientProfile(): void {
  try { localStorage.removeItem("job_mgmt_selected_client_profile") } catch { /* ignore */ }
}

/** @deprecated clientkey removed. Always returns null. */
export function loadSelectedClientId(): null {
  return null;
}

/**
 * Returns the current logged-in user's ID from the stored session, or "" if not found.
 * In React components, prefer Redux: `useAppSelector(s => s.access.user?.id ?? "")`.
 * This helper is for non-React contexts (RTK Query, engines, etc.).
 */
export function getActiveUserId(): string {
  try {
    const raw = localStorage.getItem("job_mgmt_session");
    if (!raw) return "";
    const session = JSON.parse(raw) as { userId?: string };
    return session.userId ?? "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Full logout cleanup
// ---------------------------------------------------------------------------

export async function clearBrowserDataOnLogout(): Promise<void> {
  try { localStorage.clear()   } catch { /* ignore */ }
  try { sessionStorage.clear() } catch { /* ignore */ }
  if (typeof window === "undefined") return
  try {
    if ("caches" in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch { /* ignore */ }
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Cross-tab logout broadcast
// ---------------------------------------------------------------------------
// Uses BroadcastChannel (primary) + localStorage signal (fallback) so that
// logging out in one tab logs out every other tab of the same origin.

const LOGOUT_CHANNEL_NAME = "job_mgmt_logout"
const LOGOUT_SIGNAL_KEY = "job_mgmt_logout_signal"

let logoutChannel: BroadcastChannel | null = null

function getLogoutChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null
  if (!logoutChannel && typeof BroadcastChannel !== "undefined") {
    logoutChannel = new BroadcastChannel(LOGOUT_CHANNEL_NAME)
  }
  return logoutChannel
}

/** Broadcast a logout signal to all other open tabs. Call this BEFORE clearing data. */
export function broadcastLogout(): void {
  try {
    getLogoutChannel()?.postMessage("logout")
  } catch {
    // BroadcastChannel not supported — fall through to localStorage signal
  }
  try {
    // Fallback: write a timestamped key so the `storage` event fires in other tabs
    localStorage.setItem(LOGOUT_SIGNAL_KEY, Date.now().toString())
  } catch {
    // ignore
  }
}

/**
 * Register a listener that fires when another tab triggers logout.
 * Returns an unsubscribe function.
 */
export function onCrossTabLogout(callback: () => void): () => void {
  const handlers: Array<() => void> = []

  // 1. BroadcastChannel listener
  const channel = getLogoutChannel()
  if (channel) {
    const bcHandler = (event: MessageEvent) => {
      if (event.data === "logout") callback()
    }
    channel.addEventListener("message", bcHandler)
    handlers.push(() => channel.removeEventListener("message", bcHandler))
  }

  // 2. localStorage `storage` event fallback (fires in OTHER tabs only)
  if (typeof window !== "undefined") {
    const storageHandler = (event: StorageEvent) => {
      // Detect either our explicit signal key or the session being removed
      if (event.key === LOGOUT_SIGNAL_KEY && event.newValue) {
        callback()
      }
      if (event.key === "job_mgmt_session" && event.newValue === null) {
        callback()
      }
    }
    window.addEventListener("storage", storageHandler)
    handlers.push(() => window.removeEventListener("storage", storageHandler))
  }

  return () => handlers.forEach((unsub) => unsub())
}

// ---------------------------------------------------------------------------
// Workflow state storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = "job_mgmt_workflow_state"

// Keys of WorkflowBuilderState that should survive a page reload
type PersistedKeys = "workflow" | "nodes" | "mappings" | "webhookTestData" | "activeView"

export type PersistedWorkflowState = Pick<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<PersistedKeys, any>,
  PersistedKeys
>

/** Load persisted workflow state from localStorage. Returns undefined on miss or parse error. */
export function loadWorkflowState(): PersistedWorkflowState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    return JSON.parse(raw) as PersistedWorkflowState
  } catch {
    return undefined
  }
}

/** Persist selected workflow state keys to localStorage. Silently ignores quota errors. */
export function saveWorkflowState(state: PersistedWorkflowState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage quota exceeded or SSR — ignore
  }
}

/** Clear all persisted workflow state (e.g. on logout or workflow reset). */
export function clearWorkflowState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
