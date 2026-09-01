import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const jsonRateLimitResponse = {
  success: false,
  message: "Too many requests. Please try again later.",
};

/**
 * POST /api/v1/auth/login
 * Recommended: 5 attempts / 15 minutes / IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitResponse,
});

/**
 * POST /api/v1/auth/verify-otp
 * Rate-limited per IP as a defense-in-depth measure in addition to the
 * per-OTP attempt counter enforced at the database level.
 */
export const verifyOtpRateLimiter = rateLimit({
  windowMs: env.OTP_EXPIRES_MINUTES * 60 * 1000,
  max: env.OTP_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitResponse,
});

/**
 * POST /api/v1/auth/resend-otp
 * Recommended: 3 requests / 15 minutes
 */
export const resendOtpRateLimiter = rateLimit({
  windowMs: env.OTP_RESEND_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.OTP_RESEND_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitResponse,
});

/**
 * POST /api/v1/subscriptions
 * POST /api/v1/registrations
 * Basic protection against abuse of public form endpoints.
 */
export const publicFormRateLimiter = rateLimit({
  windowMs: env.PUBLIC_FORM_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.PUBLIC_FORM_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitResponse,
});
