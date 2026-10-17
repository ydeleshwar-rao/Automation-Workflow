import type { AxiosBaseQueryError } from "@/src/store/axiosBaseQuery";

/** Failed RTK Query requests (through axiosBaseQuery) reject with `{ status, data }`. */
function isApiError(error: unknown): error is AxiosBaseQueryError {
  return typeof error === "object" && error !== null && ("status" in error || "data" in error);
}

function readBackendMessage(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null || !("message" in data)) return undefined;
  return typeof data.message === "string" && data.message ? data.message : undefined;
}

/**
 * Human-readable message for a failed request: the backend's `{ message }` when present,
 * otherwise the thrown Error's message, otherwise `fallback`.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    const backendMessage = readBackendMessage(error.data);
    if (backendMessage) return backendMessage;
    // Without an HTTP status the request never got a response; axiosBaseQuery puts the client-side reason in `data`.
    if (error.status === undefined && typeof error.data === "string" && error.data) return error.data;
    return fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** HTTP status of a failed request, or undefined when no response was received. */
export function getApiErrorStatus(error: unknown): number | undefined {
  return isApiError(error) ? error.status : undefined;
}
