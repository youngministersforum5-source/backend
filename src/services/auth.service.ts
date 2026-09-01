import { query } from "../config/database";
import { env } from "../config/env";
import { verifyPassword } from "../utils/password";
import { generateSessionToken, hashSessionToken } from "../utils/session";
import { mapAdminRow } from "../utils/mappers";
import { issueOTP, verifyOTP as verifyOtpRecord } from "./otp.service";
import { sendAdminOTP } from "./email.service";
import { logger } from "../utils/logger";

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: "invalid_credentials" | "inactive" };

/**
 * Step 1 of admin login: verify email + password only. Never grants
 * dashboard access on its own — a fresh OTP is always required afterward.
 */
export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const { rows } = await query(`SELECT * FROM admins WHERE email = $1`, [email]);

  if (rows.length === 0) {
    logger.warn({ email }, "Login attempt for unknown admin email");
    return { ok: false, reason: "invalid_credentials" };
  }

  const admin = mapAdminRow(rows[0]);

  if (!admin.isActive) {
    logger.warn({ adminId: admin.id }, "Login attempt for disabled admin account");
    return { ok: false, reason: "inactive" };
  }

  const passwordValid = await verifyPassword(admin.passwordHash, password);

  if (!passwordValid) {
    logger.warn({ adminId: admin.id }, "Login attempt with incorrect password");
    return { ok: false, reason: "invalid_credentials" };
  }

  const otp = await issueOTP(admin.id);
  await sendAdminOTP(admin.email, otp, env.OTP_EXPIRES_MINUTES);

  logger.info({ adminId: admin.id }, "Admin password verified; OTP sent");

  return { ok: true };
}

export async function resendOtpForAdmin(email: string): Promise<void> {
  const { rows } = await query(`SELECT * FROM admins WHERE email = $1`, [email]);

  // Always behave the same way regardless of whether the admin exists, to
  // avoid leaking account existence via response timing/content.
  if (rows.length === 0) {
    logger.warn({ email }, "OTP resend requested for unknown admin");
    return;
  }

  const admin = mapAdminRow(rows[0]);

  if (!admin.isActive) {
    logger.warn({ adminId: admin.id }, "OTP resend requested for inactive admin");
    return;
  }

  const otp = await issueOTP(admin.id);
  await sendAdminOTP(admin.email, otp, env.OTP_EXPIRES_MINUTES);
}

export type VerifyOtpResult =
  | { ok: true; sessionToken: string; admin: { id: string; email: string } }
  | { ok: false; reason: "invalid" | "not_found" };

/**
 * Step 2 of admin login: verify the OTP and, on success, create a new
 * session and return the raw session token for the caller to set as an
 * HttpOnly cookie.
 */
export async function verifyOtpAndCreateSession(email: string, otp: string): Promise<VerifyOtpResult> {
  const { rows } = await query(`SELECT * FROM admins WHERE email = $1`, [email]);

  if (rows.length === 0) {
    return { ok: false, reason: "not_found" };
  }

  const admin = mapAdminRow(rows[0]);

  if (!admin.isActive) {
    return { ok: false, reason: "not_found" };
  }

  const result = await verifyOtpRecord(admin.id, otp);

  if (!result.ok) {
    return { ok: false, reason: "invalid" };
  }

  const sessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + env.SESSION_EXPIRES_HOURS * 60 * 60 * 1000);

  await query(`INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES ($1, $2, $3)`, [
    admin.id,
    tokenHash,
    expiresAt,
  ]);

  logger.info({ adminId: admin.id }, "Admin session created after OTP verification");

  return { ok: true, sessionToken, admin: { id: admin.id, email: admin.email } };
}

export async function invalidateSession(rawToken: string): Promise<void> {
  const tokenHash = hashSessionToken(rawToken);
  await query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [tokenHash]);
}
