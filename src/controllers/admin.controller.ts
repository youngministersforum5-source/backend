import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getDashboardStatistics } from "../services/admin.service";

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const { statistics, recentRegistrations } = await getDashboardStatistics();

  res.status(200).json({
    success: true,
    statistics,
    recentRegistrations,
  });
});
