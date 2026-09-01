import { Router } from "express";
import { login, verifyOtp, resendOtp, logout, me } from "../controllers/auth.controller";
import { validate } from "../middleware/validation.middleware";
import { loginSchema, verifyOtpSchema, resendOtpSchema } from "../schemas/auth.schema";
import { requireAdminAuth } from "../middleware/auth.middleware";
import {
  loginRateLimiter,
  verifyOtpRateLimiter,
  resendOtpRateLimiter,
} from "../middleware/rate-limit.middleware";

const router = Router();

router.post("/login", loginRateLimiter, validate(loginSchema), login);
router.post("/verify-otp", verifyOtpRateLimiter, validate(verifyOtpSchema), verifyOtp);
router.post("/resend-otp", resendOtpRateLimiter, validate(resendOtpSchema), resendOtp);
router.post("/logout", logout);
router.get("/me", requireAdminAuth, me);

export default router;
