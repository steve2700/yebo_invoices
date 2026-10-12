-- Yebo Invoices: 0006. Run in the Supabase SQL editor AFTER 0001 to 0005.
-- Remembers when the owner has thanked a client for a payment (or chosen to skip it), so the
-- "You've been paid" card on the dashboard only shows payments that still need a thank-you.

alter table payments add column if not exists thanked_at timestamptz;
