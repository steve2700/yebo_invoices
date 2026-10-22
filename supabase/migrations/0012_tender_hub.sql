-- Yebo Invoices: 0012. Run in the Supabase SQL editor AFTER 0001 to 0011.
-- Tender Hub: a shared feed of live public tenders (written only by the daily job), each business's tender
-- preferences (trade categories, provinces, auto-draft), and a link from a tender back to the feed item it came from.

-- ============ THE FEED (shared, read-only for users) ============
create table if not exists tender_feed (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'etenders',
  external_id text not null,                       -- the OCDS "ocid" (or tender number) from the source
  reference text,                                  -- the tender / RFQ number
  title text not null,
  buyer text,                                      -- department or company
  category text,                                   -- one of the app's trade categories, worked out from the text
  province text,
  location text,
  published_at timestamptz,
  closing_at timestamptz,
  submission_email text,
  description text,
  documents jsonb not null default '[]'::jsonb,    -- [{ "title": "...", "url": "..." }]
  source_url text,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);
create index if not exists tender_feed_closing_idx on tender_feed (closing_at);
create index if not exists tender_feed_category_idx on tender_feed (category, closing_at);

alter table tender_feed enable row level security;
-- Anyone signed in can read the feed. There is no insert, update or delete policy, so only the service role (the daily job) can write.
drop policy if exists feed_read on tender_feed;
create policy feed_read on tender_feed for select to authenticated using (true);

-- ============ PREFERENCES (one row per business) ============
create table if not exists tender_preferences (
  business_id uuid primary key references businesses(id) on delete cascade,
  categories text[] not null default '{}',
  provinces text[] not null default '{}',          -- empty = anywhere in South Africa
  auto_draft boolean not null default false,       -- create a draft bid for new matching tenders
  email_alerts boolean not null default true,      -- email when drafts are ready
  default_markup_percent numeric(5,2) not null default 10 check (default_markup_percent >= 0 and default_markup_percent <= 500),
  updated_at timestamptz not null default now()
);
alter table tender_preferences enable row level security;
drop policy if exists own_tender_prefs on tender_preferences;
create policy own_tender_prefs on tender_preferences for all using (owns_business(business_id)) with check (owns_business(business_id));

-- ============ LINK A TENDER TO ITS FEED ITEM ============
alter table tenders add column if not exists feed_id uuid references tender_feed(id) on delete set null;
alter table tenders add column if not exists auto_drafted boolean not null default false;
-- A business never gets two bids for the same feed item, even if the job and the user act at the same moment.
create unique index if not exists tenders_business_feed_uidx on tenders (business_id, feed_id) where feed_id is not null;
