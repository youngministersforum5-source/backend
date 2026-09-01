import { Router } from "express";
import { createNewSubscription } from "../controllers/subscription.controller";
import { validate } from "../middleware/validation.middleware";
import { createSubscriptionSchema } from "../schemas/subscription.schema";
import { publicFormRateLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

router.post("/", publicFormRateLimiter, validate(createSubscriptionSchema), createNewSubscription);

export default router;
