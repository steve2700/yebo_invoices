# Request a Quote: how it works, start to finish

A plain-English walkthrough of the Yebo request link, told as one contractor's day. The owner's view comes first; a short technical section at the end is for whoever maintains the code.

## The idea in one minute

Every business gets **one private web address** where a client can describe a job. The client types a few lines, the owner is notified, and one tap turns their words into the start of a quote. No account, no app, no back-and-forth to find out what they need.

- **Before:** a client WhatsApps "how much for a geyser?". You ask five questions over two days. Half the people go quiet.
- **After:** you send one link. They answer once, in their own words. You see it the moment it arrives.

## The example

Sipho runs **Mokoena Plumbing** in Midrand and is already set up on Yebo. Thabo is a homeowner in Sandton with a leaking geyser who got Sipho's number from a neighbour.

### 1. Sipho finds his link
Open **Quote requests** in the sidebar (on a phone, tap the card on the home screen). At the top is **Your request link**, for example `yeboinvoices.com/r/a1b2c3d4e5f6g7`. It is private and never changes. Anyone who has it can ask for a quote, and nobody can see anything else through it.

### 2. Sipho sends it
**Share on WhatsApp** opens WhatsApp with this already written:

> Hi, this is Mokoena Plumbing. Tell me about the job here and I will send you a clear quote: yeboinvoices.com/r/a1b2c3d4e5f6g7

The same link can go in a WhatsApp status, on the Facebook page, on a sticker on the bakkie or at the bottom of emails. **Copy link** does that.

### 3. Thabo fills in the page
He sees a clean page with the business name and logo, and a short form:

| Box | Thabo types | Required? |
|---|---|---|
| Your name | Thabo Dlamini | Yes |
| WhatsApp number | 082 123 4567 | A WhatsApp number or an email is needed |
| Email | thabo@example.com | Optional |
| Where is the job? | Sandton, Bryanston | Optional |
| What do you need done? | Geyser is leaking from the top pipe. 150 litre, in the garage. Need it replaced this week. | Yes |

He taps **Ask for a quote** and sees **Request sent**. No account, no download.

### 4. Sipho is told within seconds
1. An **email**: "New quote request from Thabo Dlamini", with the details and a button into Yebo.
2. A **card** at the top of the home screen: "1 new quote request".
3. The request at the top of **Quote requests**, under **New**.

### 5. Sipho chooses
| Button | What it does |
|---|---|
| **Make a quote** | Saves Thabo as a client (or matches an existing one) and opens the new-quote form with the job already filled in. |
| **WhatsApp** | Opens a chat with a polite "I have seen your request and will send your quote shortly" message. |
| **Email** | Opens a reply to Thabo's email, if he gave one. |
| **Dismiss** | Removes it, for example spam or out of area. |

### 6. Sipho makes the quote
**Make a quote** opens the normal form with Thabo selected and the location and description filled in. Sipho adds his line items, checks the total and taps **Create & send**. This is the usual flow, including voice quotes, the tips engine and saved prices. The request moves to **Already quoted**.

### 7. From quote to money
Thabo views and accepts the quote link. Sipho turns it into an invoice. Thabo pays through the link, or Sipho records EFT or cash. If Thabo goes quiet, the existing reminders and follow-ups take over.

### 8. The numbers
Every quote sent feeds **Your numbers** on the home screen: quotes sent versus last month, quotes accepted, and the 90-day win rate.

## What clients can and cannot do
They can only send a request. They cannot see other clients, quotes or prices. Their details go only to the business whose link they used. The page asks for no password.

## Spam protection
- A hidden field real people never see; bots that fill it are ignored.
- At most **15 requests per hour** per business. After that the client is asked to WhatsApp instead.
- The same name sending the same words twice within 10 minutes counts once.
- Text length is capped, and phone numbers and emails are checked before saving.

## Setting it up (one time)
1. Run `supabase/migrations/0028_requests_and_error_hits.sql` once in the Supabase SQL Editor.
2. Deploy.
3. Open **Quote requests**. The link is already there.

Test it: open your own link in a private window, fill it in as a pretend client, then check the email, the home card and the list entry.

## When something looks wrong
| What you see | Likely reason | What to do |
|---|---|---|
| "Not set up yet" on Quote requests | 0028 SQL not run | Run it and refresh |
| The link says it is not valid | Typed wrongly or cut off | Copy it again from Quote requests |
| No email arrived | Business email missing, or spam | Check spam. The request is in the list either way |
| Client says it will not send | Hourly limit, or no signal | Ask them to retry, or take the job on WhatsApp |

## For developers

| Piece | Where |
|---|---|
| Link column, requests table, RLS | `supabase/migrations/0028_requests_and_error_hits.sql` |
| Public page and form | `src/app/r/[token]/page.tsx`, `RequestForm.tsx`, `actions.ts` |
| Input cleaning and helpers | `src/lib/requests.ts` |
| Owner list, Make a quote, Dismiss | `src/app/app/requests/page.tsx`, `actions.ts`, `CopyLink.tsx` |
| Home card | `src/app/app/RequestsReady.tsx` (used in `src/app/app/page.tsx`) |
| Quote form prefill | `src/app/app/quotes/new/page.tsx` (reads `?request=<id>`) |

**Data.** `businesses.request_token` is a unique random 14-character token, set by default for every business. `quote_requests` holds `business_id`, `name`, `whatsapp`, `email`, `location`, `details`, `status` (`new`, `quoted`, `dismissed`), `client_id` and `created_at`. Row level security (`owns_business`) lets an owner see only their own requests; the public form never touches the table directly.

**Flow.**
1. `GET /r/[token]` finds the business with the service-role client and renders the form (404 for an unknown token, `noindex`).
2. `submitRequest` validates the token, checks the hidden field, runs `cleanRequest`, applies the 15-per-hour and 10-minute duplicate checks, inserts the row and emails the owner through Resend. An email failure never fails the request.
3. The owner's pages read the table with the normal signed-in client, so RLS applies.
4. `startQuoteFromRequest` matches a client by the last nine digits of the phone or by name, creates one if needed, sets the request to `quoted`, and redirects to `/app/quotes/new?request=<id>`.
5. The new-quote page passes `initial` to the existing `QuoteForm`, so the form itself is unchanged.

**Security.** The token is the only gate on the public page, so it is long and random. The service-role client is used only in the public page and action, for narrow reads and one insert. All text is escaped by React, and email content goes through `renderEmail`.

**Ideas for later.** A way to rotate the link; a source tag such as `?s=facebook` per link; a voice-note option on the public page; a count of requests that became quotes next to the win rate.
