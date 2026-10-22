-- Yebo Invoices: 0011. Run in the Supabase SQL editor AFTER 0001 to 0010.
-- Tender Engine (The Industry King): tenders, priced BOQ lines, the compliance vault, and private file storage.
-- Money is integer cents, like the rest of the app.

-- ============ TENDERS ============
create table if not exists tenders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  reference text,                                  -- the tender / RFQ number
  title text not null,
  client_name text,                                -- department or company asking for prices
  category text,                                   -- e.g. Plumbing, Electrical, Joinery
  location text,
  closing_at timestamptz,
  submission_email text,                           -- where the bid must be emailed
  status text not null default 'draft' check (status in ('draft', 'ready', 'submitted', 'won', 'lost')),
  notes text,
  vat_percent numeric(5,2) not null default 15,    -- snapshot: 0 when the business is not VAT registered
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  vat_cents bigint not null default 0 check (vat_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  submitted_at timestamptz,
  submitted_to text,
  source_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tender_email_fmt check (submission_email is null or submission_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);
create index if not exists tenders_business_idx on tenders (business_id, status, closing_at);

-- ============ BOQ LINES ============
create table if not exists tender_lines (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  sort_order int not null default 0,
  kind text not null default 'item' check (kind in ('heading', 'item')),
  item_no text,
  description text not null default '',
  unit text,
  quantity numeric(16,5) check (quantity is null or quantity >= 0),
  rate_cents bigint check (rate_cents is null or rate_cents >= 0),   -- null = not priced yet
  est_rate_cents bigint check (est_rate_cents is null or est_rate_cents >= 0), -- the client's own estimate, for cross-checking
  raw text,                                        -- the original text from the BOQ, so every line can be cross-checked
  ai_unsure boolean not null default false,        -- the reader was not sure about this line
  source_ref text                                  -- where it came from, e.g. 'sheet:Sheet1' or 'chunk:3'
);
create index if not exists tender_lines_tender_idx on tender_lines (tender_id, sort_order);
create index if not exists tender_lines_source_idx on tender_lines (tender_id, source_ref);

-- ============ SOURCE TEXT (big PDFs are read in pieces) ============
create table if not exists tender_sources (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  filename text not null,
  chunks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tender_sources_tender_idx on tender_sources (tender_id);

-- ============ COMPLIANCE VAULT (one row per business) ============
create table if not exists compliance_vault (
  business_id uuid primary key references businesses(id) on delete cascade,
  csd_number text,                 -- CSD supplier number, e.g. MAAA0492810
  csd_path text,                   -- file in the private tender-files bucket
  sars_pin text,
  sars_expiry date,
  sars_path text,
  bbbee_level int check (bbbee_level is null or bbbee_level between 1 and 9),
  bbbee_expiry date,
  bbbee_path text,
  coida_expiry date,
  coida_path text,
  updated_at timestamptz not null default now()
);

-- ============ ROW LEVEL SECURITY ============
alter table tenders enable row level security;
alter table tender_lines enable row level security;
alter table tender_sources enable row level security;
alter table compliance_vault enable row level security;

drop policy if exists own_tenders on tenders;
create policy own_tenders on tenders for all using (owns_business(business_id)) with check (owns_business(business_id));

drop policy if exists own_tender_lines on tender_lines;
create policy own_tender_lines on tender_lines for all
  using (exists (select 1 from tenders t where t.id = tender_id and owns_business(t.business_id)))
  with check (exists (select 1 from tenders t where t.id = tender_id and owns_business(t.business_id)));

drop policy if exists own_tender_sources on tender_sources;
create policy own_tender_sources on tender_sources for all
  using (exists (select 1 from tenders t where t.id = tender_id and owns_business(t.business_id)))
  with check (exists (select 1 from tenders t where t.id = tender_id and owns_business(t.business_id)));

drop policy if exists own_vault on compliance_vault;
create policy own_vault on compliance_vault for all using (owns_business(business_id)) with check (owns_business(business_id));

-- ============ PRIVATE FILE STORAGE (BOQs and compliance documents) ============
-- Private bucket: only the owner can read their own files. Files live in a folder named after the user's id.
insert into storage.buckets (id, name, public) values ('tender-files', 'tender-files', false) on conflict do nothing;

drop policy if exists tender_files_select on storage.objects;
create policy tender_files_select on storage.objects for select to authenticated
  using (bucket_id = 'tender-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists tender_files_insert on storage.objects;
create policy tender_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tender-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists tender_files_update on storage.objects;
create policy tender_files_update on storage.objects for update to authenticated
  using (bucket_id = 'tender-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists tender_files_delete on storage.objects;
create policy tender_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tender-files' and (storage.foldername(name))[1] = auth.uid()::text);
