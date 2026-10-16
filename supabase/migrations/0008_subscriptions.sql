-- Yebo Invoices: 0008. Run in the Supabase SQL editor AFTER 0001 to 0007.
-- Subscriptions (The Side-Hustler R49, The Real Business R199, The Industry King R499),
-- a record of every subscription payment, and a monthly usage counter for voice quotes.

-- ============ SUBSCRIPTIONS ============
-- One row per business. Owners can READ their own row. Only the server (service role) can create or change it,
-- so nobody can give themselves a plan from the browser.
create table if not exists subscriptions (
  business_id uuid primary key references businesses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'cancelled', 'comped')),
  plan text not null default 'real' check (plan in ('side', 'real', 'king')),
  pf_token text,                    -- PayFast's token for the recurring subscription
  started_at timestamptz,
  current_period_end timestamptz,   -- the owner has paid up to this moment
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table subscriptions enable row level security;
drop policy if exists own_subscription on subscriptions;
create policy own_subscription on subscriptions for select using (owns_business(business_id));

-- ============ EVERY SUBSCRIPTION PAYMENT ============
-- pf_payment_id is unique, so a repeated PayFast notification can never record a payment twice.
create table if not exists subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  pf_payment_id text not null unique,
  plan text not null,
  amount_cents bigint not null check (amount_cents > 0),
  paid_at timestamptz not null default now()
);
alter table subscription_payments enable row level security;
drop policy if exists own_subscription_payments on subscription_payments;
create policy own_subscription_payments on subscription_payments for select using (owns_business(business_id));

-- ============ USAGE (voice quotes) ============
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  kind text not null check (kind in ('voice_quote', 'voice_rebuild')),
  created_at timestamptz not null default now()
);
create index if not exists usage_events_business_kind_created_idx on usage_events (business_id, kind, created_at);
alter table usage_events enable row level security;
drop policy if exists own_usage_select on usage_events;
create policy own_usage_select on usage_events for select using (owns_business(business_id));
drop policy if exists own_usage_insert on usage_events;
create policy own_usage_insert on usage_events for insert with check (owns_business(business_id));

-- ============ OPTIONAL: give your own test business free access ============
-- Billing is switched on with the BILLING_ENFORCED environment variable. Before you switch it on, run this
-- (change the email to the business email of your own test account) so you do not lock yourself out:
--
--   insert into subscriptions (business_id, status, plan)
--   select id, 'comped', 'king' from businesses where email = 'you@example.com'
--   on conflict (business_id) do update set status = 'comped', plan = 'king', updated_at = now();
