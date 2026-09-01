import { query } from "../config/database";
import { CreateRegistrationInput } from "../schemas/registration.schema";
import { MemberStatus } from "../types/models";
import { mapMemberRow } from "../utils/mappers";
import { sendRegistrationConfirmation } from "./email.service";
import { logger } from "../utils/logger";

export type CreateRegistrationResult =
  | { status: "created"; memberId: string }
  | { status: "duplicate" };

export async function createRegistration(
  input: CreateRegistrationInput
): Promise<CreateRegistrationResult> {
  const existing = await query(`SELECT id FROM members WHERE email = $1`, [input.email]);

  if (existing.rows.length > 0) {
    // Do not reveal registration details for an existing email — return a
    // generic "duplicate" outcome the controller turns into a safe response.
    logger.info({ email: input.email }, "Duplicate registration attempt");
    return { status: "duplicate" };
  }

  const { rows } = await query(
    `INSERT INTO members
       (full_name, whatsapp, email, location, gender, sound_doctrine, active_fellowship, intent, gifts, gift_other)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, full_name, email`,
    [
      input.fullName,
      input.whatsapp,
      input.email,
      input.location,
      input.gender,
      input.soundDoctrine,
      input.activeFellowship,
      input.intent,
      JSON.stringify(input.gifts),
      input.giftOther || null,
    ]
  );

  const member = rows[0];

  logger.info({ memberId: member.id }, "New membership registration created");

  // Confirmation email is best-effort: failure must not roll back the
  // registration, which has already been durably saved above.
  try {
    await sendRegistrationConfirmation(member.email, member.full_name);
  } catch (err) {
    logger.error({ err, memberId: member.id }, "Failed to send registration confirmation email");
  }

  return { status: "created", memberId: member.id };
}

export interface ListMembersParams {
  page: number;
  limit: number;
  search?: string;
  status?: MemberStatus;
  sortBy: "createdAt" | "fullName" | "status";
  sortOrder: "asc" | "desc";
}

const SORT_COLUMN_MAP: Record<ListMembersParams["sortBy"], string> = {
  createdAt: "created_at",
  fullName: "full_name",
  status: "status",
};

export async function listMembers(params: ListMembersParams) {
  const { page, limit, search, status, sortBy, sortOrder } = params;

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    const idx = values.length;
    conditions.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx} OR location ILIKE $${idx})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderColumn = SORT_COLUMN_MAP[sortBy];
  const orderDirection = sortOrder === "asc" ? "ASC" : "DESC";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM members ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const limitIdx = values.length + 1;
  const offsetIdx = values.length + 2;
  const dataValues = [...values, limit, (page - 1) * limit];

  const dataResult = await query(
    `SELECT * FROM members ${whereClause}
     ORDER BY ${orderColumn} ${orderDirection}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataValues
  );

  return {
    data: dataResult.rows.map(mapMemberRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getMemberById(id: string) {
  const { rows } = await query(`SELECT * FROM members WHERE id = $1`, [id]);
  return rows.length > 0 ? mapMemberRow(rows[0]) : null;
}

export async function updateMemberStatus(id: string, status: MemberStatus) {
  const { rows } = await query(
    `UPDATE members SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows.length > 0 ? mapMemberRow(rows[0]) : null;
}

export async function getAllMembersForExport() {
  const { rows } = await query(`SELECT * FROM members ORDER BY created_at DESC`);
  return rows.map(mapMemberRow);
}
