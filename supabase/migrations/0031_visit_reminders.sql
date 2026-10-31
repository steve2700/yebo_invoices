-- Remembers that the day-before reminder email for a site visit was sent, so it goes out once.
alter table public.quote_requests add column if not exists visit_reminded_at timestamptz;
