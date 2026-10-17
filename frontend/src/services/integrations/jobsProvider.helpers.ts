import type { JobsFilters } from "@/src/types/dashboard.types";

/** Parses an amount the backend may send as a string, number, null or "" — anything unparseable counts as 0. */
export const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Copies only the filters a provider's endpoint understands, dropping empty values so they are not sent as `?status=`. */
export const buildJobsQueryParams = (
  filters: JobsFilters,
  supportedFilterKeys: readonly (keyof JobsFilters)[],
): Record<string, string> => {
  const queryParams: Record<string, string> = {};
  for (const filterKey of supportedFilterKeys) {
    const filterValue = filters[filterKey];
    if (filterValue) queryParams[filterKey] = filterValue;
  }
  return queryParams;
};

interface JobsResponseEnvelope {
  data?: unknown;
}

const readEnvelopeData = (value: unknown): unknown =>
  typeof value === "object" && value !== null ? (value as JobsResponseEnvelope).data : undefined;

/**
 * The jobs endpoints wrap the integration's own `{ success, data }` reply inside our
 * `ApiResponse` envelope, but some return the list one level up — accept either.
 */
export const unwrapJobsPayload = <TBlock>(response: unknown): TBlock[] => {
  const outerData = readEnvelopeData(response);
  const innerData = readEnvelopeData(outerData);
  const payload = innerData ?? outerData;
  return Array.isArray(payload) ? (payload as TBlock[]) : [];
};
