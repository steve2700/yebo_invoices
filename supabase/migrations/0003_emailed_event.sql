-- Yebo Invoices: 0003. Run in the Supabase SQL editor AFTER 0001_init.sql and 0002_followups.sql.
-- The "Email document" action records an 'emailed' event, but 0001 did not allow that event type,
-- so those inserts were rejected. This allows it, for the owner only.

alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check
  check (type in ('sent', 'viewed', 'accepted', 'declined', 'reminder_sent', 'paid', 'emailed'));

drop policy if exists own_events_insert on events;
create policy own_events_insert on events for insert
  with check (
    type in ('sent', 'reminder_sent', 'paid', 'emailed')
    and exists (select 1 from documents d where d.id = document_id and owns_business(d.business_id))
  );
