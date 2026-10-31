-- Quote answers, part 2: revised quotes, "I still want this" on expired quotes, and win-back check-ins.
-- Safe to run twice.

alter table public.documents add column if not exists revises_id uuid references public.documents(id) on delete set null;
alter table public.documents add column if not exists revive_requested_at timestamptz;
alter table public.documents add column if not exists winback_sent_at timestamptz;

-- When a revised quote is sent, the quote it replaces stops being open, so the client cannot accept the old one
-- and the automatic follow-ups for it stop. Quotes that were accepted, declined or paid are left alone.
create or replace function public.supersede_old_quote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.revises_id is not null and new.status <> 'draft' and old.status = 'draft' then
    update public.documents set status = 'expired' where id = new.revises_id and status in ('sent', 'viewed');
  end if;
  return new;
end $$;

drop trigger if exists supersede_old_quote on public.documents;
create trigger supersede_old_quote after update of status on public.documents for each row execute function public.supersede_old_quote();
