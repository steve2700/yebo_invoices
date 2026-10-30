-- Where visitors come from. One row per visit (a visit is one browser tab session). Safe to run twice.
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  source text not null,
  path text
);
create index if not exists visits_created_idx on public.visits (created_at desc);
alter table public.visits enable row level security;
