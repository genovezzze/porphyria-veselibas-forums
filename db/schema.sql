-- Next Step — optional Neon PostgreSQL schema (demo only).
--
-- This schema is intentionally NOT wired into the running app yet: without real
-- authentication we do NOT store medical profiles in a shared database. The app
-- runs in browser-local demo mode until a real auth + owner model is added.
-- This file documents the intended demo persistence shape and ownership checks.
--
-- Apply with: psql "$DATABASE_URL" -f db/schema.sql

create table if not exists demo_profile (
  id            uuid primary key default gen_random_uuid(),
  -- Owner key (e.g. a session/anon id). Every query MUST filter by owner_key.
  owner_key     text not null,
  display_name  text not null default 'Demo user',
  demo_city     text not null default 'Riga',
  created_at    timestamptz not null default now()
);

create table if not exists demo_preferences (
  owner_key   text primary key references demo_profile(owner_key) on delete cascade,
  time_of_day text not null default 'any'
                check (time_of_day in ('morning','afternoon','after-work','any')),
  weekday     text
                check (weekday in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  concern     text,
  updated_at  timestamptz not null default now()
);

create table if not exists demo_plan_item (
  id         uuid primary key default gen_random_uuid(),
  owner_key  text not null references demo_profile(owner_key) on delete cascade,
  slot_id    text not null,          -- references a demo fixture slot id
  booked     boolean not null default false, -- only true after explicit user confirm
  saved_at   timestamptz not null default now(),
  unique (owner_key, slot_id)
);

create index if not exists idx_plan_owner on demo_plan_item(owner_key);

-- NOTE: Demo slots, centers and prices live in application fixtures, not the DB,
-- because they are fictional sample data generated per demo week.
-- Audio is never stored. Full conversation transcripts are not persisted here.
