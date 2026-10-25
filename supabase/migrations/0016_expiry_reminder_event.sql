-- Lets Yebo record that a "your quote expires soon" email was sent, so each quote is only nudged once about it.
alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check
  check (type in ('sent', 'viewed', 'accepted', 'declined', 'reminder_sent', 'paid', 'emailed', 'deposit_claimed', 'expiry_reminder'));
