-- ─── Application status tracking ─────────────────────────────────────────
-- Adds funnel-stage tracking to the opportunities table.
-- Stages: applied → phone_screen → interview → final_round
--         → offer | rejected | withdrew
--
-- applied_at already exists (added in behavioral-intelligence-schema.sql).
-- Run this after that file.

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'applied';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS status_updated_at  TIMESTAMPTZ;
