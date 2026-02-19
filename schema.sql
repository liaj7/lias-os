-- ============================================================
-- Lia's OS — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. ENTRIES TABLE
-- Each row = one item (dump, task, event, content piece, reference, learning, expense, sticky note)
-- The "payload" column stores all type-specific fields as JSON.
-- This keeps the schema stable — you can add new fields in the app without changing the DB.

CREATE TABLE entries (
  id          text        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL,
  -- types: 'dump','task','event','content_pipeline','reference','learning',
  --        'fixed_expense','expense','sticky_note'
  payload     jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_user_type    ON entries(user_id, type);
CREATE INDEX idx_entries_user_updated ON entries(user_id, updated_at DESC);

-- 2. USER SETTINGS TABLE
-- One row per user. Stores settings + goals (user-level blobs, not individual items).

CREATE TABLE user_settings (
  user_id     uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings    jsonb       NOT NULL DEFAULT '{}',
  goals       jsonb       NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. ROW LEVEL SECURITY
-- Every user can only read/write their own rows.

ALTER TABLE entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own entries"
  ON entries FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own settings"
  ON user_settings FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. AUTO-UPDATE updated_at ON CHANGE

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
