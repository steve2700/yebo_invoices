-- Yebo Invoices: 0004. Run in the Supabase SQL editor AFTER 0001, 0002 and 0003.
-- Adds the tables for online payments with PayFast and tells the public client page
-- whether a business accepts online payments (without ever exposing its keys).

-- ============ PAYFAST CREDENTIALS (each business uses its own PayFast account) ============
-- Row level security is ON with NO policies, and access is revoked, so the browser can never read or
-- write this table, even for the owner. Only server code using the service role key can.
create table payfast_settings (
  business_id uuid primary key references businesses(id) on delete cascade,
  merchant_id text not null,
  merchant_key text not null,
  passphrase text,
  sandbox boolean not null default true,   -- true = PayFast test mode
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table payfast_settings enable row level security;
revoke all on payfast_settings from anon, authenticated;

-- ============ PAYMENT ATTEMPTS ============
-- One row each time a client taps "Pay now". Its id is sent to PayFast as m_payment_id, and the
-- payment notification must match it (document and amount) before a payment is recorded.
create table payment_attempts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'complete', 'failed', 'cancelled')),
  pf_payment_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index on payment_attempts (document_id);
alter table payment_attempts enable row level security;
-- Owners can see attempts on their own documents. Only the server (service role) creates or updates them.
create policy own_attempts on payment_attempts for select
  using (exists (select 1 from documents d where d.id = document_id and owns_business(d.business_id)));

-- ============ PUBLIC CLIENT PAGE: does this business take online payments? ============
-- Same function as 0001, with two extra fields in 'business': online_payments and payments_sandbox.
-- No keys or passphrases are ever returned.
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
      'bank_account_type', b.bank_account_type, 'guarantee_months', b.guarantee_months,
      'online_payments', exists (select 1 from payfast_settings ps where ps.business_id = b.id and ps.enabled),
      'payments_sandbox', coalesce((select ps.sandbox from payfast_settings ps where ps.business_id = b.id), false)),
    'client', jsonb_build_object('name', c.name, 'address', c.address))
  from documents d
  join businesses b on b.id = d.business_id
  join clients c on c.id = d.client_id
  where d.public_token = p_token and d.status <> 'draft'
$$;
