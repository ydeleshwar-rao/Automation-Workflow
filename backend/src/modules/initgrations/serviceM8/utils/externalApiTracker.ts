import axios from "axios";
import { ApiError } from "../../../../utils/ApiError.js";

const HTTP_BAD_GATEWAY = 502;
const DEFAULT_FAILURE_REASON = "ServiceM8 external API unavailable";

/** Status of the live ServiceM8 call, surfaced to API consumers in the `sm8` response field. */
export interface Sm8Status {
  ok: boolean;
  source: "live";
  reason: string | null;
  checked_at: string;
}

const readFailureReason = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const responseBody = error.response?.data as { error_description?: string; message?: string } | undefined;
    return responseBody?.error_description ?? responseBody?.message ?? error.message;
  }
  return error instanceof Error ? error.message : DEFAULT_FAILURE_REASON;
};

/**
 * Runs a live ServiceM8 read and returns its data with the call status. We keep no local
 * copy of ServiceM8 data, so a failed call becomes a 502 instead of being served from a cache.
 */
export async function withStatusTracking<T>(
  liveRequest: () => Promise<T>
): Promise<{ data: T; sm8: Sm8Status }> {
  try {
    const data = await liveRequest();
    return { data, sm8: { ok: true, source: "live", reason: null, checked_at: new Date().toISOString() } };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const reason = readFailureReason(error);
    console.warn(`[SM8] External API call failed. Reason: ${reason}`);
    throw new ApiError(HTTP_BAD_GATEWAY, `ServiceM8 request failed: ${reason}`);
  }
}
