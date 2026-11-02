-- Drafts that Yebo saved in the background while someone typed (not saved on purpose) are timestamped, so old ones can be cleared out.
-- Saving a draft deliberately clears the stamp. Safe to run twice.

alter table public.documents
  add column if not exists autosaved_at timestamptz;

create index if not exists documents_autosaved_idx
  on public.documents (autosaved_at)
  where autosaved_at is not null;
