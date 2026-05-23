-- ============================================================
--  NxtWave Gate Pass — Complete Migration
--  Run in: Supabase Dashboard → SQL Editor
-- ============================================================


-- ─────────────────────────────────────────────────────────────
--  FRESH START — Delete all existing user accounts
--
--  Run this block FIRST if you want to wipe all accounts and
--  start completely fresh with no pre-existing credentials.
--  After running, go to /signup to create the first Admin.
--
--    TRUNCATE TABLE app_users CASCADE;
--
--  Or to preserve entries/other data but only remove users:
--
--    DELETE FROM app_users;
--
-- ─────────────────────────────────────────────────────────────
-- Uncomment the line below to delete ALL user accounts:
-- TRUNCATE TABLE app_users CASCADE;


-- ─────────────────────────────────────────────────────────────
--  APP_USERS TABLE  (main auth + approval system)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_users (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                    TEXT        NOT NULL,
  email                   TEXT        UNIQUE NOT NULL,
  password_hash           TEXT,
  -- role can be any non-empty string; 'admin', 'ta', 'facilities' are reserved system roles
  role                    TEXT        NOT NULL CHECK (LENGTH(TRIM(role)) > 0),
  status                  TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','pending_approval','rejected','inactive')),
  approved_by             UUID,
  approved_at             TIMESTAMPTZ,
  rejection_reason        TEXT,
  reset_token             TEXT,
  reset_token_expires_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Safe column additions for existing installs
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS approved_by            UUID;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS approved_at            TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS rejection_reason       TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS reset_token            TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- Remove old invite-token columns
ALTER TABLE app_users DROP COLUMN IF EXISTS invite_token;
ALTER TABLE app_users DROP COLUMN IF EXISTS invite_token_expires_at;
ALTER TABLE app_users DROP COLUMN IF EXISTS created_by;

-- Migrate old roles to new system
UPDATE app_users SET role = 'admin' WHERE role = 'super_admin';

-- Migrate old statuses to new system
UPDATE app_users SET status = 'active'           WHERE status = 'invited'  AND password_hash IS NOT NULL;
UPDATE app_users SET status = 'pending_approval' WHERE status = 'invited'  AND password_hash IS NULL;

-- Drop old enum-style constraint and allow any non-empty role string
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD  CONSTRAINT app_users_role_check
  CHECK (LENGTH(TRIM(role)) > 0);

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_status_check;
ALTER TABLE app_users ADD  CONSTRAINT app_users_status_check
  CHECK (status IN ('active','pending_approval','rejected','inactive'));

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_idx ON app_users (email);


-- ─────────────────────────────────────────────────────────────
--  ENTRIES TABLE
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


-- ─────────────────────────────────────────────────────────────
--  SUPPORTING TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','facilities')),
  name TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
INSERT INTO buildings (name) VALUES ('Brigade Towers'),('iSprout'),('WeWork') ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL, value TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
INSERT INTO settings (key, value) VALUES
  ('organization_name','NxtWave Technologies'),
  ('facilities_email','facilities@nxtwave.com'),
  ('pass_validity_days','7')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS entry_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  action TEXT, guard_note TEXT, performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE entry_logs DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  related_entry_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  performed_by_name TEXT NOT NULL,
  entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  candidate_name TEXT, details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS activity_logs_entry_id_idx ON activity_logs (entry_id);


-- ─────────────────────────────────────────────────────────────
--  DONE — What to do next
-- ─────────────────────────────────────────────────────────────
--  1. Supabase Dashboard → Settings → API → Reload schema
--  2. npm run dev  (or redeploy on Vercel)
--  3. Visit /signup → first user to pick a reserved role (Admin,
--     TA, Facilities) gets it permanently
--  4. Staff / Intern / Other signups appear in Admin → Manage Users
--
--  Roles explained:
--    admin      → Full access + user management (only 1 allowed)
--    ta         → Dashboard + entries + reports (only 1 allowed)
--    facilities → Approvals + entry list (only 1 allowed)
--    staff      → Needs admin approval → simple welcome page
--    intern     → Needs admin approval → simple welcome page
--    other      → Needs admin approval → simple welcome page
-- ─────────────────────────────────────────────────────────────
