# Yebo Invoices

> **Quotes clients say yes to.**

Yebo Invoices is a simple quoting and invoicing app built for small businesses in South Africa. It helps owners send professional quotes, get them accepted, turn them into invoices, and get paid, all from a phone or a browser.

---

## Why Yebo?

Small business owners (plumbers, photographers, tutors, caterers, electricians and more) constantly ask: *"Where do I create an invoice?"* Existing tools are either too complicated, too expensive, or built for other countries.

Yebo is built around one rule: **a new user should send their first quote within 3 minutes.**

## Core ideas

- **Easy everything:** simple sign up, simple login, simple document creation.
- **Built for South Africa:** rand formatting, VAT and non-VAT businesses, local payment providers, EFT-friendly.
- **Quotes that win:** live coaching tips while writing a quote, plus follow-ups for quotes that go quiet.
- **Forgiving by design:** speak a quote instead of typing it, and let the app fix spelling and tidy the wording.
- **WhatsApp-first:** send and follow up where small businesses and their clients already are.
- **Quote to invoice in one click:** accepted quotes become invoices automatically.

---

## Features

### Version 1 (MVP)

- [x] Sign up and login (Google and email link)
- [x] Quick setup: business name, contact details, logo, VAT status and company registration
- [x] Create quotes and invoices with clients, line items, VAT, payment plans and tips
- [x] Save drafts and send them from the document detail page
- [x] Documents list with quotes and invoices in one place
- [x] Public client document page (no login): view, accept or decline a quote
- [x] Activity events for sent, emailed, viewed, accepted, declined, reminder sent and paid
- [x] Quote to invoice conversion (one invoice per quote)
- [x] Dashboard: collected this month, outstanding and overdue totals, plus a "needs your attention" list
- [x] Settings: branding, banking details and guarantee copy
- [x] WhatsApp sharing, public link copying and QR code display
- [x] Mark invoices paid by EFT or cash
- [x] PDF downloads (quotes and invoices)
- [x] Email delivery with the PDF attached (Resend)
- [x] Installable PWA (works like a mobile app)
- [x] Voice quotes and invoices (speak it, review the draft, apply it)
- [x] "Tidy up my wording": spelling and wording clean-up with a before and after review
- [x] AI-drafted intro messages, payment reminders and quote follow-ups (always reviewed before WhatsApp opens)
- [x] Rule-based tips on the create screen
- [x] Reminders for quotes with no reply and for invoices that are due soon or overdue (one tap, on the dashboard)
- [ ] Fully automatic reminders (scheduled, no tap needed)

### Planned

- [ ] Online payments (PayFast, then Ozow or Stitch for instant EFT)
- [ ] Reply-to on emails, so client replies reach the business owner instead of `noreply@`
- [ ] Rate limits on the AI routes
- [ ] "Repeat last invoice" for recurring clients
- [ ] Good / Better / Best quote options
- [ ] Website "Request a quote" form that feeds into the app
- [ ] Data-driven tips from the user's own history
- [ ] Tip dismissals saved to the database (currently saved in the browser)
- [ ] Official WhatsApp Business API for automatic reminders
- [ ] Multiple users per business
- [ ] Error tracking (Sentry)

### Out of scope for v1

Expense tracking, reports, inventory, multi-currency, native iOS/Android apps.

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

Yebo coaches owners while they work, so more quotes get accepted. Tips are:

- **Rule-based** in v1: each tip has an ID, a trigger condition, a message and an optional one-tap action.
- **One at a time**, dismissible ("Not now" for this visit, "Don't show again" remembered), and never blocking.
- Where a tip suggests a change, its button makes the change.

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

Dismissals are saved in the browser for now. The `dismissed_tips` table already exists for moving them to the database.

---

## Reminders and follow-ups

Reminders are one tap, not automatic, because v1 sends through WhatsApp links.

- The dashboard's **Needs your attention** list shows a reminder button for:
  - quotes sent or viewed with no reply after 3 days (and not expired)
  - invoices due within 2 days
  - invoices that are overdue
- The button opens the document at its reminder section, where the owner can draft a message with AI (or use a standard one) and open WhatsApp.
- Tapping **Open WhatsApp** records a `reminder_sent` event. A document is suggested again only 3 or more days later, and never after 3 reminders.
- The list comes from the `followups_due()` database function (migration `0002`).

A reminder is recorded when WhatsApp opens, not when the message is actually sent, because WhatsApp does not report that.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router, React), TypeScript, Tailwind CSS |
| Backend, database, auth, storage | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Hosting and DNS | Vercel |
| AI | Groq via the Vercel AI SDK (`ai`, `@ai-sdk/groq`) and `zod` for structured output |
| Email | Resend, sending from your own verified domain |
| PDF generation | `pdf-lib` |
| QR codes | `qrcode` |
| WhatsApp (v1) | Click-to-send `wa.me` links |
| Payments | PayFast hosted payment pages (planned; later Ozow or Stitch) |
| Scheduled jobs | Supabase or Vercel cron (planned) |
| Error tracking | Sentry (planned) |

> The stack is a recommendation. Swap pieces freely, but keep managed auth, hosted payments, and the PWA approach.

---

## Data model (overview)

- **businesses**: owner, branding, VAT settings, bank details, numbering prefix
- **clients**: name, email, WhatsApp number, notes
- **items**: autocomplete library per business
- **documents**: quotes and invoices in one table (`type`, `status`, totals, `public_token`, `source_quote_id`)
- **document_lines**: line items with their own snapshotted prices
- **payments**: amount, method, provider reference
- **events**: sent, emailed, viewed, accepted, declined, reminder_sent, paid
- **dismissed_tips**: which tips each user has dismissed (not used yet; tips use browser storage)

### Key design decisions

1. Quotes and invoices share one table; converting a quote creates a new row linked via `source_quote_id`, and a quote can only be converted once.
2. Money is stored as **integers in cents**, never floats. Totals are always calculated on the server.
3. Lines **snapshot** their price, so later edits to the items library never change old documents. Duplicating a document copies line totals exactly.
4. Document numbers are sequential per business and type, generated by a database function to avoid duplicates and gaps.
5. Clients open documents via an **unguessable public token**, read through a narrow server function.
6. **Row Level Security** on every table, keyed to `business_id`.
7. Owners can record only `sent`, `emailed`, `reminder_sent` and `paid` events. `viewed`, `accepted` and `declined` can only be written by the public client page, through a server function.
8. Payment webhooks are **idempotent** so a repeated notification never records a payment twice.
9. "Overdue" is computed from the due date, not stored.

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

# 2. Install dependencies
pnpm install        # npm install also works

# 3. Copy environment variables
cp .env.example .env.local

# 4. Run the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database setup

Run the migrations **in order** in the Supabase SQL Editor:

1. `supabase/migrations/0001_init.sql`: tables, row level security, numbering, public client page functions, logo storage
2. `supabase/migrations/0002_followups.sql`: lets owners record activity events and adds `followups_due()` for reminders
3. `supabase/migrations/0003_emailed_event.sql`: allows the `emailed` event type

Supabase may warn about "destructive operations" on `0002` and `0003`. They only drop and recreate a security policy, and do not touch your data.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=

GROQ_API_KEY=

RESEND_API_KEY=
RESEND_EMAIL_DOMAIN=yeboinvoices.com

# Planned
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
```

Never commit real keys. Keep `.env.local` in `.gitignore`. Set the same variables in Vercel under **Project Settings → Environment Variables**, then redeploy.

### Email setup (Resend)

1. Create an account at resend.com and add your domain under **Domains → Add Domain**.
2. Add the DNS records Resend shows (DKIM, plus SPF and MX on the `send` subdomain) wherever your domain's DNS is managed. Copy the record types exactly as Resend displays them. Do not remove existing records, such as those for a mailbox on the same domain.
3. Click **Verify** in Resend.
4. Create an API key with **Sending access** and set `RESEND_API_KEY` and `RESEND_EMAIL_DOMAIN`.

Until the domain is verified, Resend only lets you email your own account address. The free plan allows 3,000 emails a month and 100 a day.

### Supabase auth setup

In **Authentication > Providers**, enable Google (and keep Email on for magic links). Add `http://localhost:3000/auth/callback` and your production callback URL to the redirect URLs.

---

## Where things live

| Area | Location |
|---|---|
| Create quote or invoice screen | `src/app/app/quotes/new/` (`QuoteForm.tsx`, `VoiceQuoteAssistant.tsx`, `actions.ts`) |
| Document page, WhatsApp composer, document actions | `src/app/app/documents/` |
| Reminder logging | `src/app/app/reminders/actions.ts` |
| Dashboard | `src/app/app/page.tsx`, `DashboardView.tsx` |
| Public client page and PDF download | `src/app/d/[token]/` |
| AI routes | `src/app/api/voice-quote`, `src/app/api/tidy`, `src/app/api/ai-message` |
| PDF builder | `src/lib/pdf.ts` |

---

## Testing checklist

Run this after deploying, on a phone as well as a desktop browser.

1. **Create:** make a quote with two items, a description and a deposit. Save it, then send it.
2. **Voice:** record a quote and an invoice. Check items, per-unit prices and the description come through, and that "Use this draft" fills the form.
3. **Tidy:** type items with typos, then tap **Tidy up my wording** and **Tidy this**. Check numbers never change.
4. **Client view:** open the public link in a private window. Check the description, the line breaks and the Accept button.
5. **PDF:** download it and check apostrophes, dashes and long descriptions.
6. **Email:** email the document to yourself. Check the PDF is attached and Activity shows "Sent to client" and "Emailed to client".
7. **Reminders:** open an overdue invoice from the dashboard, draft a reminder, open WhatsApp, and check the dashboard button disappears.
8. **Payments:** mark an invoice paid. Check the status and Activity update.
9. **Conversion:** accept a quote, create an invoice from it, and tap the button again. Only one invoice should exist.

---

## Suggested build order (what is left)

1. End-to-end testing on real devices (the checklist above)
2. Reply-to on emails and rate limits on the AI routes
3. Online payments (PayFast first, with idempotent webhooks)
4. Automatic reminders (cron plus email, WhatsApp Business API later)
5. Repeat documents, templates and saved item packs
6. Production hardening: error tracking, audit events, backups and a small end-to-end test suite

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

Validate with the first 10 to 20 real users before locking prices. AI features (voice, tidy, drafts) have a small per-use cost, so keep that in mind when setting limits.

---

## Product principles

- Never make the user fill in a form they don't have to.
- Defaults over blanks: every field starts sensible.
- The client's view of a document reflects on our user's business, so it must look great.
- Tips help; they never nag or block.
- AI suggests; the owner decides. Nothing is sent or changed without a review.
- Money features must be boringly reliable.

---

## Contributing

This project is in early development. Contribution guidelines will be added later.

## License

To be decided.
