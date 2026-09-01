// auth.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { SESSION_COOKIE_NAME } from "../utils/session";
import { env, isProduction } from "../config/env";
import {
  loginWithPassword,
  resendOtpForAdmin,
  verifyOtpAndCreateSession,
  invalidateSession,
} from "../services/auth.service";
import { LoginInput, VerifyOtpInput, ResendOtpInput } from "../schemas/auth.schema";

const GENERIC_AUTH_ERROR = "Invalid email or password.";

/**
 * Cookie options for setting the session cookie.
 *
 * `sameSite: "none"` is required because the frontend (youngministersforum.org)
 * and backend (onrender.com) are different sites — this is a cross-site
 * request from the browser's perspective, and `Lax`/`Strict` cookies are
 * never sent on cross-site XHR/fetch calls, only on top-level navigations.
 *
 * `secure: true` is mandatory whenever `sameSite: "none"` is used — browsers
 * silently drop the Set-Cookie header otherwise. Render always serves over
 * HTTPS, so this is safe to hardcode rather than tie to `isProduction`.
 */
function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: env.SESSION_EXPIRES_HOURS * 60 * 60 * 1000,
  };
}

/**
 * Options used to clear the session cookie. Must match the `path`,
 * `secure`, and `sameSite` attributes it was originally set with, or the
 * browser won't recognize it as the same cookie to remove.
 */
function clearSessionCookieOptions() {
  return {
    path: "/",
    secure: true,
    sameSite: "none" as const,
  };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const result = await loginWithPassword(email, password);

  if (!result.ok) {
    // Generic response regardless of whether the email doesn't exist, the
    // password is wrong, or the account is disabled — never leak which.
    res.status(401).json({ success: false, message: GENERIC_AUTH_ERROR });
    return;
  }

  res.status(200).json({
    success: true,
    message: "A verification code has been sent to your email.",
  });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body as VerifyOtpInput;

  const result = await verifyOtpAndCreateSession(email, otp);

  if (!result.ok) {
    res.status(401).json({ success: false, message: "Invalid or expired verification code." });
    return;
  }

  res.cookie(SESSION_COOKIE_NAME, result.sessionToken, sessionCookieOptions());

  res.status(200).json({
    success: true,
    message: "Login successful.",
    admin: { id: result.admin.id, email: result.admin.email },
  });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as ResendOtpInput;

  await resendOtpForAdmin(email);

  // Always generic, whether or not the account exists.
  res.status(200).json({
    success: true,
    message: "If an account exists for this email, a new verification code has been sent.",
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (token) {
    await invalidateSession(token);
  }

  res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
  res.status(200).json({ success: true, message: "Logged out successfully." });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    admin: { id: req.admin!.id, email: req.admin!.email },
  });
});