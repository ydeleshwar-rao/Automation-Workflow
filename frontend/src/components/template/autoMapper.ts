/**
 * Generic auto-mapper: maps webhook-style flat payloads to destination field keys.
 * No integration-specific names or shapes — matching is heuristic only.
 */

import Fuse from "fuse.js";

import { fieldAliases } from "./fieldAliases";

// Fuse.js threshold: 0.0 = exact match only, 1.0 = match anything
// 0.15 — stricter; reduce wrong fuzzy guesses on short field names
const FUZZY_MATCH_THRESHOLD = 0.15;

/** Strip leading `nodeId__` (digits only) so e.g. `315896032__firstName` → `firstName`. */
function stripLeadingDigitNodePrefixFromFlatKeys(
  flat: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(flat)) {
    const stripped = key.replace(/^\d+__/, "");
    if (!(stripped in merged)) {
      merged[stripped] = val;
      continue;
    }
    const existing = merged[stripped];
    const emptyExisting =
      existing === undefined ||
      existing === null ||
      (typeof existing === "string" && existing.trim() === "");
    const emptyNew =
      val === undefined ||
      val === null ||
      (typeof val === "string" && String(val).trim() === "");
    if (emptyExisting && !emptyNew) merged[stripped] = val;
  }
  return merged;
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .replace(/^_/, "")
    .toLowerCase();
}

/**
 * Flattens nested objects into dot-path keys (and keeps leaf keys at top level when unambiguous).
 */
export function flattenWebhookPayload(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;

  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenWebhookPayload(v as Record<string, unknown>, path));
    } else {
      out[path] = v;
      if (!prefix) {
        out[k] = v;
      }
    }
  }
  return out;
}

/**
 * Takes destination field keys and a flat (or flattened) webhook payload; returns suggested values per key.
 */
export function autoMapFields(
  fieldKeys: string[],
  webhookPayload: Record<string, unknown>
): Record<string, unknown> {
  const normalizedPayload = stripLeadingDigitNodePrefixFromFlatKeys(webhookPayload);
  const payloadKeys = Object.keys(normalizedPayload);
  const result: Record<string, unknown> = {};

  if (!payloadKeys.length) {
    fieldKeys.forEach((field) => {
      result[field] = "";
    });
    return result;
  }

  const fuse = new Fuse(
    payloadKeys.map((k) => ({ original: k, normalized: toSnakeCase(k) })),
    {
      keys: ["normalized"],
      threshold: FUZZY_MATCH_THRESHOLD,
      includeScore: true,
    }
  );

  fieldKeys.forEach((field) => {
    if (normalizedPayload[field] !== undefined) {
      result[field] = normalizedPayload[field];
      return;
    }

    const aliases = fieldAliases[field] ?? [];
    const aliasMatch = aliases.find(
      (alias) => normalizedPayload[alias] !== undefined
    );
    if (aliasMatch !== undefined) {
      result[field] = normalizedPayload[aliasMatch] ?? "";
      return;
    }

    const matches = fuse.search(toSnakeCase(field));
    if (matches.length > 0) {
      const bestKey = matches[0].item.original;
      result[field] = normalizedPayload[bestKey] ?? "";
    } else {
      result[field] = "";
    }
  });

  return result;
}
