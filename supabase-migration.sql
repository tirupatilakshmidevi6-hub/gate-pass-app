-- ============================================================
--  NxtWave Gate Pass — Non-Destructive Migration
--  Run this in Supabase SQL Editor if you already have an
--  existing database and want to ADD new columns / tables
--  WITHOUT dropping existing data.
--
--  STEP 1: Run this SQL
--  STEP 2: Supabase Dashboard → Settings → API → Reload schema
-- ============================================================

-- ── Add new columns to entries table ─────────────────────────────────────────
ALTER TABLE entries ADD COLUMN IF NOT EXISTS role          TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS pass_id       TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS photo_url     TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS pass_sent_email BOOLEAN DEFAULT FALSE;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS otp           TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS otp_verified  BOOLEAN DEFAULT FALSE;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS invite_token  TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS form_status   TEXT DEFAULT 'pending';
ALTER TABLE entries ADD COLUMN IF NOT EXISTS created_by    TEXT DEFAULT 'Admin';

-- Make status default to 'Pending Form' for new rows
ALTER TABLE entries ALTER COLUMN status SET DEFAULT 'Pending Form';

-- Remove old columns no longer used by the app (safe — won't error if missing)
ALTER TABLE entries DROP COLUMN IF EXISTS reporting_time;
ALTER TABLE entries DROP COLUMN IF EXISTS emergency_contact_name;
ALTER TABLE entries DROP COLUMN IF EXISTS emergency_contact_number;
ALTER TABLE entries DROP COLUMN IF EXISTS pass_sent_whatsapp;

-- ── Create users table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        UNIQUE NOT NULL,
  password   TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'facilities')),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ── Create buildings table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buildings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;

INSERT INTO buildings (name) VALUES ('Brigade Towers'), ('iSprout'), ('WeWork')
  ON CONFLICT (name) DO NOTHING;

-- ── Create settings table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        UNIQUE NOT NULL,
  value      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

INSERT INTO settings (key, value) VALUES
  ('organization_name',  'NxtWave Technologies'),
  ('facilities_email',   'facilities@nxtwave.com'),
  ('pass_validity_days', '7')
  ON CONFLICT (key) DO NOTHING;

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Default users (admin@nxtwave.com / Admin@123 and facilities@nxtwave.com /
-- Facilities@123) are created automatically by the app on first login.

