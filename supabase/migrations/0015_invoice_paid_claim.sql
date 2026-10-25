-- The customer taps "I've paid by EFT" on an invoice. Recorded at most once every 10 minutes, and the page is told
-- whether a new claim was recorded so the owner is only emailed once. It reuses the deposit_claimed event.
create or replace function claim_invoice_paid(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  select * into d from documents
   where public_token = p_token and type = 'invoice' and status in ('sent', 'viewed', 'partially_paid')
   for update;
  if not found then return false; end if;
  if exists (select 1 from events where document_id = d.id and type = 'deposit_claimed' and created_at > now() - interval '10 minutes') then
    return false;
  end if;
  insert into events (document_id, type) values (d.id, 'deposit_claimed');
  return true;
end $$;

grant execute on function claim_invoice_paid(text) to anon, authenticated;
