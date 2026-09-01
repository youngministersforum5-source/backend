import { query, withTransaction } from "../config/database";
import { env } from "../config/env";
import { generateOTP, hashOTP, verifyOTPHash } from "../utils/otp";
import { mapAdminOtpRow } from "../utils/mappers";
import { logger } from "../utils/logger";

export type OtpVerificationResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "used" | "max_attempts" | "incorrect" };

/**
 * Generates a fresh OTP for the given admin, invalidating any previously
 * issued, unused OTPs first (in a single transaction). The raw OTP is
 * returned only so the caller can email it — it is never persisted or
 * logged in plaintext.
 */
export async function issueOTP(adminId: string): Promise<string> {
  const otp = generateOTP();
  const otpHash = hashOTP(otp, env.SESSION_SECRET);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

  await withTransaction(async (client) => {
    await client.query(`UPDATE admin_otps SET used = TRUE WHERE admin_id = $1 AND used = FALSE`, [
      adminId,
    ]);

    await client.query(
      `INSERT INTO admin_otps (admin_id, otp_hash, expires_at) VALUES ($1, $2, $3)`,
      [adminId, otpHash, expiresAt]
    );
  });

  logger.info({ adminId }, "OTP issued for admin login");

  return otp;
}

/**
 * Verifies a submitted OTP against the most recently issued OTP record for
 * the admin. Increments the attempt counter on failure and marks the OTP as
 * used on success.
 */
export async function verifyOTP(adminId: string, submittedOtp: string): Promise<OtpVerificationResult> {
  const { rows } = await query(
    `SELECT * FROM admin_otps WHERE admin_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [adminId]
  );

  if (rows.length === 0) {
    return { ok: false, reason: "not_found" };
  }

  const latestOtp = mapAdminOtpRow(rows[0]);

  if (latestOtp.used) {
    return { ok: false, reason: "used" };
  }

  if (latestOtp.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  if (latestOtp.attempts >= env.OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "max_attempts" };
  }

  const isValid = verifyOTPHash(submittedOtp, env.SESSION_SECRET, latestOtp.otpHash);

  if (!isValid) {
    await query(`UPDATE admin_otps SET attempts = attempts + 1 WHERE id = $1`, [latestOtp.id]);
    return { ok: false, reason: "incorrect" };
  }

  await query(`UPDATE admin_otps SET used = TRUE WHERE id = $1`, [latestOtp.id]);

  return { ok: true };
}
