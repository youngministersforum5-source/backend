import pino from "pino";
import { env, isProduction } from "../config/env";

/**
 * Structured application logger.
 *
 * IMPORTANT: Never log secrets. Callers must not pass passwords, password
 * hashes, OTP codes, OTP hashes, session tokens, API keys, or DATABASE_URL
 * to this logger. Redaction paths below are a defense-in-depth backstop —
 * do not rely on them instead of simply not logging secrets.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "password",
      "passwordHash",
      "otp",
      "otpHash",
      "token",
      "tokenHash",
      "sessionToken",
      "req.headers.cookie",
      "req.headers.authorization",
      "*.password",
      "*.passwordHash",
      "*.otp",
      "*.otpHash",
    ],
    censor: "[REDACTED]",
  },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
      },
});
