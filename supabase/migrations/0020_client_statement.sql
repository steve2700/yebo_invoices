-- A private link per client that lists everything they still owe, so one message replaces five reminders.
alter table clients add column if not exists statement_token text unique default encode(gen_random_bytes(18), 'hex');
update clients set statement_token = encode(gen_random_bytes(18), 'hex') where statement_token is null;
alter table clients alter column statement_token set not null;

create or replace function get_client_statement(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'client', jsonb_build_object('name', c.name),
    'business', jsonb_build_object(
      'name', b.name, 'logo_url', b.logo_url, 'brand_color', b.brand_color, 'email', b.email, 'phone', b.phone,
      'bank_name', b.bank_name, 'bank_account_holder', b.bank_account_holder,
      'bank_account_number', b.bank_account_number, 'bank_branch_code', b.bank_branch_code,
      'bank_account_type', b.bank_account_type,
      'online_payments', exists (select 1 from payfast_settings ps where ps.business_id = b.id and ps.enabled)),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'number', d.number, 'token', d.public_token, 'issue_date', d.issue_date, 'due_date', d.due_date,
        'total_cents', d.total_cents, 'balance_cents', d.total_cents - pay.paid) order by d.due_date nulls last, d.issue_date)
      from documents d
      cross join lateral (select coalesce(sum(p.amount_cents), 0) as paid from payments p where p.document_id = d.id) pay
      where d.client_id = c.id and d.type = 'invoice' and d.status in ('sent', 'viewed', 'partially_paid') and d.total_cents - pay.paid > 0
    ), '[]'::jsonb))
  from clients c join businesses b on b.id = c.business_id
  where c.statement_token = p_token
$$;

grant execute on function get_client_statement(text) to anon, authenticated;
