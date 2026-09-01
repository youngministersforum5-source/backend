import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/error.middleware";
import { toCSV } from "../utils/csv";
import {
  listSubscribers,
  updateSubscriber as updateSubscriberService,
  getAllSubscribersForExport,
  getSubscriberById,
} from "../services/subscription.service";
import { logger } from "../utils/logger";

export const getSubscribers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, isActive, sortBy, sortOrder, from, to } = req.query as unknown as {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    sortBy: "subscribedAt" | "email";
    sortOrder: "asc" | "desc";
    from?: string;
    to?: string;
  };

  const result = await listSubscribers({ page, limit, search, isActive, sortBy, sortOrder, from, to });

  res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
});

export const updateSubscriberStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body as { isActive: boolean };

  const existing = await getSubscriberById(id);
  if (!existing) {
    throw new AppError("Subscriber not found.", 404);
  }

  const updated = await updateSubscriberService(id, isActive);

  logger.info({ adminId: req.admin?.id, subscriberId: id, isActive }, "Admin updated subscriber status");

  res.status(200).json({ success: true, data: updated });
});

export const exportSubscribersCSV = asyncHandler(async (req: Request, res: Response) => {
  const subscribers = await getAllSubscribersForExport();

  const headers = ["Email", "Subscribed Date", "Active"];
  const rows = subscribers.map((s) => [s.email, s.subscribedAt.toISOString(), s.isActive ? "Yes" : "No"]);

  const csv = toCSV(headers, rows);

  logger.info({ adminId: req.admin?.id, count: subscribers.length }, "Admin exported subscribers CSV");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="ymf-subscribers-${Date.now()}.csv"`);
  res.status(200).send(csv);
});
