-- Add push_sent_at to workspace_reminders so the hourly scheduled function
-- never fires the same push twice (deduplication guard).
alter table workspace_reminders
  add column if not exists push_sent_at timestamptz default null;
