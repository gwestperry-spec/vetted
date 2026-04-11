-- ═══════════════════════════════════════════════════════════════════════════
-- Vetted AI — Supabase Row-Level Security Policies
-- Apply via Supabase Dashboard → SQL Editor or via supabase CLI:
--   supabase db push  (if using migrations)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- All tables use apple_id (text) as the user identity column.
-- There is NO Supabase Auth integration — requests from Netlify Functions use
-- the service role key (VT_DB_KEY / SUPABASE_KEY), which bypasses RLS.
-- RLS is enforced here to protect against direct PostgREST API calls that
-- do NOT use the service role key (e.g., if the anon key is ever leaked).
--
-- Policy model:
--   - anon key:         read-only access to own rows (WHERE apple_id = current_setting('app.apple_id'))
--   - service role key: full access (bypasses RLS by default — no policy needed)
--
-- NOTE: Because the app currently communicates exclusively through Netlify
-- Functions (which use the service role key), these policies are a defence-in-
-- depth measure. They do not affect current production behaviour.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── Create notification_log if it doesn't exist (must precede ALTER/POLICY) ─
CREATE TABLE IF NOT EXISTS notification_log (
  notification_uuid  TEXT        PRIMARY KEY,
  processed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Enable RLS on all user-data tables ───────────────────────────────────
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_frameworks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log    ENABLE ROW LEVEL SECURITY;


-- ─── profiles ─────────────────────────────────────────────────────────────
-- Users may only read their own profile row.
-- Writes (PATCH / POST) come from Netlify Functions (service role) only.

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles
  FOR SELECT
  USING (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  USING (apple_id = current_setting('app.apple_id', true))
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

-- Prevent anon deletion of profiles entirely.
DROP POLICY IF EXISTS "profiles_no_delete" ON profiles;
CREATE POLICY "profiles_no_delete"
  ON profiles
  FOR DELETE
  USING (false);


-- ─── opportunities ────────────────────────────────────────────────────────
-- Users may read, create, update, and delete their own scored opportunities.
-- The owner column is apple_id (text).

DROP POLICY IF EXISTS "opportunities_select_own" ON opportunities;
CREATE POLICY "opportunities_select_own"
  ON opportunities
  FOR SELECT
  USING (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "opportunities_insert_own" ON opportunities;
CREATE POLICY "opportunities_insert_own"
  ON opportunities
  FOR INSERT
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "opportunities_update_own" ON opportunities;
CREATE POLICY "opportunities_update_own"
  ON opportunities
  FOR UPDATE
  USING (apple_id = current_setting('app.apple_id', true))
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "opportunities_delete_own" ON opportunities;
CREATE POLICY "opportunities_delete_own"
  ON opportunities
  FOR DELETE
  USING (apple_id = current_setting('app.apple_id', true));


-- ─── filter_frameworks ───────────────────────────────────────────────────
-- Each user has one filter framework row (their personalised VQ filters).
-- Owner column: apple_id.

DROP POLICY IF EXISTS "filter_frameworks_select_own" ON filter_frameworks;
CREATE POLICY "filter_frameworks_select_own"
  ON filter_frameworks
  FOR SELECT
  USING (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "filter_frameworks_insert_own" ON filter_frameworks;
CREATE POLICY "filter_frameworks_insert_own"
  ON filter_frameworks
  FOR INSERT
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "filter_frameworks_update_own" ON filter_frameworks;
CREATE POLICY "filter_frameworks_update_own"
  ON filter_frameworks
  FOR UPDATE
  USING (apple_id = current_setting('app.apple_id', true))
  WITH CHECK (apple_id = current_setting('app.apple_id', true));

DROP POLICY IF EXISTS "filter_frameworks_delete_own" ON filter_frameworks;
CREATE POLICY "filter_frameworks_delete_own"
  ON filter_frameworks
  FOR DELETE
  USING (apple_id = current_setting('app.apple_id', true));


-- ─── notification_log ─────────────────────────────────────────────────────
-- Internal idempotency table — written only by apple-server-notifications.js
-- (service role key). Anon key gets no access at all.

DROP POLICY IF EXISTS "notification_log_no_anon_access" ON notification_log;
CREATE POLICY "notification_log_no_anon_access"
  ON notification_log
  FOR ALL
  USING (false);


-- notification_log table and RLS are defined at the top of this file.
