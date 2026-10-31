-- Request links, part 2: where the request came from, the date the client would like it done, and job photos.
-- Safe to run twice.

alter table public.quote_requests add column if not exists source text;
alter table public.quote_requests add column if not exists preferred_date date;
alter table public.quote_requests add column if not exists photos text[] not null default '{}';

insert into storage.buckets (id, name, public) values ('request-photos', 'request-photos', false) on conflict do nothing;
