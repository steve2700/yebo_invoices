-- Optional sections that make a quote look professional: what is not included, what it assumes, and when it happens.
alter table documents add column if not exists exclusions text;
alter table documents add column if not exists assumptions text;
alter table documents add column if not exists timeline text;
alter table documents drop constraint if exists documents_scope_length_check;
alter table documents add constraint documents_scope_length_check
  check (coalesce(length(exclusions), 0) <= 1000 and coalesce(length(assumptions), 0) <= 1000 and coalesce(length(timeline), 0) <= 300);
