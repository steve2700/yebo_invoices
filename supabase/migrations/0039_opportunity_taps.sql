-- Yebo Invoices: 0039. Run in the Supabase SQL editor AFTER 0038. Counts taps on "Call now" and "WhatsApp now" on the local pages.
create table if not exists public.opportunity_clicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  page text not null,
  kind text not null check (kind in ('call', 'whatsapp'))
);
create index if not exists opportunity_clicks_business_idx on public.opportunity_clicks (business_id, created_at desc);
alter table public.opportunity_clicks enable row level security;
drop policy if exists own_opportunity_clicks on public.opportunity_clicks;
create policy own_opportunity_clicks on public.opportunity_clicks for select using (owns_business(business_id)); -- owners read their own; only the server writes
