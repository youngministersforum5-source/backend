import { Router } from "express";
import authRoutes from "./auth.routes";
import registrationRoutes from "./registration.routes";
import subscriptionRoutes from "./subscription.routes";
import adminRoutes from "./admin.routes";
import memberRoutes from "./member.routes";
import subscriberRoutes from "./subscriber.routes";
import exportRoutes from "./export.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/registrations", registrationRoutes);
router.use("/admin", adminRoutes);
router.use("/admin/members", memberRoutes);
router.use("/admin/subscribers", subscriberRoutes);
router.use("/admin/export", exportRoutes);

export default router;
