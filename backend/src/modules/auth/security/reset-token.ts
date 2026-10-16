import crypto from "node:crypto";

const RESET_TOKEN_BYTES = 32;

/** Random URL-safe token (sent to the user) plus its SHA-256 hash (stored in the database). */
export function createResetToken() {
  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
