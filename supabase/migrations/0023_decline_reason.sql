-- Remember WHY a quote was declined, so the win/loss screen can show where quotes are being lost.
alter table documents add column if not exists decline_reason text;
alter table documents drop constraint if exists documents_decline_reason_check;
alter table documents add constraint documents_decline_reason_check check (decline_reason is null or decline_reason in ('price','other','changes','later'));

-- Called by the public quote page right after a decline. Only the four listed reasons are accepted, only for a quote that
-- was declined in the last 15 minutes, and a reason that is already saved is never overwritten.
create or replace function set_decline_reason(p_token text, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare d documents%rowtype;
begin
  if p_reason is null or p_reason not in ('price','other','changes','later') then return false; end if;
  select * into d from documents where public_token = p_token and type = 'quote' and status = 'declined' for update;
  if not found or d.decline_reason is not null then return false; end if;
  if not exists (select 1 from events where document_id = d.id and type = 'declined' and created_at > now() - interval '15 minutes') then return false; end if;
  update documents set decline_reason = p_reason where id = d.id;
  return true;
end $$;
grant execute on function set_decline_reason(text, text) to anon, authenticated;
