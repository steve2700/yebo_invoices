-- After a client accepts, they can tell the business where to come and how to get in (address, gate code, who to ask for).
alter table public.documents add column if not exists site_access text;
alter table public.documents add column if not exists site_access_at timestamptz;
