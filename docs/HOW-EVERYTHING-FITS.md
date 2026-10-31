# How Yebo Invoices fits together

One page to read before you change anything. Last updated 31 October 2026.

## The journey of one job

1. **A client finds the business.** Through a link the owner shared (WhatsApp, Facebook, a van sticker QR code). Each place has its own link: `/r/<token>?s=<place>`.
2. **The client asks for a quote** on that page: name, WhatsApp, where, what, an optional date and up to 3 photos. The owner gets an email and a card on the dashboard.
3. **Site visit (optional).** The owner proposes a day and time. The client confirms or suggests another day on `/v/<token>` and can add it to their calendar. The day before, a confirmed client with an email gets a reminder. The dashboard lists visits in the next 7 days.
4. **The owner makes the quote** with one tap from the request. The client, the job and the place are already filled in.
5. **The client answers** on `/d/<token>`: Accept (types their full name), Ask for a change, or Decline (with a reason).
   - Accept: the owner is emailed at once. The client gets their own copy by email if we have their address.
   - Change request: the owner taps **Revise this quote**. When the revised quote is sent, the old one closes and its link points to the new one.
   - Decline: the owner is emailed with the reason. The client can undo for 24 hours. After a "price" decline (14 days) or "not needed any more" (30 days) the owner gets one email with a ready WhatsApp message.
   - No answer: follow-up emails, then an expiry warning. An expired quote has a **Yes, I still want this** button; the owner extends it by 14 days.
6. **Invoice and payment.** The owner turns the accepted quote into an invoice. The client pays by card (PayFast) or EFT and can upload proof. Reminders go out before and after the due date.
7. **Numbers.** The home screen shows money collected, quotes sent and accepted, and the win rate. The Win rate page shows why quotes were lost.

## Pages

| Address | Who | What |
| --- | --- | --- |
| `/r/<token>` | Anyone with the link | Ask for a quote |
| `/v/<token>` | The client | Confirm or change a site visit; `/v/<token>/ics` is the calendar file |
| `/d/<token>` | The client | View, accept, decline, pay a quote or invoice |
| `/app` and below | The owner (signed in) | Dashboard, Quote requests, Quotes and invoices, Reminders, Tenders, Win rate, VAT report, Settings |
| `/admin` | The founder only | Overview, People to follow up, Growth, Revenue, Survey, Errors, Reminder emails |

## Emails that go out

| Email | To | When |
| --- | --- | --- |
| New quote request | Owner | A client fills in a request link |
| Site visit proposal | Client (if email) | Owner proposes a visit |
| Site visit answer | Owner | Client confirms or asks for another day |
| Visit reminder with calendar file | Client (if email) | The day before a confirmed visit |
| Quote accepted / declined / change asked | Owner | Client answers |
| Your copy of the accepted quote | Client (if email) | Client accepts |
| Still wants this | Owner | Client taps the button on an expired quote |
| Check in with your client | Owner | 14 or 30 days after a price or timing decline |
| Quote and invoice reminders | Client | Daily job, by the rules on the Reminders page |
| Stalled sign-up nudges | Owner of the account | Only when `NUDGES_ENABLED=true` |

## The daily job

`src/app/api/cron/reminders/route.ts` runs once a day (06:00 UTC, 08:00 in South Africa, set in `vercel.json`). In order: quote and invoice reminders, expiry warnings, the morning list, repeating invoices, stalled sign-up nudges, site visit reminders, win-back check-ins.

## Setup checklist

Run these migrations in Supabase (SQL editor), in order, if they are not run yet:

| File | Adds |
| --- | --- |
| `0026_admin_tracking.sql` | Error log, sign-in funnel, nudges |
| `0027_visits.sql` | Visitor counts by source |
| `0028_requests_and_error_hits.sql` | Request links and quote requests, 24-hour error counts |
| `0029_request_extras.sql` | Source, preferred date and photos on requests; private `request-photos` storage |
| `0030_site_visits.sql` | Site visit columns |
| `0031_visit_reminders.sql` | Remembers the day-before reminder was sent |
| `0032_quote_answers.sql` | Revised quotes, "still want this", win-back, and the rule that closes a replaced quote |

Environment variables (Vercel, Settings, Environment Variables): `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_EMAIL_DOMAIN`, `CRON_SECRET`, `SURVEY_NOTIFY_EMAIL`, `BILLING_ENFORCED` (turns the paywall on), `NUDGES_ENABLED` (turns stalled sign-up emails on).

## Rules we keep

- **Simple, not simpler.** One obvious next step on each screen. Nothing hidden that the owner needs.
- **People are emotional.** Saying yes is a commitment (typed name). Saying no is easy and can be undone. Every no is a question we can answer later.
- **We never hold money.** Clients pay the business directly.
- **Nothing is sent to a client automatically that the owner would be embarrassed by.** Win-back messages go to the owner first.
- **Patches check before they change.** Every delivered patch refuses to run if your files differ from what it expects.

## More detail

- [Request a quote link, step by step](REQUEST-A-QUOTE.md)
- [QR codes, places, date and photos](REQUEST-LINKS-PLUS.md)
- [Site visits](SITE-VISITS.md)
