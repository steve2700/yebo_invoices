-- Monthly report email: on by default, and remembers which month was last sent so it never goes out twice.
alter table businesses add column if not exists monthly_report boolean not null default true;
alter table businesses add column if not exists monthly_report_last text;
