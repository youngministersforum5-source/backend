import { Router } from "express";
import { createMemberRegistration } from "../controllers/registration.controller";
import { validate } from "../middleware/validation.middleware";
import { createRegistrationSchema } from "../schemas/registration.schema";
import { publicFormRateLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

router.post("/", publicFormRateLimiter, validate(createRegistrationSchema), createMemberRegistration);

export default router;
