-- What Yebo read from the tender documents: how to submit, when it closes, what to return, price notes.
alter table tenders add column if not exists submission_info jsonb;
