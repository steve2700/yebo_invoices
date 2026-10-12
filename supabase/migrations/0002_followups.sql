-- Yebo Invoices: 0002. Run in the Supabase SQL editor after 0001_init.sql.
-- 1) Lets business owners record activity events (the app inserts 'sent' events, but 0001 only allowed SELECT).
-- 2) Adds followups_due(): which quotes and invoices need a nudge today.

-- ============ 1. EVENTS: allow owners to insert their own activity ============
-- Only the event types the owner's app records itself. 'viewed', 'accepted' and 'declined'
-- are written by the public client page through record_document_event(), never by the owner.
create policy own_events_insert on events for insert
  with check (
    type in ('sent', 'reminder_sent', 'paid')
    and exists (select 1 from documents d where d.id = document_id and owns_business(d.business_id))
  );

create index if not exists events_document_type_created_idx on events (document_id, type, created_at desc);

-- ============ 2. FOLLOW-UPS ============
-- Returns the signed-in owner's documents that need a nudge. Runs with the caller's permissions,
-- so row level security limits it to their own business.
--
--   quote_followup   : sent or viewed quote, not expired, no answer after 3+ days
--   invoice_due_soon : unpaid invoice due within the next 2 days
--   invoice_overdue  : unpaid invoice past its due date
--
-- A document appears again only 3+ days after its last reminder, and never after 3 reminders.
-- days_waiting: days since the quote was sent, or days past due for invoices.
-- For invoice_due_soon it is zero or negative (negative = days until due).
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
      (select count(*) from events e where e.document_id = doc.id and e.type = 'reminder_sent')::int as reminder_count
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
