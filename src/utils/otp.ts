import crypto from "node:crypto";

/**
 * Generates a cryptographically secure 6-digit OTP using Node's CSPRNG.
 * Never use Math.random() for security-sensitive values.
 */
export function generateOTP(): string {
  // crypto.randomInt is uniform and cryptographically secure.
  const value = crypto.randomInt(0, 1_000_000);
  return value.toString().padStart(6, "0");
}

/**
 * OTPs are short, numeric, and short-lived, so a fast keyed hash (HMAC-SHA256
 * with a server-side secret) is appropriate — unlike passwords, OTPs do not
 * need a memory-hard KDF, and using HMAC keeps verification cheap for the
 * high-frequency login flow while still preventing raw storage of the code.
 */
export function hashOTP(otp: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

export function verifyOTPHash(otp: string, secret: string, hash: string): boolean {
  const computed = hashOTP(otp, secret);
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
