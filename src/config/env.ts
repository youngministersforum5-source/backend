import "dotenv/config";
import { z } from "zod";

/**
 * All environment variables are validated at startup. If any required
 * variable is missing or malformed, the process exits immediately with a
 * clear error rather than failing unpredictably later at runtime.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  // Pooled Neon connection string — used by the application's runtime pg Pool.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Direct (non-pooled) Neon connection string — used only by db/migrate.ts.
  // Falls back to DATABASE_URL if not provided.
  DIRECT_URL: z.string().min(1).optional(),

  FRONTEND_URL: z.string().url(),

  ADMIN_EMAILS: z.string().min(1, "ADMIN_EMAILS is required"),

  SESSION_EXPIRES_HOURS: z.coerce.number().int().positive().default(24),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),

  OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),

  OTP_RESEND_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
  OTP_RESEND_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),

  PUBLIC_FORM_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  PUBLIC_FORM_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),

  EMAIL_PROVIDER: z.string().default("resend"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM is required"),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables:");
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

export const adminSeedEmails: string[] = env.ADMIN_EMAILS.split(",")
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.length > 0);
