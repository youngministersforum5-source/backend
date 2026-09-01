import { Request, Response } from "express";
import { MemberStatus } from "../types/models";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/error.middleware";
import { toCSV } from "../utils/csv";
import {
  listMembers,
  getMemberById,
  updateMemberStatus as updateMemberStatusService,
  getAllMembersForExport,
} from "../services/registration.service";
import { logger } from "../utils/logger";

export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, status, sortBy, sortOrder } = req.query as unknown as {
    page: number;
    limit: number;
    search?: string;
    status?: MemberStatus;
    sortBy: "createdAt" | "fullName" | "status";
    sortOrder: "asc" | "desc";
  };

  const result = await listMembers({ page, limit, search, status, sortBy, sortOrder });

  res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
});

export const getMemberDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const member = await getMemberById(id);

  if (!member) {
    throw new AppError("Member not found.", 404);
  }

  res.status(200).json({ success: true, data: member });
});

export const updateMemberStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status: MemberStatus };

  const existing = await getMemberById(id);
  if (!existing) {
    throw new AppError("Member not found.", 404);
  }

  const updated = await updateMemberStatusService(id, status);

  logger.info({ adminId: req.admin?.id, memberId: id, status }, "Admin updated member status");

  res.status(200).json({ success: true, data: updated });
});

export const exportMembersCSV = asyncHandler(async (req: Request, res: Response) => {
  const members = await getAllMembersForExport();

  const headers = [
    "Full Name",
    "Email",
    "WhatsApp",
    "Location",
    "Gender",
    "Sound Doctrine",
    "Active Fellowship",
    "Intent",
    "Writing",
    "Media",
    "Intercession",
    "On Ground",
    "Other Gift",
    "Status",
    "Registration Date",
  ];

  const rows = members.map((m) => {
    const gifts = m.gifts ?? { writing: false, media: false, intercession: false, onGround: false };
    return [
      m.fullName,
      m.email,
      m.whatsapp,
      m.location,
      m.gender,
      m.soundDoctrine ? "Yes" : "No",
      m.activeFellowship ? "Yes" : "No",
      m.intent,
      gifts.writing ? "Yes" : "No",
      gifts.media ? "Yes" : "No",
      gifts.intercession ? "Yes" : "No",
      gifts.onGround ? "Yes" : "No",
      m.giftOther ?? "",
      m.status,
      m.createdAt.toISOString(),
    ];
  });

  const csv = toCSV(headers, rows);

  logger.info({ adminId: req.admin?.id, count: members.length }, "Admin exported members CSV");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="ymf-members-${Date.now()}.csv"`);
  res.status(200).send(csv);
});
