-- Behavioral insights table
CREATE TABLE IF NOT EXISTS behavioral_insights (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_id        TEXT        NOT NULL,
  pattern_type    TEXT        NOT NULL,
  insight_text    TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at    TIMESTAMPTZ,
  acted_on_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS behavioral_insights_apple_id_idx ON behavioral_insights(apple_id, created_at DESC);
ALTER TABLE behavioral_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_own" ON behavioral_insights FOR ALL USING (apple_id = current_setting('app.apple_id', true));

-- Weekly summaries table
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_id        TEXT        NOT NULL,
  week_start      DATE        NOT NULL,
  summary_text    TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS weekly_summaries_user_week ON weekly_summaries(apple_id, week_start);
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_own" ON weekly_summaries FOR ALL USING (apple_id = current_setting('app.apple_id', true));

-- Application tracking column
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;
