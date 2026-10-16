import axios from "axios";
import { getServiceM8Token } from "./getToken.js";

export const SERVICEM8_BASE_URL = "https://api.servicem8.com/api_1.0";

/** ServiceM8 accepts at most 10 conditions per $filter (only eq/ne/gt/lt joined with "and"). */
export const MAX_FILTER_CONDITIONS = 10;

/**
 * ServiceM8 has no "in"/"or" filter. Up to this many lookup values are fetched one
 * filtered request each; above it the whole collection is fetched once and filtered in memory.
 */
const MAX_PER_VALUE_REQUESTS = 5;

const HTTP_UNAUTHORIZED = 401;
const EMPTY_DATE_TIME = "0000-00-00 00:00:00";

export type ServiceM8Record = Record<string, unknown>;
export type ServiceM8Headers = Record<string, string>;

export const getServiceM8Headers = async (userId: string, forceRefresh = false): Promise<ServiceM8Headers> => {
  const accessToken = await getServiceM8Token(userId, forceRefresh);
  return { Authorization: `Bearer ${accessToken}`, Accept: "application/json" };
};

const isUnauthorizedError = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === HTTP_UNAUTHORIZED;

/**
 * Runs a ServiceM8 request. A 401 (token silently revoked — e.g. another user reconnected
 * the same account) triggers one force-refresh and a single retry.
 */
export const callServiceM8 = async <T>(
  userId: string,
  request: (headers: ServiceM8Headers) => Promise<T>
): Promise<T> => {
  const headers = await getServiceM8Headers(userId);
  try {
    return await request(headers);
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error;
    console.warn(`[SM8] 401 for user ${userId} — token may have been revoked externally, force-refreshing and retrying`);
    return request(await getServiceM8Headers(userId, true));
  }
};

/** Builds one `field eq 'value'` condition with single quotes escaped. */
export const equalsCondition = (field: string, value: string) =>
  `${field} eq '${value.replace(/'/g, "''")}'`;

/** GET /<resource>.json, optionally narrowed by `$filter` conditions joined with "and". */
export const fetchServiceM8Records = (
  userId: string,
  resource: string,
  filterConditions: string[] = []
): Promise<ServiceM8Record[]> =>
  callServiceM8(userId, async (headers) => {
    const params = filterConditions.length ? { $filter: filterConditions.join(" and ") } : undefined;
    const response = await axios.get(`${SERVICEM8_BASE_URL}/${resource}.json`, { headers, params });
    return Array.isArray(response.data) ? (response.data as ServiceM8Record[]) : [];
  });

/**
 * Fetches the records of `resource` whose `field` equals one of `values`
 * (plus any `baseConditions`), choosing the cheapest strategy for the number of values.
 */
export const fetchServiceM8RecordsMatching = async (
  userId: string,
  resource: string,
  field: string,
  values: string[],
  baseConditions: string[] = []
): Promise<ServiceM8Record[]> => {
  const uniqueValues = [...new Set(values.filter(Boolean))];
  if (uniqueValues.length === 0) return [];

  if (uniqueValues.length <= MAX_PER_VALUE_REQUESTS) {
    const recordGroups = await Promise.all(
      uniqueValues.map((value) =>
        fetchServiceM8Records(userId, resource, [...baseConditions, equalsCondition(field, value)])
      )
    );
    return recordGroups.flat();
  }

  const wantedValues = new Set(uniqueValues);
  const allRecords = await fetchServiceM8Records(userId, resource, baseConditions);
  return allRecords.filter((record) => wantedValues.has(record[field] as string));
};

/** ServiceM8 sends "" and "0000-00-00 00:00:00" for empty values; turn them into null. */
export const normalizeServiceM8Record = (record: ServiceM8Record): ServiceM8Record =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      value === "" || value === EMPTY_DATE_TIME || value === undefined ? null : value,
    ])
  );

/** Reads the uuid of a newly created record (ServiceM8 returns it in the x-record-uuid header). */
export const readCreatedRecordUuid = (
  responseHeaders: Record<string, unknown> | undefined,
  responseBody: unknown
): string | null => {
  const headerUuid = responseHeaders?.["x-record-uuid"];
  if (typeof headerUuid === "string" && headerUuid) return headerUuid;
  const bodyUuid = (responseBody as { uuid?: unknown } | null)?.uuid;
  return typeof bodyUuid === "string" ? bodyUuid : null;
};
