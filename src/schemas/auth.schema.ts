import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
    password: z.string().min(1, "Password is required").max(256),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
    otp: z
      .string()
      .trim()
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only digits"),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>["body"];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>["body"];
export type ResendOtpInput = z.infer<typeof resendOtpSchema>["body"];
