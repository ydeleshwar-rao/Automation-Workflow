/**
 * Global localStorage persistence for workflow & webhook state.
 *
 * Only the relevant slice keys are persisted — RTK Query cache,
 * execution history, and ephemeral UI state are intentionally excluded
 * so they are always refreshed from the server.
 */

// ---------------------------------------------------------------------------
// Auth session storage
// ---------------------------------------------------------------------------

const SESSION_KEY = "job_mgmt_session"

export interface StoredSession {
  userId: string
  email: string
  accessToken: string
  refreshToken: string
  expiresAt: number // unix timestamp (seconds)
}

/** Persist auth session tokens to localStorage. */
export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage quota exceeded or SSR — ignore
  }
}

/** Load stored auth session. Returns null if not found or expired. */
export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    return session
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
// Profile / Auth storage
// ---------------------------------------------------------------------------

const PROFILE_KEY = "job_mgmt_profile"

export interface StoredProfile {
  userId: string
  clientKey: string
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  phone?: string | null
  companyName?: string | null
  avatarUrl?: string | null
  websiteUrl?: string | null
  jobAppType?: string | null
}

/** Save profile data to localStorage. */
export function saveProfile(profile: StoredProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // Storage quota exceeded or SSR — ignore
  }
}

/** Load profile data from localStorage. Returns null if not found. */
export function loadProfile(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return JSON.parse(raw) as StoredProfile
  } catch {
    // ignore parse errors
  }
  return null
}

/** Clear stored profile (e.g. on logout). */
export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Best-effort browser cleanup on logout.
 * Clears local/session storage, cache storage, service workers and auth cookie.
 */
export async function clearBrowserDataOnLogout(): Promise<void> {
  try {
    localStorage.clear()
  } catch {
    // ignore
  }
  try {
    sessionStorage.clear()
  } catch {
    // ignore
  }
  if (typeof window === "undefined") return
  try {
    if ("caches" in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch {
    // ignore
  }
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
  } catch {
    // ignore
  }
  try {
    document.cookie =
      "jm_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Selected client (multi-tenant target user) storage
// ---------------------------------------------------------------------------
// Uses sessionStorage so each browser tab can act as a different client.
// localStorage is shared across tabs; sessionStorage is per-tab.

const SELECTED_CLIENT_KEY = "job_mgmt_selected_client_id"
const SELECTED_CLIENT_PROFILE_KEY = "job_mgmt_selected_client_profile"

export interface SelectedClientProfile {
  id: string
  email: string
  name?: string
  companyName?: string
  clientKey?: string
}

/** Persist the active "act-as" client id (per-tab via sessionStorage). Pass null to clear. */
export function saveSelectedClientId(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(SELECTED_CLIENT_KEY, id)
    else sessionStorage.removeItem(SELECTED_CLIENT_KEY)
  } catch {
    // ignore
  }
}

/** Read the active "act-as" client id. Returns null on miss / SSR. */
export function loadSelectedClientId(): string | null {
  try {
    if (typeof window === "undefined") return null
    return sessionStorage.getItem(SELECTED_CLIENT_KEY)
  } catch {
    return null
  }
}

/** Clear the active "act-as" client id (on logout). */
export function clearSelectedClientId(): void {
  try {
    sessionStorage.removeItem(SELECTED_CLIENT_KEY)
  } catch {
    // ignore
  }
}

/** Save the selected client's profile info (per-tab). */
export function saveSelectedClientProfile(profile: SelectedClientProfile | null): void {
  try {
    if (profile) sessionStorage.setItem(SELECTED_CLIENT_PROFILE_KEY, JSON.stringify(profile))
    else sessionStorage.removeItem(SELECTED_CLIENT_PROFILE_KEY)
  } catch {
    // ignore
  }
}

/** Load the selected client's profile info. */
export function loadSelectedClientProfile(): SelectedClientProfile | null {
  try {
    if (typeof window === "undefined") return null
    const raw = sessionStorage.getItem(SELECTED_CLIENT_PROFILE_KEY)
    if (raw) return JSON.parse(raw) as SelectedClientProfile
  } catch {
    // ignore
  }
  return null
}

/** Clear the selected client profile (on logout or switch). */
export function clearSelectedClientProfile(): void {
  try {
    sessionStorage.removeItem(SELECTED_CLIENT_PROFILE_KEY)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Active client key resolver
// ---------------------------------------------------------------------------
// Returns the clientKey for the currently active context:
//   - If a client is selected (developer/admin acting as a client) → client's key
//   - Otherwise → the logged-in user's own key
// This must be used for ALL API calls that send the `clientkey` header.

export function getActiveClientKey(): string {
  const selectedProfile = loadSelectedClientProfile()
  if (selectedProfile?.clientKey) {
    return selectedProfile.clientKey
  }
  // Fallback to the logged-in user's own key (for regular users, or when no client selected)
  const ownProfile = loadProfile()
  return ownProfile?.clientKey ?? ""
}

/** Same as getActiveClientKey but returns the userId of the active context. */
export function getActiveUserId(): string {
  const selectedId = loadSelectedClientId()
  if (selectedId) return selectedId
  const ownProfile = loadProfile()
  return ownProfile?.userId ?? ""
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
