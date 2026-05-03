-- ── user_devices ─────────────────────────────────────────────────────────
-- Stores APNs device tokens for push notifications.
-- One row per (user, device token). Tokens refresh on app reinstall.

create table if not exists user_devices (
  id          bigserial primary key,
  apple_id    text        not null,
  token       text        not null,
  platform    text        not null default 'ios',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (apple_id, token)
);

-- Index for fast lookup by user when sending notifications
create index if not exists user_devices_apple_id_idx on user_devices (apple_id);

-- Index for cleanup queries (find stale tokens)
create index if not exists user_devices_updated_at_idx on user_devices (updated_at);

-- RLS: service role only (push sends are server-side, never client-direct)
alter table user_devices enable row level security;
