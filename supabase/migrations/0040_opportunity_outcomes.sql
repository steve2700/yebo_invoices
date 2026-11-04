-- Yebo Invoices: 0040. Run in the Supabase SQL editor AFTER 0039. Safe to run twice.
-- Reply speed (responded_at) and "Did you get this job?" (outcome) on quote requests.
alter table public.quote_requests add column if not exists responded_at timestamptz;
alter table public.quote_requests add column if not exists outcome text check (outcome in ('won', 'lost'));
alter table public.quote_requests add column if not exists outcome_at timestamptz;

-- The first real response is stamped by the database: the owner started a quote, or proposed a site visit.
create or replace function public.stamp_request_response() returns trigger
language plpgsql as $$
begin
  if new.responded_at is null and (
       (new.status = 'quoted' and old.status is distinct from 'quoted')
    or (new.visit_status is not null and old.visit_status is null)
  ) then
    new.responded_at := now();
  end if;
  return new;
end $$;

drop trigger if exists quote_requests_stamp_response on public.quote_requests;
create trigger quote_requests_stamp_response before update on public.quote_requests
  for each row execute function public.stamp_request_response();
