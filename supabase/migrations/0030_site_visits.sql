-- Site visits: the owner proposes a day and time for a request, the client confirms or suggests another day.
-- Safe to run twice.

alter table public.quote_requests add column if not exists visit_at timestamptz;
alter table public.quote_requests add column if not exists visit_status text check (visit_status in ('proposed', 'confirmed', 'declined'));
alter table public.quote_requests add column if not exists visit_note text;
alter table public.quote_requests add column if not exists visit_responded_at timestamptz;
alter table public.quote_requests add column if not exists visit_token text unique;
