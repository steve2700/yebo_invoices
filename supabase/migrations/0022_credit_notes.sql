-- Credit notes: a document that reduces what a client owes on an unpaid invoice (a discount, a goodwill amount,
-- work that was not done, an invoice raised in error). Nothing already paid is touched, and no money moves.
--
-- How it works: a credit note is its own document (numbered like GC-CN-2026-1) linked to the invoice. Issuing it
-- records a "credit" entry against the invoice, so the balance everywhere (dashboard, reminders, PayFast, statement)
-- is already correct. Credit entries are NOT income and are left out of income totals.

-- 1. A new document type, and a link to the invoice it reduces.
alter table documents drop constraint if exists documents_type_check;
alter table documents add constraint documents_type_check check (type in ('quote','invoice','credit_note'));
alter table documents add column if not exists credit_for_id uuid references documents(id) on delete restrict;
create index if not exists documents_credit_for_idx on documents (credit_for_id) where credit_for_id is not null;

-- 2. A "credit" payment method (not cash, not income).
alter table payments drop constraint if exists payments_method_check;
alter table payments add constraint payments_method_check check (method in ('payfast','eft','cash','credit'));

-- 3. Numbering knows about credit notes (CN).
create or replace function next_document_number(p_business uuid, p_type text)
returns table (doc_seq int, doc_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_year int := extract(year from (now() at time zone 'Africa/Johannesburg'))::int;
  v_seq int;
begin
  if p_type not in ('quote','invoice','credit_note') then raise exception 'invalid type'; end if;
  select prefix into v_prefix from businesses where id = p_business and owner_id = auth.uid();
  if v_prefix is null then raise exception 'not allowed'; end if;
  insert into doc_counters (business_id, type, year, last_seq) values (p_business, p_type, v_year, 1)
  on conflict (business_id, type, year) do update set last_seq = doc_counters.last_seq + 1
  returning last_seq into v_seq;
  return query select v_seq, format('%s-%s-%s-%s', v_prefix, case p_type when 'quote' then 'QT' when 'credit_note' then 'CN' else 'INV' end, v_year, v_seq);
end $$;

-- 4. Issue a credit note. All or nothing, and never more than the invoice still owes.
--    p_amount_cents includes VAT. The VAT part is worked out from the invoice's own VAT rate.
create or replace function issue_credit_note(p_invoice uuid, p_amount_cents bigint, p_reason text, p_description text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv documents%rowtype;
  v_paid bigint;
  v_balance bigint;
  v_vat bigint;
  v_sub bigint;
  v_year int := extract(year from (now() at time zone 'Africa/Johannesburg'))::int;
  v_seq int;
  v_prefix text;
  v_id uuid;
  v_text text := nullif(btrim(coalesce(p_description, '')), '');
begin
  select * into inv from documents where id = p_invoice for update;
  if not found or not owns_business(inv.business_id) then raise exception 'not allowed'; end if;
  if inv.type <> 'invoice' then raise exception 'Only invoices can be credited.'; end if;
  if inv.status not in ('sent','viewed','partially_paid') then raise exception 'This invoice cannot be credited (it is a draft or already settled).'; end if;

  select coalesce(sum(amount_cents), 0) into v_paid from payments where document_id = inv.id;
  v_balance := inv.total_cents - v_paid;
  if p_amount_cents is null or p_amount_cents < 1 then raise exception 'Enter an amount.'; end if;
  if p_amount_cents > v_balance then raise exception 'A credit note cannot be more than what is still owed on the invoice.'; end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'Give a short reason.'; end if;

  v_vat := round(p_amount_cents * inv.vat_percent / (100 + inv.vat_percent));
  v_sub := p_amount_cents - v_vat;

  select prefix into v_prefix from businesses where id = inv.business_id;
  insert into doc_counters (business_id, type, year, last_seq) values (inv.business_id, 'credit_note', v_year, 1)
  on conflict (business_id, type, year) do update set last_seq = doc_counters.last_seq + 1
  returning last_seq into v_seq;

  -- Status 'paid' here only means "applied". It keeps credit notes out of every "open document" list.
  insert into documents (business_id, client_id, type, seq, number, status, title, issue_date, vat_percent,
                         subtotal_cents, vat_cents, total_cents, note, credit_for_id)
  values (inv.business_id, inv.client_id, 'credit_note', v_seq,
          format('%s-CN-%s-%s', v_prefix, v_year, v_seq), 'paid',
          'Credit note for invoice ' || inv.number, (now() at time zone 'Africa/Johannesburg')::date, inv.vat_percent,
          v_sub, v_vat, p_amount_cents, left(btrim(p_reason), 500), inv.id)
  returning id into v_id;

  insert into document_lines (document_id, description, quantity, unit_price_cents, line_total_cents, sort_order)
  values (v_id, left(coalesce(v_text, 'Credit against invoice ' || inv.number), 300), 1, v_sub, v_sub, 0);

  -- thanked_at is set so this never shows up as "a payment to thank the client for".
  insert into payments (document_id, amount_cents, method, provider_reference, thanked_at)
  values (inv.id, p_amount_cents, 'credit', v_id::text, now());

  update documents set status = case when v_balance - p_amount_cents <= 0 then 'paid' else 'partially_paid' end where id = inv.id;
  return v_id;
end $$;
revoke execute on function issue_credit_note(uuid, bigint, text, text) from public, anon;
grant execute on function issue_credit_note(uuid, bigint, text, text) to authenticated;

-- 5. What the customer page needs: credit notes on an invoice, or the invoice a credit note belongs to.
create or replace function get_credit_links(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when d.type = 'invoice' then jsonb_build_object('credits', coalesce((
      select jsonb_agg(jsonb_build_object('number', c.number, 'token', c.public_token, 'total_cents', c.total_cents, 'issue_date', c.issue_date) order by c.created_at)
      from documents c where c.credit_for_id = d.id), '[]'::jsonb))
    when d.type = 'credit_note' then jsonb_build_object('invoice', (
      select jsonb_build_object('number', i.number, 'token', i.public_token, 'total_cents', i.total_cents, 'issue_date', i.issue_date)
      from documents i where i.id = d.credit_for_id))
    else '{}'::jsonb end
  from documents d where d.public_token = p_token and d.status <> 'draft';
$$;
grant execute on function get_credit_links(text) to anon, authenticated;
