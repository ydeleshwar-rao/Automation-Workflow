import { API_ROUTES } from "@/src/constants/api.constants";

/**
 * Disconnect current simPRO integration
 */
export async function disconnectSimpro(): Promise<void> {
  const response = await fetch(API_ROUTES.SIMPRO.DISCONNECT, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to disconnect simPRO");
  }

  return response.json();
}
