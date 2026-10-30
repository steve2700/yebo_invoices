# Yebo Invoices

> **Quotes clients say yes to.**

Yebo Invoices is a simple quoting and invoicing app built for small businesses in South Africa. It helps owners send professional quotes, get them accepted, turn them into invoices, and get paid, all from a phone or a browser.

---

## Why Yebo?

Small business owners (plumbers, photographers, tutors, caterers, electricians and more) constantly ask: *"Where do I create an invoice?"* Existing tools are either too complicated, too expensive, or built for other countries.

Yebo is built around one rule: **a new user should send their first quote within 3 minutes.**

## Core ideas

- **Easy everything:** simple sign up, simple login, simple document creation.
- **Built for South Africa:** rand formatting, VAT and non-VAT businesses, PayFast, EFT-friendly, South African time.
- **Quotes that win:** live coaching tips while writing a quote, plus follow-ups for quotes that go quiet.
- **Forgiving by design:** speak a quote instead of typing it, and let the app fix spelling and tidy the wording.
- **No uncertainty:** the owner and the client are both told, by email, when a payment lands, and the owner is told when a quote is answered.
- **WhatsApp-first:** send, follow up and say thank you where small businesses and their clients already are.
- **Quote to invoice in one click:** accepted quotes become invoices automatically.

---

## Features

### Version 1 (MVP)

- [x] Sign up and login (Google and email link)
- [x] Quick setup: business name, contact details, logo, VAT status and company registration
- [x] Create quotes and invoices with clients, line items, VAT, payment plans and tips
- [x] Save drafts and send them from the document detail page
- [x] Documents list with quotes and invoices in one place
- [x] Public client document page (no login): view, accept or decline a quote, pay an invoice
- [x] Activity events for sent, emailed, viewed, accepted, declined, reminder sent and payment received (shown in South African time)
- [x] Quote to invoice conversion
- [x] Dashboard: collected this month, outstanding and overdue totals, plus "You've been paid" and "Needs your attention" lists
- [x] Settings: brand identity, contact details, banking details, quote defaults and online payments
- [x] WhatsApp sharing, public link copying and QR code display
- [x] Mark invoices paid by EFT or cash
- [x] PDF downloads (quotes and invoices)
- [x] Email delivery with the PDF attached (Resend), with replies going to the business owner
- [x] Installable PWA (works like a mobile app)
- [x] Voice quotes and invoices (speak it, review the draft, apply it)
- [x] "Tidy up my wording": spelling and wording clean-up with a before and after review
- [x] AI-drafted intro messages, payment reminders and quote follow-ups (always reviewed before WhatsApp opens)
- [x] Rule-based tips on the create screen
- [x] Reminders for quotes with no reply and for invoices that are due soon or overdue (one tap, on the dashboard)
- [x] **Online payments with PayFast** (card and instant EFT), with verified payment confirmation
- [x] **Payment emails:** a receipt to the client and a "You've been paid" alert to the owner
- [x] **One-tap WhatsApp thank-yous** for the owner and a "Share receipt" button for the client
- [x] **Quote answered emails:** the owner is emailed when a client accepts or declines a quote
- [x] **Monthly targets:** set a money target and a quotes target, see animated progress, days left and a gentle "what to do next" on the dashboard
- [x] **Clear document actions:** every button says what it does, email sending shows progress and a clear "sent" or "failed" message, and replies go straight to the business owner
- [x] **Welcome tour:** a short plain-English introduction to the features at the end of onboarding
- [x] **Privacy Notice and Terms of Service** pages, linked from the footer
- [x] **Pricing, comparison and FAQ** sections on the landing page (three plans: The Side-Hustler R49, The Real Business R199, The Industry King R499)
- [x] **Subscriptions through PayFast** with a subscribe step after onboarding, monthly limits per plan, a "Your plan" card with usage in Settings, and cancelling in Settings. Switched on with `BILLING_ENFORCED=true`
- [x] **VAT sales summary** (The Industry King): every invoice, or every payment, for any period, with the VAT on it, as a CSV for the accountant. It covers the sales side only (output tax), not purchases, and is not a VAT201 return
- [x] **VAT sales summary** (The Industry King): every invoice and payment for any period, with the VAT on it, as a CSV for your accountant. By invoice date or by payment date. This is the sales (output tax) side only and is not a VAT201 return
- [x] **A better voice assistant:** a "say it like this" guide, a live microphone meter, a fixable transcript, an editable draft, phone number capture, and a warning when a price looks wrong (for example R1.80 instead of R1 800)
- [x] **South African banks list:** one list of 16 banks with their universal branch codes (`src/lib/sa-banks.ts`), used by onboarding and Settings. Picking a bank fills in its branch code, which can still be edited. Old saved names such as "FNB" are mapped to the new names, and "Other" is gone
- [x] **Yebo promo strip on every PDF:** a small footer on the last page of each quote and invoice PDF (Yebo logo, "This quote/invoice was made with Yebo Invoices", and a link to the site with `?ref=pdf-quote` or `?ref=pdf-invoice` so sign-ups from PDFs can be counted). It sits below the content margin so it never overlaps totals or banking details
- [x] **Tidier quote PDFs:** tighter spacing, and the totals and payment box now move to the next page together so the payment box is never left alone on a nearly empty page
- [x] **Build trust (Settings):** the year the business started trading, one short "about us" line (160 characters) and photos of past work. **Photo limits follow the plan: The Side-Hustler 1, The Real Business 3, The Industry King 6** (set as `workPhotos` in `src/lib/plans.ts`, checked on the server in `src/app/app/settings/actions.ts`, and listed in each plan's features). Several photos can be picked in one go. Photos save the moment they are chosen; the year and the about line save with the Save changes button. They appear in an "About" card on the page where a client accepts a quote, and "Trading since YEAR" is added to the PDF header. Nothing is shown if the business leaves these blank
- [x] **A Save changes button in every Settings section** (brand identity, contact details, banking, build trust, quote defaults), so owners never have to scroll to the bottom. They all save the same form, so any of them saves everything on the page. Logo and work photos save on their own as soon as they are chosen
- [x] The page where a client accepts a quote shows "Why hire ..." (year started, about line, work photos). The photos are on that page only, not in the PDF
- [x] Fixed a duplicate "Reports" link in the top menu, and tightened the quote PDF again so the totals and payment box fit on page 1 when there is room
- [x] **Deposit after a quote is accepted.** Once a client accepts a quote that asks for a deposit (or full payment upfront), the quote page shows a "Pay your deposit" box with the exact amount. Businesses with PayFast connected get a **Pay online** button (card or instant EFT; the deposit is recorded automatically and the owner and client are emailed). Businesses **without PayFast** show their bank details with the deposit amount and the quote number as the reference, plus an **I have paid the deposit by EFT** button that emails the owner so they can check their bank. The owner confirms with **Deposit received (EFT)** or **Paid cash** on the quote. When the quote becomes an invoice, the deposit is credited to it, so the client only pays the balance. Files: `src/lib/deposit.ts`, `src/app/d/[token]/page.tsx`, `src/app/d/[token]/pay/route.ts`, `src/app/api/payfast/notify/route.ts`, `src/app/app/documents/actions.ts`
- [x] **Good / Better / Best options on one quote.** In the quote form, switch on options and mark each item for one option or for all. The client sees each option with its own total, picks one and taps Accept; the quote's total is then fixed to that option on the server (`choose_quote_option`) and the invoice is made from it. The PDF shows each option with its own total until one is chosen, and the header says "From". No plan limit. Files: `src/lib/quote-options.ts`, `src/app/app/quotes/new/QuoteForm.tsx`, `src/app/app/quotes/new/actions.ts`
- [x] **Trust badges and customer reviews (Settings → Build trust).** Tick what is true (fully insured, certified, licensed, registered, references on request, safety compliant), add up to 5 real customer reviews (first name, suburb, what they said) and an optional Google reviews link. They appear in the "Why hire ..." card on the quote page, under "From past customers", with a note that the details are provided by the business. Not shown on the PDF. No plan limit yet; to limit reviews per plan, add a number to each plan in `src/lib/plans.ts` the way `workPhotos` works. Files: `src/lib/trust.ts`, `src/app/app/settings/page.tsx`
- [x] **Automatic email reminders.** Businesses on a plan with reminders (The Real Business and The Industry King, or everyone while billing is off) can tick **Send reminders for me automatically** in Settings → Quote defaults. A daily job (`vercel.json`, 06:00 UTC, which is 08:00 in South Africa) emails clients who have gone quiet on a quote, or whose invoice is due soon or overdue, using the same rules as the dashboard (3 days apart, at most 3). It sends from the business name with replies going to the business email, skips clients with no email, and records each reminder so nobody is emailed twice. Needs `CRON_SECRET` (see below). WhatsApp reminders stay one-tap, because automatic WhatsApp needs the official WhatsApp Business API. Files: `src/app/api/cron/reminders/route.ts`, `vercel.json`

### Added after v1

- [x] **Real "customer viewed" tracking.** A view counts only when a real browser keeps the page open for a moment. Link previews, robots, the owner's own devices and the "Open client view" button are skipped, and repeat opens within 30 minutes count once. The document shows "Opened 3 times, last ...". Files: `src/app/d/[token]/ViewBeacon.tsx`, `src/app/d/[token]/seen/route.ts`, `src/app/app/OwnerMark.tsx`
- [x] **Safer quote answers.** Accept and decline both ask once. Accepting needs a typed name, which is saved as a signature and shown on the page, the PDF and the owner's email. Declining asks for a reason, offers "ask a question instead", and can be undone by the customer for 24 hours or reopened by the owner at any time. Customers can also **ask for a change**. File: `src/app/d/[token]/AnswerBar.tsx`
- [x] **Copy buttons on bank details** and **"I have paid by EFT" on invoices**, with optional proof of payment (photo or PDF, private storage, checked by real file type). Files: `src/app/d/[token]/CopyButton.tsx`, `src/app/d/[token]/proof/route.ts`
- [x] **"I will pay on this day"** on unpaid invoices. Automatic reminders pause until that date
- [x] **Receipt emails** when the owner records a payment, and a **review request** (Google link from the business profile) once an invoice is fully paid. Files: `src/lib/receipt.ts`, `src/lib/notify-quote.ts`
- [x] **Quote-expiry reminder.** One friendly email 1 to 2 days before a quote runs out, using the same automatic-reminders setting
- [x] **Photos on quotes** (up to 6, private storage). File: `src/app/api/documents/[id]/photos/route.ts`
- [x] **Repeating monthly invoices.** A draft copy is made on the chosen day and the owner is emailed to review and send it. Nothing goes to the customer automatically. Files: `src/lib/recurring.ts`, `src/lib/recurring-run.ts`
- [x] **Customer statement.** One private link per client listing all their open invoices, with a pay button on each and bank details for paying the total. File: `src/app/s/[token]/page.tsx`
- [x] **Tender Engine upgrade.** "Read the documents for me" downloads the hub documents, finds the pricing pages, reads small tables exactly, and fills in how and where to submit. A "How to submit" card shows the email or portal, closing time and what to return, matched against the compliance vault. Vault documents warn 14 days before they expire and link to where to get each one. Files: `src/lib/tender-docs.ts`, `src/lib/tender-ingest.ts`, `src/app/api/tenders/[id]/auto-import/route.ts`, `src/app/app/tenders/SubmissionCard.tsx`
- [x] **App polish.** Install prompt and install button on the landing page, an opening animation, skeleton loading screens, payment confetti, pull to refresh, an alert sound for overdue invoices and closing tenders, and a tidier mobile layout

### Planned

- [ ] Let higher plans hide the Yebo promo strip on their PDFs
- [ ] "Get found" page for businesses that want a website, Google Business Profile or Google Ads
- [ ] Rate limits on the AI routes
- [ ] Part payments (pay the invoice in instalments)
- [ ] A confirmation email to the client when they accept a quote
- [ ] Ozow or Stitch for instant EFT
- [ ] "Repeat last invoice" for recurring clients
- [ ] Website "Request a quote" form that feeds into the app
- [ ] Data-driven tips from the user's own history
- [ ] Tip dismissals saved to the database (currently saved in the browser)
- [ ] Official WhatsApp Business API for automatic messages
- [ ] A retry queue for notification emails
- [ ] Multiple users per business
- [ ] Error tracking (Sentry)

### Out of scope for v1

Expense tracking, reports, inventory, multi-currency, native iOS/Android apps.

---

## Online payments (PayFast)

Each business connects **its own PayFast account** in Settings → Online payments. The money goes straight from the client to the business. Yebo never holds it.

### How a payment works

1. The client opens an invoice and taps **Pay now**. This is a POST to `/d/[token]/pay`, so browsers and link scanners can never start a payment by just visiting an address.
2. The server works out the balance still owed from the database (never from anything the browser sent), records a `payment_attempts` row, signs a PayFast form with the business's passphrase, and sends the client to PayFast.
3. After paying, the client returns to `/d/[token]/paid`, which shows the invoice's **real status** from the database and re-checks every few seconds.
4. PayFast separately calls `POST /api/payfast/notify` in the background. **This call is the only thing that marks an invoice paid.**

### What the notification handler checks

A payment is recorded only if every check passes:

1. The payment reference matches one of our payment attempts, and the invoice is an invoice.
2. The merchant ID matches the business's saved one.
3. The signature matches (computed with the business's passphrase).
4. The request came from one of PayFast's servers. (If PayFast's addresses cannot be looked up, a warning is logged and the other checks decide.)
5. The amount paid equals the amount we asked for.
6. PayFast confirms, when asked directly, that it sent the notification.

Then it records the payment once (`payments` has a unique rule on method and provider reference, so a repeated notification can never record a payment twice), updates the invoice to `paid` or `partially_paid`, adds a "Payment received" event, and sends the notification emails. Failed and cancelled attempts are marked as such and never touch the invoice. If the invoice was already fully paid when a payment arrives, the owner's email warns that the client may have paid twice.

Rejected notifications are logged with a clear reason (for example `signature does not match` or `amount mismatch`). Search your hosting logs for `[payfast]`.

### Connecting PayFast

1. Create a free **sandbox** account at sandbox.payfast.co.za. It shows a test Merchant ID and Key.
2. In Yebo, open **Settings → Online payments**, enter the Merchant ID and Key, tick **Test mode**, and save.
3. Add a **passphrase** in the PayFast dashboard and enter exactly the same one in Yebo. A mismatch is the most common cause of "signature" errors.

Keys and passphrases live in the `payfast_settings` table. It has row level security and no policies, and access is revoked from the browser roles, so only server code using the service role key can read it. They are never shown on client pages.

### Testing

- Payment confirmation **cannot be tested on `localhost`**, because PayFast has to reach your server. Test on the live site (`https://yeboinvoices.com`). **Pay now** and the redirect to PayFast do work locally.
- The minimum online payment is R5.00. Invoices below that show a message asking the client to pay by EFT.

### Going live (checklist)

1. Create and get approved for a **live** PayFast merchant account.
2. In its Integration settings, set a passphrase and make sure Instant Transaction Notifications (ITN) are enabled.
3. In Yebo Settings, enter the live Merchant ID, Key and passphrase and **untick Test mode**.
4. Make a small real payment (R5 to R10) on a real invoice, and check the invoice flips to paid and both emails arrive.
5. Never paste a live key or passphrase into a chat or commit it to git.

---

## Notifications

| When | Who is told | How |
|---|---|---|
| Client pays an invoice online | Client | Email receipt with the amount, invoice, date and a link |
| Client pays an invoice online | Owner | Email "You've been paid", with PayFast's fee and the net amount, plus a **Thank {client} on WhatsApp** button |
| Client pays | Owner | "You've been paid" card on the dashboard with a one-tap WhatsApp thank-you |
| Client accepts a quote | Owner | Email with a **Create the invoice** button and a WhatsApp message button |
| Client declines a quote | Owner | Email suggesting a friendly follow-up, with a WhatsApp message button |
| Owner emails a document | Client | Email with the PDF attached. Replies go to the business email |

- Each payment email is claimed in the database before it is sent (`client_notified_at`, `owner_notified_at`), so it is sent exactly once even if PayFast repeats its notification.
- Notification emails are sent straight away with no retry queue. If the email service is down at that moment the payment is still recorded correctly, but that email is lost.
- WhatsApp is **one-tap and human-sent**: the app opens WhatsApp with a ready message and the person taps send. Fully automatic WhatsApp needs the official WhatsApp Business API (verified account, approved templates, per-message cost), and is planned for later.
- The business email is the reply-to address and the alert address. If it is blank the app warns the owner on the document page and in Settings.

---

## AI features

All AI runs on [Groq](https://groq.com) through the Vercel AI SDK (`@ai-sdk/groq`). The app never sends anything to a client automatically: every AI result is shown to the owner first.

| Route | What it does |
|---|---|
| `POST /api/voice-quote` | Transcribes a voice note (Whisper) and extracts an editable quote or invoice draft: client, job, description and priced items |
| `POST /api/tidy` | Fixes spelling and tidies item lines, job name, location and description |
| `POST /api/ai-message` | Drafts WhatsApp messages. Kinds: `intro_note`, `intro`, `reminder` (invoices) and `quote_followup` (quotes) |

**Models in use:**

| Purpose | Model |
|---|---|
| Messages and tidy | `openai/gpt-oss-20b` |
| Quote extraction from voice | `openai/gpt-oss-120b` |
| Speech to text | `whisper-large-v3` |

**Safety rules the AI routes follow:**

- Supplied text is treated as untrusted data, never as instructions.
- The AI never invents prices, dates, names or work details. Exact amounts, dates and links are added by the app, not the model.
- `/api/tidy` rejects any suggestion that changes a number, and keeps the original.
- Every route checks the user is signed in. Draft requests are size limited.
- Provider errors are logged on the server and never shown to users.

**Groq notes:**

- Groq has moved some models (for example `llama-3.1-8b-instant` and `llama-3.3-70b-versatile`) to enterprise-only access. If you see "model does not exist or you do not have access", check [console.groq.com/docs/models](https://console.groq.com/docs/models) and change the model name in the routes above.
- The `gpt-oss` models are reasoning models. Their hidden reasoning counts against `maxOutputTokens`, so those limits are set generously and `reasoningEffort` is kept low for speed.
- To list the models your key can use: `GET https://api.groq.com/openai/v1/models` with your key.

---

## The tips engine

Yebo coaches owners while they work, so more quotes get accepted. Tips are rule-based, shown one at a time, dismissible ("Not now" for this visit, "Don't show again" remembered in the browser), and never block anything. Where a tip suggests a change, its button makes the change.

Current rules (in `QuoteForm.tsx`):

| Trigger | Tip |
|---|---|
| Voice draft just applied | "Check every price and quantity before you send." |
| Quote total R10 000 or more, paid after the job | Suggests a deposit, with a button to switch |
| A single line of R5 000 or more | "Break this into materials, labour and travel." |
| Invoice due "on completion" | Suggests a due date, with a button for 7 days |
| Items entered but no job name | Suggests a name, using the first item |
| Items entered but no description | "A short description helps your client see what they are paying for." |
| Quote with no job date | Suggests a date, or marking it as to be agreed |

The two money thresholds are constants at the top of `QuoteForm.tsx` (`DEPOSIT_TIP_CENTS` and `BIG_LINE_TIP_CENTS`).

---

## Reminders and follow-ups

Reminders are one tap, not automatic, because v1 sends through WhatsApp links.

- The dashboard's **Needs your attention** list shows a reminder button for quotes sent or viewed with no reply after 3 days (and not expired), invoices due within 2 days, and invoices that are overdue.
- The button opens the document at its reminder section, where the owner can draft a message with AI (or use a standard one) and open WhatsApp.
- Tapping **Open WhatsApp** records a `reminder_sent` event. A document is suggested again only 3 or more days later, and never after 3 reminders.
- The list comes from the `followups_due()` database function (migration `0002`).

A reminder is recorded when WhatsApp opens, not when the message is actually sent, because WhatsApp does not report that.

---

## How it works

Diagrams of how Yebo fits together are in **[docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)**:

1. The big picture (app, Supabase, PayFast, Resend, AI, eTenders)
2. The life of a quote and an invoice
3. What the customer can do on the link
4. How money moves
5. What runs every day
6. The Tender Engine
7. Who counts as a "customer view"
8. Data model, private storage and security rules
9. Reminders: automatic client emails, and the owner's morning list with one-tap WhatsApp (**[docs/REMINDERS.md](docs/REMINDERS.md)**)

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router, React), TypeScript, Tailwind CSS |
| Backend, database, auth, storage | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Hosting and DNS | Vercel (`yeboinvoices.com`) |
| Payments | PayFast (card and instant EFT), each business on its own account |
| AI | Groq via the Vercel AI SDK (`ai`, `@ai-sdk/groq`) and `zod` for structured output |
| Email | Resend, sending from the verified `yeboinvoices.com` domain |
| PDF generation | `pdf-lib` |
| QR codes | `qrcode` |
| WhatsApp (v1) | Click-to-send `wa.me` links |
| Scheduled jobs | Supabase or Vercel cron (planned) |
| Error tracking | Sentry (planned) |

---

## Data model (overview)

- **businesses**: owner, branding, contact details, VAT settings, bank details, trust profile (year started, about line, work photos), numbering prefix
- **clients**: name, email, WhatsApp number, notes
- **items**: autocomplete library per business
- **documents**: quotes and invoices in one table (`type`, `status`, totals, `public_token`, `source_quote_id`)
- **document_lines**: line items with their own snapshotted prices
- **payments**: amount, method (`payfast`, `eft`, `cash`), provider reference, `thanked_at`
- **payment_attempts**: one row per tap of Pay now. Its id is the PayFast `m_payment_id`. Tracks status and whether the receipt and owner alert were sent
- **payfast_settings**: each business's PayFast credentials (server-only, no browser access)
- **events**: sent, emailed, viewed, accepted, declined, reminder_sent, paid, deposit_claimed, expiry_reminder, change_requested, reopened, promise_to_pay
- **document_messages**: what a customer sends back: change requests, proofs of payment, payment promises and typed signatures
- **document_photos**: photos the owner attaches to a quote (private storage)
- **recurring_invoices**: an invoice that repeats on a day of the month, and when it next runs
- **tenders, tender_lines, tender_sources, tender_feed, tender_preferences, compliance_vault**: the Tender Engine (see the diagram above)
- **dismissed_tips**: reserved for saving tip dismissals (not used yet; tips use browser storage)

### Key design decisions

1. Quotes and invoices share one table; converting a quote creates a new row linked via `source_quote_id`.
2. Money is stored as **integers in cents**, never floats. Totals are always calculated on the server, and PayFast amounts are built with integer maths.
3. Lines **snapshot** their price, so later edits to the items library never change old documents.
4. Document numbers are sequential per business and type, generated by a database function to avoid duplicates and gaps.
5. Clients open documents via an **unguessable public token**, read through a narrow server function that never returns keys or passphrases.
6. **Row Level Security** on every table, keyed to `business_id`.
7. Owners can record only `sent`, `emailed`, `reminder_sent` and `paid` events from the browser. `viewed`, `accepted` and `declined` can only be written by the public client page through a server function.
8. A payment is only ever recorded from PayFast's **verified** notification, never from a redirect or a URL. Recording is idempotent.
9. The service role key is used only in server code (`src/lib/supabase/admin.ts`) and is never exposed to the browser.
10. "Overdue" is computed from the due date, not stored. All "today" and activity times use South African time.

---

## Document statuses

- **Quote:** draft, sent, viewed, accepted, declined, expired
- **Invoice:** draft, sent, viewed, partially_paid, paid, overdue (computed)

---

## Getting started

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd yebo-invoices

# 2. Install dependencies (Node 20 or newer)
pnpm install

# 3. Copy environment variables
cp .env.example .env.local

# 4. Run the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Before you push, check your work with:

```bash
pnpm exec tsc --noEmit   # type check; no output means it passed
pnpm build               # the same build the host runs
```

### Database setup

Run the migrations **in order** in the Supabase SQL Editor (copies are in `supabase/migrations/`):

| File | What it does |
|---|---|
| `0001_init.sql` | Tables, row level security, numbering, public client page functions, logo storage |
| `0002_followups.sql` | Lets owners record activity events and adds `followups_due()` for reminders |
| `0003_emailed_event.sql` | Allows the `emailed` event type |
| `0004_payfast.sql` | PayFast settings and payment attempts tables, and the "accepts online payments" flag on the public page |
| `0005_payment_notifications.sql` | Remembers when payment emails were sent, so each is sent once |
| `0006_thanked_payments.sql` | Remembers when the owner thanked a client for a payment |
| `0007_monthly_targets.sql` | Monthly money and quote targets for each business |
| `0008_subscriptions.sql` | Subscriptions, subscription payments and voice quote usage |
| `0009_trust_profile.sql` | Year started, "about us" line and up to 6 work photos on each business, and the same fields on the public client page |
| `0010_deposit_options_reviews_reminders.sql` | "I have paid the deposit" claim, Good / Better / Best options on quotes, trust badges, reviews and Google link, and the automatic reminders switch |
| `0011_tenders.sql` | Tender Engine tables (tenders, priced lines, sources), the compliance vault and private tender file storage |
| `0012_tender_hub.sql` | The tender feed from eTenders, each owner's trades and province, and auto-drafts |
| `0013_tender_submission_info.sql` | Stores what Yebo read from the tender documents (how to submit, closing time, what to return) |
| `0014_customer_views.sql` | Counts only real customer views, once per 30 minutes |
| `0015_invoice_paid_claim.sql` | "I have paid by EFT" on invoices |
| `0016_expiry_reminder_event.sql` | Records that a quote-expiry reminder was sent |
| `0017_change_requests_proofs_reopen.sql` | Customer change requests, proof-of-payment storage, undo a decline and owner reopen |
| `0018_promise_signature.sql` | "I will pay on this day" and the typed signature on accepted quotes |
| `0019_photos_recurring.sql` | Photos on quotes, repeating monthly invoices and system numbering for the daily job |
| `0020_client_statement.sql` | A private statement link per client listing everything they owe |
| `0021_quote_scope.sql` | Optional "Not included / Assumptions / Timeline" sections on quotes |
| `0022_credit_notes.sql` | Credit notes: own number series, lowers what an invoice owes, never counted as income |
| `0023_decline_reason.sql` | Saves why a quote was declined, for the Quote results screen |

Supabase may warn about "destructive operations" on some of these. They only drop and recreate policies or functions, and do not touch your data.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # secret key from Supabase → Settings → API Keys. Server only, never NEXT_PUBLIC_
NEXT_PUBLIC_APP_URL=              # https://yeboinvoices.com in production (no trailing slash); http://localhost:3000 locally

GROQ_API_KEY=

RESEND_API_KEY=
RESEND_EMAIL_DOMAIN=yeboinvoices.com

CRON_SECRET=                      # any long random text. Vercel sends it to the daily reminders job. Without it, automatic reminders do not run

# Shown on the Privacy Notice and Terms pages (required before launch)
# Billing. Leave BILLING_ENFORCED unset (or false) until you are ready to charge, so nobody is locked out.
BILLING_ENFORCED=false            # true switches on plans, limits and the paid-plan check
YEBO_PAYFAST_MERCHANT_ID=         # Yebo's OWN PayFast account (receives subscription fees)
YEBO_PAYFAST_MERCHANT_KEY=
YEBO_PAYFAST_PASSPHRASE=          # required for subscriptions
YEBO_PAYFAST_SANDBOX=true         # test mode. Only set to false when you go live

LEGAL_NAME=                       # your registered business name
LEGAL_ADDRESS=                    # your registered address
CONTACT_EMAIL=                    # where people can reach you about privacy and terms
```

Never commit real keys. Keep `.env.local` in `.gitignore`. Set the same variables in Vercel under **Project Settings → Environment Variables**, then redeploy. `NEXT_PUBLIC_APP_URL` is where PayFast sends payment confirmations and what email links use, so it must be the public address and must not redirect.

PayFast credentials are **not** environment variables. Each business saves its own in Settings.

### Email setup (Resend)

1. Create an account at resend.com and add your domain under **Domains → Add Domain**.
2. Add the DNS records Resend shows (DKIM, plus SPF and MX on the `send` subdomain) wherever your domain's DNS is managed. Do not remove existing records, such as those for a mailbox on the same domain.
3. Click **Verify** in Resend.
4. Create an API key with **Sending access** and set `RESEND_API_KEY` and `RESEND_EMAIL_DOMAIN`.

Until the domain is verified, Resend only lets you email your own account address. The free plan allows 3,000 emails a month and 100 a day.

### Supabase auth setup

In **Authentication → Providers**, enable Google (and keep Email on for magic links). Add your callback URLs (`http://localhost:3000/auth/callback` and `https://yeboinvoices.com/auth/callback`) under **Authentication → URL Configuration**.

---

## Where things live

| Area | Location |
|---|---|
| Create quote or invoice screen | `src/app/app/quotes/new/` (`QuoteForm.tsx`, `VoiceQuoteAssistant.tsx`, `actions.ts`) |
| Document page, WhatsApp composer, document actions (including reminder logging) | `src/app/app/documents/` |
| Dashboard and "You've been paid" card | `src/app/app/page.tsx`, `DashboardView.tsx`, `ThankClientButton.tsx` |
| Thank-you tracking | `src/app/app/payments/actions.ts` |
| Settings (including PayFast connection) | `src/app/app/settings/page.tsx` |
| Public client page, Pay now, thank-you page, PDF | `src/app/d/[token]/` (`page.tsx`, `pay/route.ts`, `paid/page.tsx`, `pdf/route.ts`) |
| PayFast payment confirmation | `src/app/api/payfast/notify/route.ts` |
| AI routes | `src/app/api/voice-quote`, `src/app/api/tidy`, `src/app/api/ai-message` |
| PayFast helpers (signing and verification) | `src/lib/payfast.ts` |
| Email sending and layout | `src/lib/email.ts` |
| Quote accepted or declined emails | `src/lib/notify-quote.ts` |
| Server-only Supabase admin client | `src/lib/supabase/admin.ts` |
| Monthly targets card and saving | `src/app/app/MonthlyTargets.tsx`, `src/app/app/targets/actions.ts` |
| Onboarding (business, logo and banking, welcome tour) | `src/app/app/onboarding/` |
| Email card with progress and result | `src/app/app/documents/SendEmailCard.tsx` |
| Privacy Notice, Terms and their text | `src/app/privacy`, `src/app/terms`, `src/lib/legal-content.ts` |
| Landing page sections | `src/components/` |
| The three plans, their prices and limits (one place to change them) | `src/lib/plans.ts` |
| Plan access rules and usage limits | `src/lib/access.ts`, `src/lib/subscription.ts` |
| Tender hub (feed, preferences, start a bid) and the daily feed job | `src/app/app/tenders/hub/`, `src/app/api/cron/tender-feed/route.ts`, `src/lib/tender-feed.ts` |
| VAT sales summary (page, CSV download, and the maths) | `src/app/app/reports/vat/`, `src/lib/vat-report.ts`, `src/lib/vat-data.ts` |
| Subscribe step, checkout and confirmation page | `src/app/app/subscribe/` |
| Subscription payment confirmation from PayFast | `src/app/api/subscriptions/notify/route.ts` |
| "Your plan" card and cancelling | `src/app/app/billing/` |
| VAT sales summary page and CSV download | `src/app/app/reports/vat/`, `src/lib/vat-report.ts`, `src/lib/vat-data.ts` |
| Voice assistant, editable draft and voice route | `src/app/app/quotes/new/VoiceQuoteAssistant.tsx`, `src/app/api/voice-quote/route.ts` |
| Shared gentle animations | `src/app/globals.css`, `src/components/Reveal.tsx`, `src/components/SubmitButton.tsx` |
| PDF builder (including the Yebo promo strip) | `src/lib/pdf.ts` |
| South African banks and branch codes | `src/lib/sa-banks.ts`, `src/components/BankFields.tsx` |
| Build trust: work photos upload, plan limit and saving | `src/app/app/settings/WorkPhotos.tsx`, `src/app/app/settings/actions.ts`, `src/lib/work-photos.ts` |
| Customer actions on the link (accept, decline, change, undo) | `src/app/d/[token]/AnswerBar.tsx`, `src/app/d/[token]/page.tsx` |
| Customer statement page | `src/app/s/[token]/page.tsx` |
| Receipts, quote and payment emails | `src/lib/receipt.ts`, `src/lib/notify-quote.ts` |
| Repeating invoices (dates and the daily run) | `src/lib/recurring.ts`, `src/lib/recurring-run.ts` |
| Tender document reading, submission info and the auto-import | `src/lib/tender-docs.ts`, `src/lib/tender-ingest.ts`, `src/app/api/tenders/[id]/` |
| Compliance vault checks, expiry warnings and where-to-get links | `src/lib/tenders.ts` (`vaultChecks`, `VAULT_SOURCES`), `src/app/app/tenders/vault/` |

---

## Billing and plans

Three monthly plans, all paid through PayFast, defined in `src/lib/plans.ts`:

| Plan | Price | Quotes and invoices | Voice quotes | Reminders |
|---|---|---|---|---|
| The Side-Hustler | R49 | 10 a month | 1 a month | No |
| The Real Business | R199 | 50 a month | 5 a month | Yes |
| The Industry King | R499 | Unlimited (fair use) | Unlimited (fair use) | Yes, plus the VAT sales summary |

- Only features that exist today are listed as included. Ideas that are not built yet are shown as "Coming soon" and are not part of a plan.
- **A single switch.** Nothing is limited and nobody is locked out until `BILLING_ENFORCED=true`. Before you turn it on, run the optional "comped" SQL at the bottom of `0008_subscriptions.sql` for your own test business.
- **How a subscription works.** The owner picks a plan and pays on PayFast. The first payment is taken at once, and PayFast then charges the same amount monthly. PayFast confirms each payment to `/api/subscriptions/notify`, which runs the same checks as invoice payments (signature, PayFast's servers, amount, and PayFast's own confirmation), and only then switches the plan on for one month plus 3 spare days.
- **Access.** Access lasts until the end of the paid period, so a cancelled plan keeps working until then. Clients can always view and pay documents already sent, and owners can always reach Settings to manage or cancel.
- **Limits.** Quotes and invoices are counted per South African calendar month. Voice quotes are counted when a recording is successfully turned into a draft. Fixing a misheard word and rebuilding the draft from text does not use up a voice quote.
- **Changing plan** starts a new PayFast subscription, and the old one is cancelled automatically when the new payment arrives.
- **Cancelling** uses PayFast's API (it needs an API-enabled merchant account). If PayFast cannot cancel automatically, nothing changes and the owner is told how to cancel in PayFast.

### VAT sales summary (The Industry King)

- **Where:** Reports in the top menu (and a card in Settings, for phones), at `/app/reports/vat`. Download is at `/app/reports/vat/export`.
- **What it shows:** for any period, either every **invoice dated in the period** (excl VAT, VAT, incl VAT, how much has been paid) or every **payment received in the period** (split into its VAT part and the rest). Ask your accountant which one applies to the business.
- **Limits, stated on the page:** it covers sales only. It has no purchases (input tax), so it is not a VAT201 return, and there are no credit notes yet.
- **Safe by design:** money is built with integer maths, the CSV defuses spreadsheet formulas in client names, drafts are never included, dates use South African time, and more than 1000 rows are read in pages.

### Tender hub and auto-draft (The Industry King)

- **Where:** Tenders in the bottom bar (phones) or top menu (desktop), then **Tender hub**, at `/app/tenders/hub`.
- **What it does:** shows live public tenders from National Treasury's eTenders, filtered to the trades and provinces the owner picked. Tenders that have closed never show, and the daily job deletes any that closed over a week ago. **Start a bid** opens a tender with the details filled in, plus links to the tender documents. The owner then imports the BOQ, checks every line against the original, adds rates and approves. Nothing is sent without the owner.
- **Auto-draft:** when switched on in "My trades and area", the daily job opens a draft (max 5 a day) for each new matching tender and emails the owner once.
- **How it is fed:** `/api/cron/tender-feed` (daily, see `vercel.json`) reads the last 3 days of tenders from the eTenders OCDS API into the `tender_feed` table. It needs `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`. If the source address or parameters change, set `ETENDERS_API_URL` in Vercel. Opening the route with the header `Authorization: Bearer <CRON_SECRET>` returns a summary (`source`, `fetched`, `saved`, `purged`, `drafts`, `emails`) so it can be tested by hand.
- **Trade and province** are worked out from the tender's text (`src/lib/tender-feed.ts`). If a tender is put in the wrong trade, add the missing words to the rules in that file.
- **Database:** run `supabase/migrations/0012_tender_hub.sql` after 0011.

### Going live with billing (checklist)

1. Create and get approved for Yebo's own **live** PayFast merchant account. In its Integration settings, set a passphrase, enable ITN notifications, and ask PayFast to enable recurring billing and the API if they are not already on.
2. Set `YEBO_PAYFAST_MERCHANT_ID`, `YEBO_PAYFAST_MERCHANT_KEY` and `YEBO_PAYFAST_PASSPHRASE` in Vercel, and `YEBO_PAYFAST_SANDBOX=false`.
3. Run `0008_subscriptions.sql`, then the "comped" SQL for your own business.
4. Test the whole flow in sandbox first: subscribe, confirm the plan switches on, hit a limit, change plan, cancel.
5. Set `BILLING_ENFORCED=true` and redeploy.
6. Make one real subscription with your own card and check the first payment and the welcome email.

---

## Owner dashboard, sidebar and "Your numbers"

On wide screens the app has a left sidebar (Home, Quote requests, Quotes and invoices, Reminders, Tenders, Win rate, VAT report, Help, Settings). Phones keep the bottom bar. Sign out is in Settings only.

The home screen shows what to do next and how the business is doing:

- **Collected this month** with a comparison to last month.
- **Your numbers:** quotes sent and accepted this month against last month, and the win rate over 90 days (shown once 3 quotes have been sent).
- **Do this next:** one action chosen by simple rules, most urgent first (overdue invoices, accepted quotes to invoice, quotes waiting for a reply, then "send a quote").
- A short line of encouragement that changes each day.

The logic is in `src/lib/insights.ts` and is plain functions (`change`, `winRate`, `nextMove`, `thoughtFor`), so it is easy to test.

## Request a quote link

Each business has a private link (`/r/<token>`) where a client describes a job. The owner gets an email and a home card, and **Make a quote** opens the quote form with the job filled in. Full walkthrough with a worked example: [docs/REQUEST-A-QUOTE.md](docs/REQUEST-A-QUOTE.md). Needs migration `0028_requests_and_error_hits.sql`.

## Admin dashboard (`/admin`)

A private page for the founder, with its own sidebar: **Overview**, **People to follow up**, **Growth**, **Revenue**, **Survey**, **Errors** and **Reminder emails**.

- **Access:** only the single address in `ADMIN_EMAIL` (`src/lib/admin-stats.ts`) can open it. Anyone else gets a sign-in box that refuses other addresses. Every page under `/admin` goes through the check in `src/app/admin/layout.tsx`, so a new admin page cannot be left open by mistake.
- **Errors:** server errors (`src/instrumentation.ts`) and browser errors (`src/components/ErrorReporter.tsx`) are saved to `error_log`. The same problem is one row with a count, plus a last-24-hours count from `error_hits`. An email goes to `SURVEY_NOTIFY_EMAIL` (or the support address) the first time, then at 5, 25 and 100 repeats.
- **Sign-in funnel:** steps on the login page are counted in `signin_events` (`src/app/login/track.ts`).
- **Visitors:** `visits` counts one visit per browser session with its source. Tag links with `?s=facebook` or `?utm_source=reddit`.
- **Revenue:** monthly total from active plans at list prices.

Migrations: `0026_admin_tracking.sql`, `0027_visits.sql`, `0028_requests_and_error_hits.sql`.

## Reminder emails to people who stalled

A daily job (inside the existing reminders cron, no extra Vercel cron) emails people who signed up but did not finish setup, or set up but never sent a quote. At most 2 of each kind per person, at least 3 days apart, stopping after 30 days, each with an unsubscribe link (`/unsubscribe`). It is **off** until `NUDGES_ENABLED=true` is set in Vercel. The admin page shows who is due. Code: `src/lib/nudge-rules.ts`, `src/lib/nudges.ts`.

## Sign-in

Email sign-in uses a 6-digit code (no magic link), so it works on any device. Google sign-in is also offered. In Supabase, both the **Magic link** and **Confirm sign up** email templates must contain `{{ .Token }}`. Custom SMTP is needed to edit templates and raise the emails-per-hour limit.

## Extra environment variables

| Name | Purpose |
|---|---|
| `NUDGES_ENABLED` | `true` turns on the stalled-user reminder emails. Unset means off. |
| `SURVEY_NOTIFY_EMAIL` | Where survey answers and error alerts are emailed. Defaults to the support address. |
| `CRON_SECRET` | Already used by the crons. Also signs the unsubscribe links. |

## Testing checklist

Run this after deploying, on a phone as well as a desktop browser. Payment confirmation must be tested on the live site, not `localhost`.

1. **Create:** make a quote with two items, a description and a deposit. Save it, then send it.
2. **Voice:** record a quote and an invoice. Check items, per-unit prices and the description come through.
3. **Tidy:** type items with typos, then tap **Tidy up my wording** and **Tidy this**. Check numbers never change.
4. **Client view:** open the public link in a private window. Check the description, the line breaks and the Accept button.
5. **Quote answers:** accept one quote and decline another. The owner should get an email for each, and the status and Activity should update.
6. **Convert:** create an invoice from the accepted quote, and check only one invoice exists.
7. **PDF:** download it and check apostrophes, dashes and long descriptions.
8. **Email:** email a document to yourself. Check the PDF is attached, Activity shows "Sent to client" and "Emailed to client", and Reply goes to the business email.
9. **Pay now (sandbox):** on the live site, tap **Pay now** on an unpaid invoice and complete a test payment. The thank-you page should flip to "Payment received", the invoice should show paid, and the client and owner should each get one email.
10. **Cancel a payment:** cancel on PayFast's page. You should return to the invoice with a "not charged" notice and the invoice stays unpaid.
11. **Thank-yous:** the dashboard shows a "You've been paid" card. **Thank on WhatsApp** opens WhatsApp with the message and clears the card. **Not needed** clears it without opening WhatsApp.
12. **Reminders:** open an overdue invoice from the dashboard, draft a reminder, open WhatsApp, and check the dashboard button disappears.
13. **Times:** Activity times match South African time.
14. **Voice:** record a quote that includes a client name, a phone number and a price in thousands. Check the phone number appears, a price like "one point eight" is flagged with a "Use R1 800" button, and fixing the words and tapping "Rebuild" works.
15. **VAT summary:** on a Industry King (or free-access) account, open Reports, pick last month, check the totals match your invoices, download the CSV and open it in Excel. Check a name starting with "=" does not turn into a formula.
16. **Plans (sandbox):** subscribe, check the plan switches on, create documents until you reach the limit and see the upgrade message, change plan, and cancel.
17. **Phone navigation:** on a phone, the bottom bar shows Home, Documents, the big + button, Tenders and Reports, and the gear at the top opens Settings. Tap Reports and check the VAT summary opens.
18. **Tender hub:** run `0012_tender_hub.sql`, then open `/api/cron/tender-feed` with the `Authorization: Bearer <CRON_SECRET>` header. Open Tenders, then Tender hub, pick your trades, and check matching open tenders appear and closed ones do not. Tap **Start a bid** and check the tender opens with its details and document links. Switch on auto-draft, run the job again, and check a draft appears and one email arrives.

---

## Suggested build order (what is left)

1. Rate limits on the AI routes
2. Go live with PayFast (live credentials and a small real payment)
3. Automatic reminders (cron plus email, WhatsApp Business API later)
4. Deposit and part payments online
5. Repeat documents, templates and saved item packs
6. Production hardening: error tracking, a retry queue for emails, backups and a small end-to-end test suite

### Polish before expanding scope

- Keep the first quote under three minutes from a blank account.
- Make every document status and next action obvious.
- Treat the public client page as a branded sales and payment experience.
- Use clear South African terminology, rand formatting and VAT explanations.
- Prefer one strong default over a settings-heavy workflow.

---

## Pricing idea (to validate)

- **Free:** a few documents per month, so people can try it and share it
- **Paid:** affordable monthly plan for unlimited documents, reminders and tips
- **Bundles:** discounted or included with website packages

Validate with the first 10 to 20 real users before locking prices. AI features (voice, tidy, drafts) and emails have a small per-use cost, and PayFast charges the business a fee per payment, so keep that in mind when setting limits.

---

## Product principles

- Never make the user fill in a form they don't have to.
- Defaults over blanks: every field starts sensible.
- The client's view of a document reflects on our user's business, so it must look great.
- Tips help; they never nag or block.
- AI suggests; the owner decides. Nothing is sent or changed without a review.
- Nobody is left wondering: payments and answers are confirmed to the people who need to know.
- Money features must be boringly reliable.

---

## Contributing

This project is in early development. Contribution guidelines will be added later.

## License

To be decided.
