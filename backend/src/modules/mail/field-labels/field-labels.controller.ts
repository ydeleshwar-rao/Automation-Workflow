import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { generateFieldLabelsService } from "./field-labels.service.js";

// Bounds keep one request from turning into an oversized (and costly) prompt
const MAX_FIELD_KEYS = 200;
const MAX_FIELD_KEY_LENGTH = 200;

function parseFieldKeys(body: unknown): string[] {
  const fieldKeys = (body as { keys?: unknown } | undefined)?.keys;
  const isValid =
    Array.isArray(fieldKeys) &&
    fieldKeys.length <= MAX_FIELD_KEYS &&
    fieldKeys.every((fieldKey) => typeof fieldKey === "string" && fieldKey.length <= MAX_FIELD_KEY_LENGTH);

  if (!isValid) {
    throw new ApiError(400, `keys must be an array of at most ${MAX_FIELD_KEYS} strings`);
  }
  return fieldKeys as string[];
}

/** POST /mail/field-labels — body { keys: string[] } → { labels: Record<key, label> } */
export async function generateFieldLabelsController(req: Request, res: Response, next: NextFunction) {
  try {
    const fieldKeys = parseFieldKeys(req.body);
    const labels = fieldKeys.length > 0 ? await generateFieldLabelsService(fieldKeys) : {};
    return ApiResponse(res, 200, "Field labels generated", { labels });
  } catch (error) {
    next(error);
  }
}
