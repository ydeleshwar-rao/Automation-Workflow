import { API_ROUTES } from "@/src/constants/api.constants";

/**
 * Redirect to simPRO connection/authorization page
 */
export async function connectSimpro(): Promise<void> {
  window.location.href = API_ROUTES.SIMPRO.CONNECT;
}
