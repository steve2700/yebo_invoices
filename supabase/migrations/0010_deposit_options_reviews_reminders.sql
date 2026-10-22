-- Yebo Invoices: 0010. Run in the Supabase SQL editor AFTER 0001 to 0009.
-- 1) Deposit after a quote is accepted ("I've paid the deposit" for businesses without PayFast)
-- 2) Good / Better / Best options on one quote
-- 3) Trust badges, customer reviews and a Google reviews link
-- 4) Automatic email reminders (opt in per business)

-- ============ 1. DEPOSIT ============
alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check
  check (type in ('sent', 'viewed', 'accepted', 'declined', 'reminder_sent', 'paid', 'emailed', 'deposit_claimed'));

-- The client taps "I've paid the deposit" on the quote page. This records it (at most once every 10 minutes)
-- and tells the page whether a new claim was recorded, so the owner is only emailed once.
create or replace function claim_deposit_paid(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  select * into d from documents
   where public_token = p_token and type = 'quote' and status = 'accepted' and payment_plan in ('deposit', 'full')
   for update;
  if not found then return false; end if;
  if exists (select 1 from events where document_id = d.id and type = 'deposit_claimed' and created_at > now() - interval '10 minutes') then
    return false;
  end if;
  insert into events (document_id, type) values (d.id, 'deposit_claimed');
  return true;
end $$;

-- ============ 2. GOOD / BETTER / BEST ============
alter table documents add column if not exists has_options boolean not null default false;
alter table documents add column if not exists chosen_option text;
alter table documents drop constraint if exists documents_chosen_option_check;
alter table documents add constraint documents_chosen_option_check
  check (chosen_option is null or chosen_option in ('good', 'better', 'best'));

-- option_key is null for lines every option shares, or 'good' / 'better' / 'best' for lines in one option only.
alter table document_lines add column if not exists option_key text;
alter table document_lines drop constraint if exists document_lines_option_key_check;
alter table document_lines add constraint document_lines_option_key_check
  check (option_key is null or option_key in ('good', 'better', 'best'));

-- The client picks an option when accepting. This fixes the quote's totals to that option, on the server.
create or replace function choose_quote_option(p_token text, p_option text) returns void
language plpgsql security definer set search_path = public as $$
declare d documents; v_sub bigint; v_vat bigint;
begin
  if p_option not in ('good', 'better', 'best') then raise exception 'invalid option'; end if;
  select * into d from documents
   where public_token = p_token and type = 'quote' and has_options and status in ('sent', 'viewed')
     and (expiry_date is null or expiry_date >= current_date)
   for update;
  if not found then return; end if;
  if not exists (select 1 from document_lines where document_id = d.id and option_key = p_option) then
    raise exception 'that option is not on this quote';
  end if;
  select coalesce(sum(line_total_cents), 0) into v_sub from document_lines
   where document_id = d.id and (option_key is null or option_key = p_option);
  v_vat := round(v_sub * d.vat_percent / 100)::bigint;
  update documents set chosen_option = p_option, subtotal_cents = v_sub, vat_cents = v_vat, total_cents = v_sub + v_vat where id = d.id;
end $$;

-- ============ 3. TRUST BADGES, REVIEWS, GOOGLE LINK ============
alter table businesses add column if not exists badges text[] not null default '{}';
alter table businesses add column if not exists reviews jsonb not null default '[]'::jsonb;
alter table businesses add column if not exists google_reviews_url text;

alter table businesses drop constraint if exists businesses_badges_check;
alter table businesses add constraint businesses_badges_check check (cardinality(badges) <= 8);
alter table businesses drop constraint if exists businesses_reviews_check;
alter table businesses add constraint businesses_reviews_check
  check (jsonb_typeof(reviews) = 'array' and jsonb_array_length(reviews) <= 5);
alter table businesses drop constraint if exists businesses_google_reviews_url_check;
alter table businesses add constraint businesses_google_reviews_url_check
  check (google_reviews_url is null or google_reviews_url ~ '^https://');

-- ============ 4. AUTOMATIC REMINDERS ============
alter table businesses add column if not exists auto_reminders boolean not null default false;

-- ============ PUBLIC CLIENT PAGE: same as 0009, plus the new fields ============
create or replace function get_public_document(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'document', to_jsonb(d) - 'business_id' - 'client_id' - 'public_token',
    'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.sort_order) from document_lines l where l.document_id = d.id), '[]'::jsonb),
    'paid_cents', coalesce((select sum(p.amount_cents) from payments p where p.document_id = d.id), 0),
    'deposit_claimed_at', (select max(e.created_at) from events e where e.document_id = d.id and e.type = 'deposit_claimed'),
    'business', jsonb_build_object(
      'name', b.name, 'logo_url', b.logo_url, 'brand_color', b.brand_color, 'email', b.email, 'phone', b.phone,
      'website', b.website, 'address', b.address, 'company_reg', b.company_reg,
      'vat_registered', b.vat_registered, 'vat_number', b.vat_number,
      'bank_name', b.bank_name, 'bank_account_holder', b.bank_account_holder,
      'bank_account_number', b.bank_account_number, 'bank_branch_code', b.bank_branch_code,
      'bank_account_type', b.bank_account_type, 'guarantee_months', b.guarantee_months,
      'year_started', b.year_started, 'about', b.about, 'work_photos', to_jsonb(b.work_photos),
      'badges', to_jsonb(b.badges), 'reviews', b.reviews, 'google_reviews_url', b.google_reviews_url,
      'online_payments', exists (select 1 from payfast_settings ps where ps.business_id = b.id and ps.enabled),
      'payments_sandbox', coalesce((select ps.sandbox from payfast_settings ps where ps.business_id = b.id), false)),
    'client', jsonb_build_object('name', c.name, 'address', c.address))
  from documents d
  join businesses b on b.id = d.business_id
  join clients c on c.id = d.client_id
  where d.public_token = p_token and d.status <> 'draft'
$$;

grant execute on function claim_deposit_paid(text), choose_quote_option(text, text), get_public_document(text) to anon, authenticated;
