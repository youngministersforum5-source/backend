import { Admin, AdminOTP, AdminSession, Member, Subscriber } from "../types/models";

/**
 * Raw `pg` results use the column names exactly as returned by Postgres
 * (snake_case, per our schema). These helpers translate each row into the
 * camelCase domain shape used throughout the application and API responses.
 */

export function mapAdminRow(row: any): Admin {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAdminOtpRow(row: any): AdminOTP {
  return {
    id: row.id,
    adminId: row.admin_id,
    otpHash: row.otp_hash,
    expiresAt: row.expires_at,
    attempts: row.attempts,
    used: row.used,
    createdAt: row.created_at,
  };
}

export function mapAdminSessionRow(row: any): AdminSession {
  return {
    id: row.id,
    adminId: row.admin_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export function mapSubscriberRow(row: any): Subscriber {
  return {
    id: row.id,
    email: row.email,
    isActive: row.is_active,
    subscribedAt: row.subscribed_at,
  };
}

export function mapMemberRow(row: any): Member {
  return {
    id: row.id,
    fullName: row.full_name,
    whatsapp: row.whatsapp,
    email: row.email,
    location: row.location,
    gender: row.gender,
    soundDoctrine: row.sound_doctrine,
    activeFellowship: row.active_fellowship,
    intent: row.intent,
    // pg parses JSONB columns into JS objects automatically.
    gifts: row.gifts,
    giftOther: row.gift_other,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
