-- ============ TRUST PROFILE ============
-- Three optional things a business can add once so its quotes feel safer to say yes to:
-- the year it started trading, one short "about us" line, and up to 6 photos of past work.
-- Photos live in the existing public 'logos' storage bucket, in the owner's own folder.
alter table businesses
  add column if not exists year_started int,
  add column if not exists about text,
  add column if not exists work_photos text[] not null default '{}';

alter table businesses drop constraint if exists businesses_year_started_check;
alter table businesses add constraint businesses_year_started_check
  check (year_started is null or (year_started between 1900 and 2100));
alter table businesses drop constraint if exists businesses_about_check;
alter table businesses add constraint businesses_about_check
  check (about is null or char_length(about) <= 200);
alter table businesses drop constraint if exists businesses_work_photos_check;
alter table businesses add constraint businesses_work_photos_check
  check (cardinality(work_photos) <= 6);

-- Same function as 0004, with three extra fields in 'business': year_started, about and work_photos.
create or replace function get_public_document(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'document', to_jsonb(d) - 'business_id' - 'client_id' - 'public_token',
    'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.sort_order) from document_lines l where l.document_id = d.id), '[]'::jsonb),
    'business', jsonb_build_object(
      'name', b.name, 'logo_url', b.logo_url, 'brand_color', b.brand_color, 'email', b.email, 'phone', b.phone,
      'website', b.website, 'address', b.address, 'company_reg', b.company_reg,
      'vat_registered', b.vat_registered, 'vat_number', b.vat_number,
      'bank_name', b.bank_name, 'bank_account_holder', b.bank_account_holder,
      'bank_account_number', b.bank_account_number, 'bank_branch_code', b.bank_branch_code,
      'bank_account_type', b.bank_account_type, 'guarantee_months', b.guarantee_months,
      'year_started', b.year_started, 'about', b.about, 'work_photos', to_jsonb(b.work_photos),
      'online_payments', exists (select 1 from payfast_settings ps where ps.business_id = b.id and ps.enabled),
      'payments_sandbox', coalesce((select ps.sandbox from payfast_settings ps where ps.business_id = b.id), false)),
    'client', jsonb_build_object('name', c.name, 'address', c.address))
  from documents d
  join businesses b on b.id = d.business_id
  join clients c on c.id = d.client_id
  where d.public_token = p_token and d.status <> 'draft'
$$;
