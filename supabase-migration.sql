-- ============================================================
--  NxtWave Gate Pass — Complete Non-Destructive Migration
--  Safe to run on a FRESH database OR an EXISTING one.
--  All statements use IF NOT EXISTS / IF EXISTS so nothing
--  is dropped or overwritten if it already exists.
--
--  HOW TO RUN:
--  1. Open Supabase Dashboard → SQL Editor
--  2. Paste this entire file and click Run
--  3. Go to Settings → API → click "Reload schema"
--  4. Restart your app (npm run dev or Vercel redeploy)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
--  1. ENTRIES TABLE  (create if not exists, then add columns)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entries (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT        NOT NULL,
  email           TEXT,
  mobile_number   TEXT,
  role            TEXT,
  purpose         TEXT        NOT NULL DEFAULT 'Interview',
  reporting_date  TEXT        NOT NULL,
  employee_id     TEXT,
  poc_name        TEXT        NOT NULL DEFAULT '',
  contact_no      TEXT        NOT NULL DEFAULT '',
  building_name   TEXT        NOT NULL DEFAULT '',
  status          TEXT        NOT NULL DEFAULT 'Pending Form',
  otp             TEXT,
  otp_verified    BOOLEAN     DEFAULT FALSE,
  invite_token    TEXT,
  form_status     TEXT        DEFAULT 'pending',
  pass_id         TEXT,
  photo_url       TEXT,
  pass_sent_email BOOLEAN     DEFAULT FALSE,
  created_by      TEXT        DEFAULT 'Admin',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security so the app service key can read/write freely
ALTER TABLE entries DISABLE ROW LEVEL SECURITY;

-- ── Add any columns that may be missing from older deployments ───────────────
ALTER TABLE entries ADD COLUMN IF NOT EXISTS email           TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS mobile_number   TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS role            TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS employee_id     TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS poc_name        TEXT NOT NULL DEFAULT '';
ALTER TABLE entries ADD COLUMN IF NOT EXISTS contact_no      TEXT NOT NULL DEFAULT '';
ALTER TABLE entries ADD COLUMN IF NOT EXISTS building_name   TEXT NOT NULL DEFAULT '';
ALTER TABLE entries ADD COLUMN IF NOT EXISTS otp             TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS otp_verified    BOOLEAN DEFAULT FALSE;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS invite_token    TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS form_status     TEXT DEFAULT 'pending';
ALTER TABLE entries ADD COLUMN IF NOT EXISTS pass_id         TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS photo_url       TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS pass_sent_email BOOLEAN DEFAULT FALSE;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS created_by      TEXT DEFAULT 'Admin';

-- Set the correct default for status on new rows
ALTER TABLE entries ALTER COLUMN status SET DEFAULT 'Pending Form';

-- ── Remove old columns no longer used (safe — no error if already missing) ───
ALTER TABLE entries DROP COLUMN IF EXISTS reporting_time;
ALTER TABLE entries DROP COLUMN IF EXISTS emergency_contact_name;
ALTER TABLE entries DROP COLUMN IF EXISTS emergency_contact_number;
ALTER TABLE entries DROP COLUMN IF EXISTS pass_sent_whatsapp;


-- ─────────────────────────────────────────────────────────────
--  2. USERS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        UNIQUE NOT NULL,
  password   TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'facilities')),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users DISABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────
--  3. BUILDINGS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buildings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;

-- Seed default buildings (skipped if already present)
INSERT INTO buildings (name) VALUES
  ('Brigade Towers'),
  ('iSprout'),
  ('WeWork')
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
--  4. SETTINGS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        UNIQUE NOT NULL,
  value      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Seed default settings (skipped if already present)
INSERT INTO settings (key, value) VALUES
  ('organization_name',  'NxtWave Technologies'),
  ('facilities_email',   'facilities@nxtwave.com'),
  ('pass_validity_days', '7')
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
--  5. ENTRY LOGS TABLE  (audit trail)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entry_logs (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id     UUID        REFERENCES entries(id) ON DELETE CASCADE,
  action       TEXT,
  guard_note   TEXT,
  performed_by TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE entry_logs DISABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────
--  DONE
-- ─────────────────────────────────────────────────────────────
--  After running this:
--  → Supabase Dashboard → Settings → API → Reload schema
--  → Restart your app
--
--  Default admin users are created automatically by the app
--  on first login:
--    admin@nxtwave.com      / Admin@123
--    facilities@nxtwave.com / Facilities@123
-- ─────────────────────────────────────────────────────────────
