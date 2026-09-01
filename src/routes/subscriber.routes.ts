import { Router } from "express";
import { getSubscribers, updateSubscriberStatus } from "../controllers/subscriber.controller";
import { requireAdminAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { listSubscribersQuerySchema, updateSubscriberSchema } from "../schemas/subscription.schema";

const router = Router();

router.use(requireAdminAuth);

router.get("/", validate(listSubscribersQuerySchema), getSubscribers);
router.patch("/:id", validate(updateSubscriberSchema), updateSubscriberStatus);

export default router;
