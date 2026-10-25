-- A real customer view: recorded from the page itself (not by link-preview robots), never from the owner,
-- and repeat opens within 30 minutes count once. Every view is kept so the owner can see how often it was opened.
create or replace function record_customer_view(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  select * into d from documents where public_token = p_token and status <> 'draft' for update;
  if not found then return; end if;
  if d.status = 'sent' then update documents set status = 'viewed' where id = d.id; end if;
  if exists (select 1 from events where document_id = d.id and type = 'viewed' and created_at > now() - interval '30 minutes') then return; end if;
  insert into events (document_id, type) values (d.id, 'viewed');
end $$;

grant execute on function record_customer_view(text) to anon, authenticated;
