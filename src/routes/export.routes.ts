import { Router } from "express";
import { exportMembersCSV } from "../controllers/member.controller";
import { exportSubscribersCSV } from "../controllers/subscriber.controller";
import { requireAdminAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAdminAuth);

router.get("/members", exportMembersCSV);
router.get("/subscribers", exportSubscribersCSV);

export default router;
