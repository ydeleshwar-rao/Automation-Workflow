/**
 * Normalizes a webhook event row from GET /api/getwebhook/:id/event.
 * Backends differ: `request_body`, camelCase, `body`, JSON string, nested `request`, etc.
 */
export function parseRequestBodyFromWebhookRow(row: unknown): Record<string, unknown> | undefined {
  if (!row || typeof row !== "object" || Array.isArray(row)) return undefined;
  const r = row as Record<string, unknown>;
  const candidates: unknown[] = [
    r.request_body,
    r.requestBody,
    r.body,
    r.payload,
    r.data,
  ];
  const nested = r.request;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const nr = nested as Record<string, unknown>;
    candidates.push(nr.body, nr.payload, nr.data, nr.request_body, nr.requestBody);
  }

  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    if (typeof c === "string") {
      const t = c.trim();
      if (!t) continue;
      try {
        const parsed = JSON.parse(t) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        continue;
      }
    }
    if (typeof c === "object" && !Array.isArray(c)) {
      return c as Record<string, unknown>;
    }
  }
  return undefined;
}
