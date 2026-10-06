-- Yebo Invoices: initial schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Money is stored as integer cents. Overdue is computed from due_date, never stored.

create extension if not exists pgcrypto;

-- ============ TABLES ============
create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade, -- one business per user in v1
  name text not null,
  prefix text not null,                       -- "GC" for Granite Carpentry
  logo_url text,
  brand_color text not null default '#0F8A5F',
  email text, phone text, website text, address text,
  company_reg text,
  vat_registered boolean not null default false,
  vat_number text,
  bank_name text, bank_account_holder text, bank_account_number text,
  bank_branch_code text, bank_account_type text,
  guarantee_months int,
  default_expiry_days int not null default 14,
  default_payment_terms text not null default 'on completion',
  created_at timestamptz not null default now(),
  constraint vat_needs_number check (not vat_registered or vat_number ~ '^[0-9]{10}$'),
  constraint bank_acc_fmt check (bank_account_number is null or bank_account_number ~ '^[0-9]{8,11}$'),
  constraint bank_branch_fmt check (bank_branch_code is null or bank_branch_code ~ '^[0-9]{6}$')
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null, email text, whatsapp_number text, address text, notes text,
  preferred_payment text,                     -- 'after' | 'deposit' | 'full', learned over time
  created_at timestamptz not null default now()
);

create table items (                          -- autocomplete library
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  description text not null,
  default_price_cents bigint not null default 0,
  is_material boolean not null default false,
  times_used int not null default 0,
  last_used_at timestamptz
);

create table documents (                      -- quotes and invoices share one table
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_id uuid not null references clients(id),
  type text not null check (type in ('quote','invoice')),
  seq int not null,
  number text not null,                       -- GC-QT-2026-308
  status text not null default 'draft' check (status in
    ('draft','sent','viewed','accepted','declined','expired','partially_paid','paid')),
  title text, description text, location text,
  job_date date, job_date_tbd boolean not null default false,
  issue_date date not null default current_date,
  due_date date, expiry_date date,
  labour_only boolean not null default false,
  vat_percent numeric(5,2) not null default 0, -- snapshot: 0 when business is not VAT registered
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  vat_cents bigint not null default 0 check (vat_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  payment_plan text not null default 'after' check (payment_plan in ('after','deposit','full')),
  deposit_percent int check (deposit_percent between 1 and 100),
  payment_terms text,
  note text,
  public_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  source_quote_id uuid references documents(id),
  created_at timestamptz not null default now(),
  unique (business_id, type, number)
);

create table document_lines (                 -- lines snapshot their own price
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price_cents bigint not null default 0,
  line_total_cents bigint not null default 0,
  sort_order int not null default 0
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  method text not null check (method in ('payfast','eft','cash')),
  provider_reference text,
  paid_at timestamptz not null default now(),
  unique (method, provider_reference)         -- makes webhook handling idempotent
);

create table events (                         -- powers the activity feed and reminders
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  type text not null check (type in ('sent','viewed','accepted','declined','reminder_sent','paid')),
  created_at timestamptz not null default now()
);

create table dismissed_tips (
  user_id uuid not null references auth.users(id) on delete cascade,
  tip_id text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, tip_id)
);

create table doc_counters (                   -- gap-free numbering per business, type and year
  business_id uuid not null references businesses(id) on delete cascade,
  type text not null, year int not null, last_seq int not null default 0,
  primary key (business_id, type, year)
);

create index on clients (business_id);
create index on items (business_id);
create index on documents (business_id, type, status);
create index on document_lines (document_id);
create index on payments (document_id);
create index on events (document_id);

-- ============ ROW LEVEL SECURITY ============
create or replace function owns_business(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from businesses b where b.id = bid and b.owner_id = auth.uid())
$$;

alter table businesses enable row level security;
alter table clients enable row level security;
alter table items enable row level security;
alter table documents enable row level security;
alter table document_lines enable row level security;
alter table payments enable row level security;
alter table events enable row level security;
alter table dismissed_tips enable row level security;
alter table doc_counters enable row level security;   -- no policies: only the numbering function touches it

create policy own_business on businesses for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_clients on clients for all using (owns_business(business_id)) with check (owns_business(business_id));
create policy own_items on items for all using (owns_business(business_id)) with check (owns_business(business_id));
create policy own_documents on documents for all using (owns_business(business_id)) with check (owns_business(business_id));
create policy own_lines on document_lines for all
  using (exists (select 1 from documents d where d.id = document_id and owns_business(d.business_id)))
  with check (exists (select 1 from documents d where d.id = document_id and owns_business(d.business_id)));
create policy own_payments on payments for all
  using (exists (select 1 from documents d where d.id = document_id and owns_business(d.business_id)))
  with check (exists (select 1 from documents d where d.id = document_id and owns_business(d.business_id)));
create policy own_events on events for select
  using (exists (select 1 from documents d where d.id = document_id and owns_business(d.business_id)));
create policy own_tips on dismissed_tips for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ NUMBERING: GC-QT-2026-308 ============
create or replace function next_document_number(p_business uuid, p_type text)
returns table (doc_seq int, doc_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_year int := extract(year from (now() at time zone 'Africa/Johannesburg'))::int;
  v_seq int;
begin
  if p_type not in ('quote','invoice') then raise exception 'invalid type'; end if;
  select prefix into v_prefix from businesses where id = p_business and owner_id = auth.uid();
  if v_prefix is null then raise exception 'not allowed'; end if;

  insert into doc_counters (business_id, type, year, last_seq) values (p_business, p_type, v_year, 1)
  on conflict (business_id, type, year) do update set last_seq = doc_counters.last_seq + 1
  returning last_seq into v_seq;

  return query select v_seq, format('%s-%s-%s-%s', v_prefix, case p_type when 'quote' then 'QT' else 'INV' end, v_year, v_seq);
end $$;

-- ============ PUBLIC CLIENT PAGE (no login, token only) ============
create or replace function get_public_document(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'document', to_jsonb(d) - 'business_id' - 'client_id' - 'public_token',
    'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.sort_order) from document_lines l where l.document_id = d.id), '[]'::jsonb),
    'business', jsonb_build_object(
      'name', b.name, 'logo_url', b.logo_url, 'brand_color', b.brand_color, 'email', b.email, 'phone', b.phone,
      'website', b.website, 'address', b.address, 'company_reg', b.company_reg,
      'vat_registered', b.vat_registered, 'vat_number', b.vat_number,
      'bank_name', b.bank_name, 'bank_account_holder', b.bank_account_holder,
      'bank_account_number', b.bank_account_number, 'bank_branch_code', b.bank_branch_code,
      'bank_account_type', b.bank_account_type, 'guarantee_months', b.guarantee_months),
    'client', jsonb_build_object('name', c.name, 'address', c.address))
  from documents d
  join businesses b on b.id = d.business_id
  join clients c on c.id = d.client_id
  where d.public_token = p_token and d.status <> 'draft'
$$;

create or replace function record_document_event(p_token text, p_event text) returns void
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  if p_event not in ('viewed','accepted','declined') then raise exception 'invalid event'; end if;
  select * into d from documents where public_token = p_token and status <> 'draft' for update;
  if not found then return; end if;

  if p_event = 'viewed' then
    if d.status not in ('sent','viewed') then return; end if;
    if d.status = 'sent' then update documents set status = 'viewed' where id = d.id; end if;
  else
    if d.type <> 'quote' or d.status not in ('sent','viewed')
       or (d.expiry_date is not null and d.expiry_date < current_date) then return; end if;
    update documents set status = p_event where id = d.id;
  end if;
  insert into events (document_id, type) values (d.id, p_event);
end $$;

grant execute on function get_public_document(text), record_document_event(text, text) to anon, authenticated;
grant execute on function next_document_number(uuid, text) to authenticated;

-- ============ LOGO STORAGE ============
insert into storage.buckets (id, name, public) values ('logos', 'logos', true) on conflict do nothing;
create policy logo_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy logo_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
