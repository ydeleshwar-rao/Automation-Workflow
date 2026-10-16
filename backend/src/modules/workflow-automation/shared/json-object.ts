import type { Prisma } from "@prisma/client";

/** Narrows a Prisma JSON column to a plain object; anything else becomes `{}`. */
export function asJsonObject(value: Prisma.JsonValue | null | undefined): Record<string, any> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

/** Narrows a Prisma JSON column to an array; anything else becomes `[]`. */
export function asJsonArray<Item = any>(value: Prisma.JsonValue | null | undefined): Item[] {
  return Array.isArray(value) ? (value as Item[]) : [];
}
