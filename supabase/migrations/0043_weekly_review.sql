-- "Your week": a Friday email and a dashboard card that compare this week with the same point last week.
-- On by default for everyone, can be switched off. weekly_review_last is the Monday of the last week we emailed, so nobody gets it twice.
alter table businesses add column if not exists weekly_review boolean not null default true;
alter table businesses add column if not exists weekly_review_last date;
