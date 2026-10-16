import type { Prisma } from "@prisma/client";

export type TriggerRecord = Record<string, unknown>;

/** Subscription `config` is a JSON column; adapters expect a plain object. */
export function readSubscriptionConfig(config: Prisma.JsonValue): TriggerRecord {
  const isPlainObject = typeof config === "object" && config !== null && !Array.isArray(config);
  return isPlainObject ? (config as TriggerRecord) : {};
}

/** Field-mapper schema: every top-level key of the sample, value null. */
export function buildOutputSchema(sample: TriggerRecord): Record<string, null> {
  return Object.fromEntries(Object.keys(sample).map((key) => [key, null]));
}

/** Prisma JSON input from a record already parsed from JSON (vendor payload). */
export function toJsonInput(record: TriggerRecord): Prisma.InputJsonValue {
  return record as Prisma.InputJsonValue;
}
