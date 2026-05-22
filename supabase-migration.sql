-- ============================================================
--  NxtWave Gate Pass — Complete Non-Destructive Migration
--  Safe to run on a FRESH database OR an EXISTING one.
--
--  HOW TO RUN:
--  1. Open Supabase Dashboard → SQL Editor
--  2. Paste this entire file and click Run
--  3. Go to Settings → API → click "Reload schema"
--  4. Restart your app (npm run dev or Vercel redeploy)
--  5. Go to /signup in your browser to create the first account
-- ============================================================


-- ─────────────────────────────────────────────────────────────
--  TABLE: app_users
--  Primary user management table.
--  Supports open signup (/signup), invite flow, and deactivation.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_users (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                    TEXT        NOT NULL,
  email                   TEXT        UNIQUE NOT NULL,
  password_hash           TEXT        NOT NULL,
  role                    TEXT        NOT NULL
                            CHECK (role IN ('super_admin', 'admin', 'facilities')),
  status                  TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'invited', 'inactive')),
  invite_token            TEXT,
  invite_token_expires_at TIMESTAMPTZ,
  created_by              UUID,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security so the service role key can read/write freely
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Make password_hash nullable for invited users (they set it when accepting invite)
ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL;

-- Add indexes for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_idx  ON app_users (email);
CREATE INDEX        IF NOT EXISTS app_users_role_idx   ON app_users (role);
CREATE INDEX        IF NOT EXISTS app_users_token_idx  ON app_users (invite_token)
  WHERE invite_token IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
--  TABLE: entries
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
  valid_until     TEXT,
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

ALTER TABLE entries DISABLE ROW LEVEL SECURITY;

ALTER TABLE entries ADD COLUMN IF NOT EXISTS email           TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS mobile_number   TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS role            TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS employee_id     TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS valid_until     TEXT;
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

ALTER TABLE entries ALTER COLUMN status SET DEFAULT 'Pending Form';

ALTER TABLE entries DROP COLUMN IF EXISTS reporting_time;
ALTER TABLE entries DROP COLUMN IF EXISTS emergency_contact_name;
ALTER TABLE entries DROP COLUMN IF EXISTS emergency_contact_number;
ALTER TABLE entries DROP COLUMN IF EXISTS pass_sent_whatsapp;


-- ─────────────────────────────────────────────────────────────
--  TABLE: users  (legacy — kept for backward compatibility)
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
--  TABLE: buildings
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buildings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;

INSERT INTO buildings (name) VALUES
  ('Brigade Towers'), ('iSprout'), ('WeWork')
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
--  TABLE: settings
-- ─────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────
--  TABLE: entry_logs  (audit trail)
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
--  DONE — What to do next
-- ─────────────────────────────────────────────────────────────
--  1. Supabase Dashboard → Settings → API → Reload schema
--  2. Restart your app:  npm run dev
--  3. Open http://localhost:3000/signup
--  4. Fill in your details — the first person automatically
--     gets the Super Admin role.
--  5. Log in at http://localhost:3000/login
--  6. From the app go to Manage Users to invite more people.
--
--  Environment variables required in .env.local (and Vercel):
--    NEXT_PUBLIC_SUPABASE_URL       = https://xxxx.supabase.co
--    NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...
--    SUPABASE_SERVICE_ROLE_KEY      = eyJ...
--    JWT_SECRET                     = any-long-random-string
-- ─────────────────────────────────────────────────────────────
