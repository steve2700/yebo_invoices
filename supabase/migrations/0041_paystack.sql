-- Yebo Invoices: 0041. Run in the Supabase SQL editor AFTER 0040. Safe to run twice.
-- Lets a subscription be paid through Paystack as well as PayFast. Existing PayFast subscriptions are untouched.
alter table public.subscriptions
  add column if not exists provider text not null default 'payfast' check (provider in ('payfast', 'paystack')),
  add column if not exists ps_customer_code text,
  add column if not exists ps_subscription_code text,
  add column if not exists ps_email_token text;
create index if not exists subscriptions_ps_customer_idx on public.subscriptions (ps_customer_code);
-- Paystack payments are recorded in subscription_payments with pf_payment_id = 'ps_' + the Paystack reference (unique, so a repeat can never count twice).
