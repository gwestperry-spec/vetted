-- Add lang column to user_devices so scheduled notification functions
-- can send push copy in each user's preferred language.
-- Defaults to 'en' for existing rows.

alter table user_devices
  add column if not exists lang text not null default 'en';
