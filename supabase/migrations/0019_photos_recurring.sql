-- 1. Photos on quotes: files live in private storage, rows say which document they belong to.
create table if not exists document_photos (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists document_photos_doc_idx on document_photos (document_id, created_at);
alter table document_photos enable row level security;
drop policy if exists own_photos on document_photos;
create policy own_photos on document_photos for all
  using (exists (select 1 from documents d where d.id = document_photos.document_id and owns_business(d.business_id)))
  with check (exists (select 1 from documents d where d.id = document_photos.document_id and owns_business(d.business_id)));
insert into storage.buckets (id, name, public) values ('quote-photos', 'quote-photos', false) on conflict do nothing;

-- 2. Recurring invoices: copy an invoice on the same day every month.
create table if not exists recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_document_id uuid not null references documents(id) on delete cascade,
  day_of_month int not null check (day_of_month between 1 and 28),
  next_run date not null,
  active boolean not null default true,
  last_document_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists recurring_due_idx on recurring_invoices (next_run) where active;
alter table recurring_invoices enable row level security;
drop policy if exists own_recurring on recurring_invoices;
create policy own_recurring on recurring_invoices for all using (owns_business(business_id)) with check (owns_business(business_id));

-- 3. Numbering for the daily job (no signed-in user there). Only the server's service role may call it.
create or replace function next_document_number_system(p_business uuid, p_type text)
returns table (doc_seq int, doc_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_year int := extract(year from (now() at time zone 'Africa/Johannesburg'))::int;
  v_seq int;
begin
  if p_type not in ('quote','invoice') then raise exception 'invalid type'; end if;
  select prefix into v_prefix from businesses where id = p_business;
  if v_prefix is null then raise exception 'unknown business'; end if;
  insert into doc_counters (business_id, type, year, last_seq) values (p_business, p_type, v_year, 1)
  on conflict (business_id, type, year) do update set last_seq = doc_counters.last_seq + 1
  returning last_seq into v_seq;
  return query select v_seq, format('%s-%s-%s-%s', v_prefix, case p_type when 'quote' then 'QT' else 'INV' end, v_year, v_seq);
end $$;
revoke execute on function next_document_number_system(uuid, text) from public, anon, authenticated;
grant execute on function next_document_number_system(uuid, text) to service_role;
