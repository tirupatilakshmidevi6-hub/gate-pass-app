-- ============================================================
--  NxtWave Gate Pass — Complete Non-Destructive Migration
--  Run this in Supabase Dashboard → SQL Editor
-- ============================================================


-- ─────────────────────────────────────────────────────────────
--  1. APP_USERS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_users (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                    TEXT        NOT NULL,
  email                   TEXT        UNIQUE NOT NULL,
  password_hash           TEXT,
  role                    TEXT        NOT NULL CHECK (role IN ('super_admin', 'admin', 'facilities')),
  status                  TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive')),
  invite_token            TEXT,
  invite_token_expires_at TIMESTAMPTZ,
  reset_token             TEXT,
  reset_token_expires_at  TIMESTAMPTZ,
  created_by              UUID,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Add reset token columns if not present (for existing installs)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS reset_token             TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS reset_token_expires_at  TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_idx ON app_users (email);


-- ─────────────────────────────────────────────────────────────
--  2. ENTRIES TABLE
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
--  3. USERS TABLE  (legacy)
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
--  4. BUILDINGS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buildings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;

INSERT INTO buildings (name) VALUES ('Brigade Towers'), ('iSprout'), ('WeWork')
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
--  5. SETTINGS TABLE
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
--  6. ENTRY LOGS TABLE  (audit trail)
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
--  7. NOTIFICATIONS TABLE  ← NEW
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  title            TEXT        NOT NULL,
  message          TEXT        NOT NULL,
  type             TEXT        NOT NULL DEFAULT 'info'
                     CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read          BOOLEAN     NOT NULL DEFAULT FALSE,
  related_entry_id UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS notifications_user_id_idx  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx   ON notifications (user_id, is_read) WHERE is_read = FALSE;


-- ─────────────────────────────────────────────────────────────
--  8. ACTIVITY_LOGS TABLE  ← NEW
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  action            TEXT        NOT NULL,
  performed_by      UUID        REFERENCES app_users(id) ON DELETE SET NULL,
  performed_by_name TEXT        NOT NULL,
  entry_id          UUID        REFERENCES entries(id) ON DELETE SET NULL,
  candidate_name    TEXT,
  details           JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS activity_logs_entry_id_idx     ON activity_logs (entry_id);
CREATE INDEX IF NOT EXISTS activity_logs_performed_by_idx ON activity_logs (performed_by);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx   ON activity_logs (created_at DESC);


-- ─────────────────────────────────────────────────────────────
--  DONE — Next Steps
-- ─────────────────────────────────────────────────────────────
--  1. Supabase Dashboard → Settings → API → Reload schema
--  2. npm run dev  (or redeploy on Vercel)
--  3. Visit /signup to create the first Super Admin account
--
--  New environment variables to add in Vercel:
--    CRON_SECRET = any-long-random-string  (protects /api/cron/update-expired-passes)
-- ─────────────────────────────────────────────────────────────
