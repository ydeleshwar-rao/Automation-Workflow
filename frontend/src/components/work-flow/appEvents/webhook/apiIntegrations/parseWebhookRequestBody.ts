/**
 * Normalizes a webhook event row from GET /api/getwebhook/:id/event.
 * Backends differ: `request_body`, camelCase, `body`, JSON string, nested `request`, etc.
 */
export function parseRequestBodyFromWebhookRow(row: unknown): Record<string, unknown> | undefined {
  if (!row || typeof row !== "object" || Array.isArray(row)) return undefined;
  const record = row as Record<string, unknown>;
  const candidates: unknown[] = [
    record.request_body,
    record.requestBody,
    record.body,
    record.payload,
    record.data,
  ];
  const nested = record.request;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const nestedRecord = nested as Record<string, unknown>;
    candidates.push(nestedRecord.body, nestedRecord.payload, nestedRecord.data, nestedRecord.request_body, nestedRecord.requestBody);
  }

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        continue;
      }
    }
    if (typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }
  return undefined;
}
