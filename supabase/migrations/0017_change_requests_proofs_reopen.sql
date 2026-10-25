-- 1. New things that can happen to a document, shown in its activity feed.
alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check
  check (type in ('sent', 'viewed', 'accepted', 'declined', 'reminder_sent', 'paid', 'emailed', 'deposit_claimed', 'expiry_reminder', 'change_requested', 'reopened'));

-- 2. Messages from the client: a change request on a quote, or a proof of payment on an invoice.
create table if not exists document_messages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  kind text not null check (kind in ('change_request', 'proof')),
  body text,
  file_path text,
  created_at timestamptz not null default now()
);
create index if not exists document_messages_doc_idx on document_messages (document_id, created_at desc);
alter table document_messages enable row level security;
drop policy if exists own_messages on document_messages;
create policy own_messages on document_messages for select
  using (exists (select 1 from documents d where d.id = document_messages.document_id and owns_business(d.business_id)));

-- 3. Private storage for proofs of payment. Files are written and signed by the server only.
insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false) on conflict do nothing;

-- 4. The client asks for a change to a quote (at most 5 a day per quote).
create or replace function request_quote_change(p_token text, p_body text) returns boolean
language plpgsql security definer set search_path = public as $$
declare d documents; msg text := btrim(coalesce(p_body, ''));
begin
  if length(msg) < 2 or length(msg) > 600 then return false; end if;
  select * into d from documents where public_token = p_token and type = 'quote' and status in ('sent', 'viewed') for update;
  if not found then return false; end if;
  if (select count(*) from document_messages where document_id = d.id and kind = 'change_request' and created_at > now() - interval '1 day') >= 5 then return false; end if;
  insert into document_messages (document_id, kind, body) values (d.id, 'change_request', msg);
  insert into events (document_id, type) values (d.id, 'change_requested');
  return true;
end $$;

-- 5. The client changes their mind within 24 hours of declining.
create or replace function reopen_declined_quote(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  select * into d from documents where public_token = p_token and type = 'quote' and status = 'declined' for update;
  if not found then return false; end if;
  if d.expiry_date is not null and d.expiry_date < current_date then return false; end if;
  if not exists (select 1 from events where document_id = d.id and type = 'declined' and created_at > now() - interval '24 hours') then return false; end if;
  update documents set status = 'sent' where id = d.id;
  insert into events (document_id, type) values (d.id, 'reopened');
  return true;
end $$;

-- 6. The owner reopens a declined quote at any time (it must not have expired).
create or replace function owner_reopen_quote(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  select * into d from documents where id = p_id and type = 'quote' and status = 'declined' for update;
  if not found or not owns_business(d.business_id) then return false; end if;
  if d.expiry_date is not null and d.expiry_date < current_date then return false; end if;
  update documents set status = 'sent' where id = d.id;
  insert into events (document_id, type) values (d.id, 'reopened');
  return true;
end $$;

grant execute on function request_quote_change(text, text), reopen_declined_quote(text) to anon, authenticated;
grant execute on function owner_reopen_quote(uuid) to authenticated;
