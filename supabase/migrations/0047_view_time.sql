-- How long a client kept the page open and how far they scrolled, kept on each "viewed" event.
alter table events add column if not exists seconds integer;
alter table events add column if not exists scroll_pct smallint;

-- Called by the client's page every few seconds while it is open. Adds the new seconds to the latest view.
create or replace function record_view_time(p_token text, p_seconds int, p_scroll int) returns void
language plpgsql security definer set search_path = public as $$
declare d documents; ev uuid;
begin
  select * into d from documents where public_token = p_token and status <> 'draft';
  if not found then return; end if;
  select id into ev from events where document_id = d.id and type = 'viewed' order by created_at desc limit 1;
  if ev is null then return; end if;
  update events set
    seconds = least(coalesce(seconds, 0) + greatest(least(coalesce(p_seconds, 0), 1800), 0), 7200),
    scroll_pct = greatest(coalesce(scroll_pct, 0), least(greatest(coalesce(p_scroll, 0), 0), 100))
  where id = ev;
end $$;

grant execute on function record_view_time(text, int, int) to anon, authenticated;
