-- Anonymous survey answers. Row level security is on and there are no policies, so only the server
-- (service role) can write, and only you can read them in the Supabase dashboard.
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text,
  answers jsonb not null
);
alter table public.survey_responses enable row level security;
