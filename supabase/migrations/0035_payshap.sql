-- Instant payments: the cellphone number linked to the owner's bank account for PayShap. Shown to clients on quotes and invoices when set.
-- Safe to run twice.

alter table public.businesses
  add column if not exists payshap_number text;
