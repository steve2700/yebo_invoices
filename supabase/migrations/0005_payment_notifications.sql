-- Yebo Invoices: 0005. Run in the Supabase SQL editor AFTER 0001 to 0004.
-- Remembers when the client's receipt and the owner's payment alert were sent for each payment,
-- so each is sent exactly once even if PayFast repeats its notification.

alter table payment_attempts add column if not exists client_notified_at timestamptz;
alter table payment_attempts add column if not exists owner_notified_at timestamptz;
