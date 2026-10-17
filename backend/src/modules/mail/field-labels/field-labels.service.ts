import { smtpLogger as log } from "../../../utils/logger.js";
import { createOpenRouterFieldLabelClient, type FieldLabelClient } from "./field-labels.client.js";

export type FieldLabels = Record<string, string>;

const CODE_FENCE_PATTERN = /```json|```/g;

function buildPrompt(fieldKeys: string[]): string {
  return `Convert these form field keys to human-readable labels.
Return ONLY a valid JSON object, no markdown, no explanation.
Example: {"firstName": "First Name", "emailaddress": "Email Address"}

Keys: ${fieldKeys.join(", ")}`;
}

/** Keeps only string labels for keys that were actually requested. */
function parseLabels(modelReply: string, fieldKeys: string[]): FieldLabels {
  const parsed: unknown = JSON.parse(modelReply.replace(CODE_FENCE_PATTERN, "").trim());
  if (typeof parsed !== "object" || parsed === null) return {};

  const requestedKeys = new Set(fieldKeys);
  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] => requestedKeys.has(entry[0]) && typeof entry[1] === "string",
    ),
  );
}

/**
 * Labels are a nicety — the frontend formats keys itself when this returns {} —
 * so failures are logged rather than surfaced.
 */
export async function generateFieldLabelsService(
  fieldKeys: string[],
  fieldLabelClient: FieldLabelClient = createOpenRouterFieldLabelClient(),
): Promise<FieldLabels> {
  try {
    const modelReply = await fieldLabelClient.requestLabels(buildPrompt(fieldKeys));
    return modelReply ? parseLabels(modelReply, fieldKeys) : {};
  } catch (error) {
    log.warn("field label generation failed", { error: error instanceof Error ? error.message : String(error) });
    return {};
  }
}
