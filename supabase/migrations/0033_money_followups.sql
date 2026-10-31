-- After a client says yes: remember the deposit nudges sent to them, and the "send the invoice" nudge sent to the owner.
alter table public.documents add column if not exists deposit_nudge_count int not null default 0;
alter table public.documents add column if not exists deposit_nudged_at timestamptz;
alter table public.documents add column if not exists invoice_nudge_sent_at timestamptz;
