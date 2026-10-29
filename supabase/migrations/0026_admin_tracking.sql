-- Admin tracking: error log, sign-in funnel, reminder emails to people who stalled.
-- Safe to run twice. Row level security is on with no policies, so only the server (service role) can read or write these.

create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  source text not null,
  message text not null,
  stack text,
  last_path text,
  count integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved boolean not null default false
);
alter table public.error_log enable row level security;

create table if not exists public.signin_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  step text not null,
  detail text
);
create index if not exists signin_events_created_idx on public.signin_events (created_at desc);
alter table public.signin_events enable row level security;

create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  email text not null,
  kind text not null check (kind in ('onboarding', 'first_quote'))
);
create index if not exists nudges_user_idx on public.nudges (user_id, kind, created_at desc);
alter table public.nudges enable row level security;

create table if not exists public.nudge_optout (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.nudge_optout enable row level security;
