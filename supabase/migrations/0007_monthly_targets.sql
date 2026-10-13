-- Yebo Invoices: 0007. Run in the Supabase SQL editor.
-- Monthly targets: how much money to collect and how many quotes to send, for each month.
-- A month with no row simply carries over the most recent month's targets.

create table if not exists monthly_targets (
  business_id uuid not null references businesses(id) on delete cascade,
  month date not null,                                  -- the first day of the month, for example 2026-10-01
  revenue_cents bigint not null default 0 check (revenue_cents >= 0),
  quotes_count int not null default 0 check (quotes_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (business_id, month)
);

alter table monthly_targets enable row level security;
drop policy if exists own_targets on monthly_targets;
create policy own_targets on monthly_targets for all
  using (owns_business(business_id)) with check (owns_business(business_id));
