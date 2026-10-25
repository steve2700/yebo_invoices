-- "I'll pay on Friday" on invoices, and a typed signature when a client accepts a quote.
alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check
  check (type in ('sent', 'viewed', 'accepted', 'declined', 'reminder_sent', 'paid', 'emailed', 'deposit_claimed', 'expiry_reminder', 'change_requested', 'reopened', 'promise_to_pay'));

alter table document_messages drop constraint if exists document_messages_kind_check;
alter table document_messages add constraint document_messages_kind_check
  check (kind in ('change_request', 'proof', 'promise', 'signature'));

-- The client promises to pay by a date between tomorrow and 30 days away (at most 3 promises a day per invoice).
create or replace function promise_to_pay(p_token text, p_date date) returns boolean
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  select * into d from documents where public_token = p_token and type = 'invoice' and status in ('sent', 'viewed', 'partially_paid') for update;
  if not found then return false; end if;
  if p_date is null or p_date <= current_date or p_date > current_date + 30 then return false; end if;
  if (select count(*) from document_messages where document_id = d.id and kind = 'promise' and created_at > now() - interval '1 day') >= 3 then return false; end if;
  insert into document_messages (document_id, kind, body) values (d.id, 'promise', p_date::text);
  insert into events (document_id, type) values (d.id, 'promise_to_pay');
  return true;
end $$;

-- The name typed by the client when accepting a quote. Only recorded while the quote is still waiting for an answer.
create or replace function sign_quote(p_token text, p_name text) returns boolean
language plpgsql security definer set search_path = public as $$
declare d documents; nm text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if length(nm) < 2 or length(nm) > 80 then return false; end if;
  select * into d from documents where public_token = p_token and type = 'quote' and status in ('sent', 'viewed') for update;
  if not found then return false; end if;
  delete from document_messages where document_id = d.id and kind = 'signature';
  insert into document_messages (document_id, kind, body) values (d.id, 'signature', nm);
  return true;
end $$;

-- What the public page and the PDF show: who signed and when.
create or replace function get_quote_signature(p_token text) returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object('name', m.body, 'at', m.created_at)
  from documents d join document_messages m on m.document_id = d.id and m.kind = 'signature'
  where d.public_token = p_token and d.type = 'quote' and d.status = 'accepted'
  order by m.created_at desc limit 1
$$;

grant execute on function promise_to_pay(text, date), sign_quote(text, text), get_quote_signature(text) to anon, authenticated;
