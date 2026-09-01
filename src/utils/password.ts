import argon2 from "argon2";
import crypto from "node:crypto";

/**
 * Argon2id configuration. These parameters follow current OWASP guidance
 * for interactive login use cases (memory-hard, tuned for ~a few hundred ms
 * per hash on typical server hardware).
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    // Malformed hash or verification error — treat as invalid, never throw
    // to the caller (avoids leaking internal state via error branching).
    return false;
  }
}

/**
 * Generates a cryptographically secure random password suitable for the
 * initial administrator credential. Uses a random byte buffer mapped into
 * a wide character set to maximize entropy per character.
 */
export function generateSecurePassword(length = 24): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()-_=+";
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}
