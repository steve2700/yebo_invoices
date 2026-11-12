-- Pay by EFT when a card will not work, and a list of people who started checkout but did not pay.
-- Safe to run twice.

-- 1. A plan can now be paid for by EFT (you confirm it by hand in /admin/payments).
alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check check (provider in ('payfast', 'paystack', 'eft'));

-- 2. Every time someone is sent to the payment page. Only the server can read or write it.
create table if not exists public.checkout_starts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan text not null,
  provider text not null default 'paystack',
  reference text,
  created_at timestamptz not null default now()
);
create index if not exists checkout_starts_recent_idx on public.checkout_starts (created_at desc);
alter table public.checkout_starts enable row level security;

-- 3. "I have paid by EFT" notices. The owner can see their own; only the server can change them.
create table if not exists public.eft_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan text not null check (plan in ('side', 'real', 'king')),
  reference text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists eft_payments_status_idx on public.eft_payments (status, created_at desc);
alter table public.eft_payments enable row level security;
drop policy if exists own_eft_payments on public.eft_payments;
create policy own_eft_payments on public.eft_payments for select using (owns_business(business_id));
