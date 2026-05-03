-- ── user_notification_log ────────────────────────────────────────────────
-- Prevents duplicate push sends for scheduled notification types.
-- Each row = one push sent. Query before sending to check recency.

create table if not exists user_notification_log (
  id         bigserial primary key,
  apple_id   text        not null,
  type       text        not null,  -- 'staleness' | 'follow_up' | 'advocate'
  context    text,                  -- role_id or other disambiguator
  sent_at    timestamptz not null default now()
);

create index if not exists notif_log_lookup_idx
  on user_notification_log (apple_id, type, context, sent_at desc);

-- RLS: service role only
alter table user_notification_log enable row level security;

-- ── Helper: users who haven't scored in N days ────────────────────────────
create or replace function users_not_scored_since(days_ago int)
returns table(apple_id text, last_scored timestamptz) as $$
  select apple_id, max(created_at) as last_scored
  from workspace_roles
  where status != 'queued'
  group by apple_id
  having max(created_at) < now() - (days_ago || ' days')::interval
$$ language sql stable;
