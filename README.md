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
- [ ] Fully automatic reminders (scheduled, no tap needed)

### Planned

- [ ] Rate limits on the AI routes
- [ ] Pay a quote's deposit online, and part payments
- [ ] A confirmation email to the client when they accept a quote
- [ ] Ozow or Stitch for instant EFT
- [ ] "Repeat last invoice" for recurring clients
- [ ] Good / Better / Best quote options
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

- **businesses**: owner, branding, contact details, VAT settings, bank details, numbering prefix
- **clients**: name, email, WhatsApp number, notes
- **items**: autocomplete library per business
- **documents**: quotes and invoices in one table (`type`, `status`, totals, `public_token`, `source_quote_id`)
- **document_lines**: line items with their own snapshotted prices
- **payments**: amount, method (`payfast`, `eft`, `cash`), provider reference, `thanked_at`
- **payment_attempts**: one row per tap of Pay now. Its id is the PayFast `m_payment_id`. Tracks status and whether the receipt and owner alert were sent
- **payfast_settings**: each business's PayFast credentials (server-only, no browser access)
- **events**: sent, emailed, viewed, accepted, declined, reminder_sent, paid
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
| PDF builder | `src/lib/pdf.ts` |

---

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
