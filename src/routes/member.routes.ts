import { Router } from "express";
import {
  getMembers,
  getMemberDetails,
  updateMemberStatus,
} from "../controllers/member.controller";
import { requireAdminAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  listMembersQuerySchema,
  memberIdParamSchema,
  updateMemberStatusSchema,
} from "../schemas/registration.schema";

const router = Router();

router.use(requireAdminAuth);

router.get("/", validate(listMembersQuerySchema), getMembers);
router.get("/:id", validate(memberIdParamSchema), getMemberDetails);
router.patch("/:id/status", validate(updateMemberStatusSchema), updateMemberStatus);

export default router;
