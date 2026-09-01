import { NextFunction, Request, Response } from "express";
import { query } from "../config/database";
import { SESSION_COOKIE_NAME, hashSessionToken } from "../utils/session";
import { mapAdminSessionRow, mapAdminRow } from "../utils/mappers";
import { logger } from "../utils/logger";

/**
 * Protects admin routes. Validates the session cookie against the database,
 * ensures the session has not expired, and ensures the associated admin
 * account is still active. Attaches the authenticated admin to `req.admin`.
 */
export async function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME];

    if (!token || typeof token !== "string") {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const tokenHash = hashSessionToken(token);

    const sessionResult = await query(`SELECT * FROM admin_sessions WHERE token_hash = $1`, [
      tokenHash,
    ]);

    if (sessionResult.rows.length === 0) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const session = mapAdminSessionRow(sessionResult.rows[0]);

    if (session.expiresAt.getTime() < Date.now()) {
      // Best-effort cleanup of the expired session; failure here should not
      // block the 401 response.
      await query(`DELETE FROM admin_sessions WHERE id = $1`, [session.id]).catch(() => undefined);
      res.status(401).json({ success: false, message: "Session expired. Please log in again." });
      return;
    }

    const adminResult = await query(`SELECT * FROM admins WHERE id = $1`, [session.adminId]);

    if (adminResult.rows.length === 0) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const admin = mapAdminRow(adminResult.rows[0]);

    if (!admin.isActive) {
      res.status(401).json({ success: false, message: "This administrator account is disabled." });
      return;
    }

    req.admin = { id: admin.id, email: admin.email };
    next();
  } catch (err) {
    logger.error({ err }, "Error in requireAdminAuth middleware");
    res.status(401).json({ success: false, message: "Authentication required." });
  }
}
