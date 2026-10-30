-- "Request a quote" link: each business gets a private link its clients can use to describe a job.
-- Safe to run twice.

alter table public.businesses
  add column if not exists request_token text unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 14);
update public.businesses set request_token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 14) where request_token is null;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  whatsapp text,
  email text,
  location text,
  details text not null,
  status text not null default 'new' check (status in ('new', 'quoted', 'dismissed')),
  client_id uuid references public.clients(id) on delete set null
);
create index if not exists quote_requests_business_idx on public.quote_requests (business_id, created_at desc);
alter table public.quote_requests enable row level security;

drop policy if exists own_requests on public.quote_requests;
create policy own_requests on public.quote_requests for all using (owns_business(business_id)) with check (owns_business(business_id));

-- Every time an error happens, so the admin Errors page can show how many in the last 24 hours.
create table if not exists public.error_hits (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  created_at timestamptz not null default now()
);
create index if not exists error_hits_created_idx on public.error_hits (created_at desc);
alter table public.error_hits enable row level security;
