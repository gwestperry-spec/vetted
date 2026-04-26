-- ═══════════════════════════════════════════════════════════════════════════
-- Vetted AI — Role Workspace Schema
-- Apply via Supabase Dashboard → SQL Editor
--
-- Identity model: apple_id text — matches all existing tables.
-- Service role key (VT_DB_KEY) bypasses RLS; policies protect against anon key.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── workspace_roles ──────────────────────────────────────────────────────
-- One row per role the user has touched. Persists across sessions.
-- role_id is a client-generated stable string (timestamp or UUID string)
-- so the same role can be upserted idempotently from any client state.

CREATE TABLE IF NOT EXISTS workspace_roles (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_id          text         NOT NULL,
  role_id           text         NOT NULL,           -- client-generated stable ID
  company           text,
  title             text,
  source_url        text,
  status            text         NOT NULL DEFAULT 'queued'
                                 CHECK (status IN ('queued','scored','pursue','monitor','pass','applied','archived')),
  vq_score          numeric(3,2),
  framework_snapshot jsonb,                          -- full VQ result: filter_scores, strengths, gaps, etc.
  last_viewed_at    timestamptz,
  next_action       text,
  next_action_at    timestamptz,
  notes             text,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now(),

  -- Enforce one row per (user, role_id) — upsert target
  CONSTRAINT workspace_roles_user_role_unique UNIQUE (apple_id, role_id)
);

CREATE INDEX IF NOT EXISTS workspace_roles_apple_id_idx   ON workspace_roles (apple_id);
CREATE INDEX IF NOT EXISTS workspace_roles_status_idx     ON workspace_roles (apple_id, status);
CREATE INDEX IF NOT EXISTS workspace_roles_action_at_idx  ON workspace_roles (apple_id, next_action_at);


-- ─── workspace_reminders ──────────────────────────────────────────────────
-- Reminders tied to a workspace role. Signal+ tier only.

CREATE TABLE IF NOT EXISTS workspace_reminders (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_id            text         NOT NULL,
  workspace_role_id   uuid         REFERENCES workspace_roles(id) ON DELETE CASCADE,
  remind_at           timestamptz  NOT NULL,
  label               text,
  completed           boolean      NOT NULL DEFAULT false,
  created_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_reminders_apple_id_idx ON workspace_reminders (apple_id);
CREATE INDEX IF NOT EXISTS workspace_reminders_remind_at_idx ON workspace_reminders (apple_id, remind_at);


-- ─── updated_at trigger ───────────────────────────────────────────────────
-- Keeps updated_at current on every PATCH.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspace_roles_updated_at ON workspace_roles;
CREATE TRIGGER workspace_roles_updated_at
  BEFORE UPDATE ON workspace_roles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();


-- ─── RLS — workspace_roles ────────────────────────────────────────────────
ALTER TABLE workspace_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_roles_select_own" ON workspace_roles;
CREATE POLICY "workspace_roles_select_own"
  ON workspace_roles FOR SELECT
  USING (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "workspace_roles_insert_own" ON workspace_roles;
CREATE POLICY "workspace_roles_insert_own"
  ON workspace_roles FOR INSERT
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "workspace_roles_update_own" ON workspace_roles;
CREATE POLICY "workspace_roles_update_own"
  ON workspace_roles FOR UPDATE
  USING (apple_id = current_setting('app.apple_id', true))
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "workspace_roles_delete_own" ON workspace_roles;
CREATE POLICY "workspace_roles_delete_own"
  ON workspace_roles FOR DELETE
  USING (false);   -- archive-only; hard delete not allowed via anon key


-- ─── RLS — workspace_reminders ────────────────────────────────────────────
ALTER TABLE workspace_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_reminders_select_own" ON workspace_reminders;
CREATE POLICY "workspace_reminders_select_own"
  ON workspace_reminders FOR SELECT
  USING (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "workspace_reminders_insert_own" ON workspace_reminders;
CREATE POLICY "workspace_reminders_insert_own"
  ON workspace_reminders FOR INSERT
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "workspace_reminders_update_own" ON workspace_reminders;
CREATE POLICY "workspace_reminders_update_own"
  ON workspace_reminders FOR UPDATE
  USING (apple_id = current_setting('app.apple_id', true))
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "workspace_reminders_delete_own" ON workspace_reminders;
CREATE POLICY "workspace_reminders_delete_own"
  ON workspace_reminders FOR DELETE
  USING (apple_id = current_setting('app.apple_id', true));
