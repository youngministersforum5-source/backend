import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "ymf_admin_session";

/**
 * Generates a cryptographically secure, high-entropy random session token.
 * Only a hash of this value is ever persisted to the database; the raw
 * token is sent to the client exclusively via an HttpOnly cookie.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

/**
 * Session tokens are high-entropy random values (not user-guessable
 * secrets like passwords/OTPs), so a fast SHA-256 hash is sufficient and
 * appropriate for the lookup-by-hash pattern used on every request.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
