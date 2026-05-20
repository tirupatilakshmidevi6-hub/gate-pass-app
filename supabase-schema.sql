-- ============================================================
--  NxtWave Gate Pass System — Complete Supabase Schema v2
--  Run this entire script in the Supabase SQL Editor.
--  WARNING: DROP TABLE statements will delete existing data.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Drop existing tables ──────────────────────────────────────────────────────
DROP TABLE IF EXISTS entry_logs  CASCADE;
DROP TABLE IF EXISTS entries     CASCADE;
DROP TABLE IF EXISTS users       CASCADE;
DROP TABLE IF EXISTS buildings   CASCADE;
DROP TABLE IF EXISTS settings    CASCADE;

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        UNIQUE NOT NULL,
  password   TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'facilities')),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ── entries ───────────────────────────────────────────────────────────────────
-- Status flow: Pending Form → Pending Approval → Approved | Rejected
CREATE TABLE entries (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT        NOT NULL,
  email           TEXT,
  mobile_number   TEXT,
  role            TEXT,                         -- New Joiner, Intern, Contractor, etc.
  purpose         TEXT        NOT NULL,
  reporting_date  TEXT        NOT NULL,
  poc_name        TEXT        NOT NULL,
  contact_no      TEXT,
  building_name   TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'Pending Form',
  otp             TEXT,
  otp_verified    BOOLEAN     DEFAULT FALSE,
  invite_token    TEXT        UNIQUE,
  form_status     TEXT        DEFAULT 'pending',
  pass_id         TEXT,
  photo_url       TEXT,
  pass_sent_email BOOLEAN     DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      TEXT        NOT NULL DEFAULT 'Admin'
);
ALTER TABLE entries DISABLE ROW LEVEL SECURITY;

-- ── entry_logs ────────────────────────────────────────────────────────────────
CREATE TABLE entry_logs (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id     UUID        REFERENCES entries(id) ON DELETE CASCADE,
  action       TEXT        NOT NULL,
  performed_by TEXT,
  guard_note   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE entry_logs DISABLE ROW LEVEL SECURITY;

-- ── buildings ────────────────────────────────────────────────────────────────
CREATE TABLE buildings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
INSERT INTO buildings (name) VALUES ('Brigade Towers'), ('iSprout'), ('WeWork');

-- ── settings ─────────────────────────────────────────────────────────────────
CREATE TABLE settings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        UNIQUE NOT NULL,
  value      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
INSERT INTO settings (key, value) VALUES
  ('organization_name',  'NxtWave Technologies'),
  ('facilities_email',   'facilities@nxtwave.com'),
  ('pass_validity_days', '7');

-- ── Default users note ────────────────────────────────────────────────────────
-- Admin:      admin@nxtwave.com      / Admin@123
-- Facilities: facilities@nxtwave.com / Facilities@123
-- Created automatically by the app on first login.
