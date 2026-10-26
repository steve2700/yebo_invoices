-- "Morning list": a daily email to the owner listing the reminders ready to send on WhatsApp. On by default, can be switched off.
alter table businesses add column if not exists morning_list boolean not null default true;
