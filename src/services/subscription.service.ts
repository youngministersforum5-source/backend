import { query } from "../config/database";
import { mapSubscriberRow } from "../utils/mappers";
import { logger } from "../utils/logger";

export type CreateSubscriptionResult = "created" | "already_subscribed";

export async function createSubscription(email: string): Promise<CreateSubscriptionResult> {
  const existing = await query(`SELECT id FROM subscribers WHERE email = $1`, [email]);

  if (existing.rows.length > 0) {
    logger.info({ email }, "Duplicate subscription attempt");
    return "already_subscribed";
  }

  await query(`INSERT INTO subscribers (email) VALUES ($1)`, [email]);
  logger.info({ email }, "New subscriber added");

  return "created";
}

export interface ListSubscribersParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy: "subscribedAt" | "email";
  sortOrder: "asc" | "desc";
  from?: string;
  to?: string;
}

const SORT_COLUMN_MAP: Record<ListSubscribersParams["sortBy"], string> = {
  subscribedAt: "subscribed_at",
  email: "email",
};

export async function listSubscribers(params: ListSubscribersParams) {
  const { page, limit, search, isActive, sortBy, sortOrder, from, to } = params;

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (isActive !== undefined) {
    values.push(isActive);
    conditions.push(`is_active = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`email ILIKE $${values.length}`);
  }

  if (from) {
    values.push(from);
    conditions.push(`subscribed_at >= $${values.length}`);
  }

  if (to) {
    values.push(to);
    conditions.push(`subscribed_at <= $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderColumn = SORT_COLUMN_MAP[sortBy];
  const orderDirection = sortOrder === "asc" ? "ASC" : "DESC";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM subscribers ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const limitIdx = values.length + 1;
  const offsetIdx = values.length + 2;
  const dataValues = [...values, limit, (page - 1) * limit];

  const dataResult = await query(
    `SELECT * FROM subscribers ${whereClause}
     ORDER BY ${orderColumn} ${orderDirection}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataValues
  );

  return {
    data: dataResult.rows.map(mapSubscriberRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getSubscriberById(id: string) {
  const { rows } = await query(`SELECT * FROM subscribers WHERE id = $1`, [id]);
  return rows.length > 0 ? mapSubscriberRow(rows[0]) : null;
}

export async function updateSubscriber(id: string, isActive: boolean) {
  const { rows } = await query(
    `UPDATE subscribers SET is_active = $1 WHERE id = $2 RETURNING *`,
    [isActive, id]
  );
  return rows.length > 0 ? mapSubscriberRow(rows[0]) : null;
}

export async function getAllSubscribersForExport() {
  const { rows } = await query(`SELECT * FROM subscribers ORDER BY subscribed_at DESC`);
  return rows.map(mapSubscriberRow);
}
