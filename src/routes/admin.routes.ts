import { Router } from "express";
import { getDashboard } from "../controllers/admin.controller";
import { requireAdminAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/dashboard", requireAdminAuth, getDashboard);

export default router;
