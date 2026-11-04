-- Yebo Invoices: 0038. Run in the Supabase SQL editor. Yebo Opportunities v0.
-- A business can opt in to receive local job requests that come from the public pages on yeboinvoices.com/jobs.
alter table public.businesses
  add column if not exists opp_enabled boolean not null default false,
  add column if not exists opp_trades text[] not null default '{}',
  add column if not exists opp_areas text[] not null default '{}',
  add column if not exists opp_last_at timestamptz;

-- One row per job sent out from a public page. No personal details here, only counts, so we can measure the test.
create table if not exists public.opportunity_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page text not null,
  trade text not null,
  area text not null,
  matched int not null default 0
);
alter table public.opportunity_jobs enable row level security; -- no policies: only the server (service role) can read or write

-- Optional: opt Granite Carpentry in straight away (change the name if yours differs), instead of using /app/opportunities.
-- update public.businesses set opp_enabled = true, opp_trades = '{carpenter}',
--   opp_areas = '{johannesburg,midrand,kempton-park,edenvale,sandton,randburg,pretoria}'
-- where name ilike 'granite carpentry%';
