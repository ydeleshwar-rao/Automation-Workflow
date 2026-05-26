import { getActiveClientKey } from "@/src/store/localStorage";

/**
 * Returns the `clientkey` header for API calls.
 * Uses the selected client's key when a developer/admin is acting as a client,
 * otherwise falls back to the logged-in user's own key.
 */
export async function getRequestHeaders(): Promise<{ clientkey: string }> {
  return { clientkey: getActiveClientKey() };
}
