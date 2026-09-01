-- =============================================================================
-- YMF BACKEND — MIGRATION 0001: INITIAL SCHEMA
-- =============================================================================

-- gen_random_uuid() requires pgcrypto. Safe/idempotent to run repeatedly.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- ADMINS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (email);

-- -----------------------------------------------------------------------------
-- ADMIN OTPS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_otps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  otp_hash   TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_otps_admin_id ON admin_otps (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_otps_expires_at ON admin_otps (expires_at);
-- Speeds up "find latest OTP for admin" lookups.
CREATE INDEX IF NOT EXISTS idx_admin_otps_admin_id_created_at ON admin_otps (admin_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- ADMIN SESSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions (token_hash);

-- -----------------------------------------------------------------------------
-- SUBSCRIBERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);
CREATE INDEX IF NOT EXISTS idx_subscribers_subscribed_at ON subscribers (subscribed_at);

-- -----------------------------------------------------------------------------
-- MEMBERS (membership registrations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name          TEXT NOT NULL,
  whatsapp           TEXT NOT NULL,
  email              TEXT NOT NULL UNIQUE,
  location           TEXT NOT NULL,
  gender             TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  sound_doctrine     BOOLEAN NOT NULL,
  active_fellowship  BOOLEAN NOT NULL,
  intent             TEXT NOT NULL,
  gifts              JSONB NOT NULL,
  gift_other         TEXT,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_status ON members (status);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members (created_at);

-- Keep members.updated_at current on every UPDATE, mirroring the previous
-- ORM's @updatedAt behavior.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_admins_updated_at ON admins;
CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
