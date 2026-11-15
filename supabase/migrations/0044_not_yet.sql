-- "Not yet" on a quote: the client picks when they want to hear from the business again (3, 7 or 14 days).
-- 1. New things that can show in a quote's activity.
alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check
  check (type in ('sent', 'viewed', 'accepted', 'declined', 'reminder_sent', 'paid', 'emailed', 'deposit_claimed', 'expiry_reminder', 'change_requested', 'reopened', 'promise_to_pay', 'snoozed', 'snooze_followup'));

alter table document_messages drop constraint if exists document_messages_kind_check;
alter table document_messages add constraint document_messages_kind_check
  check (kind in ('change_request', 'proof', 'promise', 'signature', 'snooze'));

-- 2. The client asks for time: a date between tomorrow and 21 days away (at most 3 times a day per quote).
-- If the quote would run out before the follow-up, it is extended so the price is held until a week after that date.
create or replace function snooze_quote(p_token text, p_date date) returns boolean
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  select * into d from documents where public_token = p_token and type = 'quote' and status in ('sent', 'viewed') for update;
  if not found then return false; end if;
  if p_date is null or p_date <= current_date or p_date > current_date + 21 then return false; end if;
  if (select count(*) from document_messages where document_id = d.id and kind = 'snooze' and created_at > now() - interval '1 day') >= 3 then return false; end if;
  insert into document_messages (document_id, kind, body) values (d.id, 'snooze', p_date::text);
  insert into events (document_id, type) values (d.id, 'snoozed');
  if d.expiry_date is not null and d.expiry_date < p_date + 7 then
    update documents set expiry_date = p_date + 7 where id = d.id;
  end if;
  return true;
end $$;
grant execute on function snooze_quote(text, date) to anon, authenticated;

-- 3. Automatic and dashboard follow-ups leave a quote alone while the client has asked for time.
create or replace function followups_due()
returns table (
  document_id uuid,
  kind text,
  number text,
  client_name text,
  total_cents bigint,
  days_waiting int,
  reminders_sent int
)
language sql stable set search_path = public as $$
  with today as (
    select (now() at time zone 'Africa/Johannesburg')::date as d
  ),
  base as (
    select
      doc.id,
      doc.type,
      doc.status,
      doc.number,
      doc.total_cents,
      doc.due_date,
      doc.expiry_date,
      c.name as client_name,
      coalesce(
        (select max(e.created_at) from events e where e.document_id = doc.id and e.type = 'sent'),
        doc.created_at
      ) as sent_at,
      (select max(e.created_at) from events e where e.document_id = doc.id and e.type = 'reminder_sent') as last_reminder_at,
      (select count(*) from events e where e.document_id = doc.id and e.type = 'reminder_sent')::int as reminder_count,
      (select max(m.body) from document_messages m where m.document_id = doc.id and m.kind = 'snooze') as snoozed_until
    from documents doc
    join clients c on c.id = doc.client_id
    where doc.status in ('sent', 'viewed', 'partially_paid')
  )
  select
    b.id,
    case
      when b.type = 'quote' then 'quote_followup'
      when b.due_date < t.d then 'invoice_overdue'
      else 'invoice_due_soon'
    end,
    b.number,
    b.client_name,
    b.total_cents,
    case
      when b.type = 'quote' then t.d - (b.sent_at at time zone 'Africa/Johannesburg')::date
      else t.d - b.due_date
    end,
    b.reminder_count
  from base b
  cross join today t
  where b.reminder_count < 3
    and (b.last_reminder_at is null or (b.last_reminder_at at time zone 'Africa/Johannesburg')::date <= t.d - 3)
    and (
      (
        b.type = 'quote'
        and b.status in ('sent', 'viewed')
        and (b.expiry_date is null or b.expiry_date >= t.d)
        and (b.sent_at at time zone 'Africa/Johannesburg')::date <= t.d - 3
        and (b.snoozed_until is null or b.snoozed_until::date <= t.d)
      )
      or (
        b.type = 'invoice'
        and b.due_date is not null
        and b.due_date <= t.d + 2
      )
    )
  order by 6 desc
$$;
grant execute on function followups_due() to authenticated;
