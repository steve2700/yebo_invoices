# How Yebo Invoices works

These diagrams are written in Mermaid, so GitHub draws them for you. If you read this file somewhere that shows plain text, paste a diagram into [mermaid.live](https://mermaid.live) to see it.

Back to the [README](../README.md). The database setup, environment variables and feature list live there.

## 1. The big picture

```mermaid
flowchart LR
  subgraph People
    O["Business owner<br/>phone or browser, installable app"]
    C["Customer<br/>opens a link, no login"]
  end

  subgraph Vercel["Vercel: the Next.js app"]
    APP["Owner app<br/>/app/..."]
    PUB["Customer pages<br/>/d/token, /s/token"]
    API["API routes<br/>/api/..."]
    CRON["Daily jobs<br/>vercel.json"]
  end

  subgraph Supabase
    DB[("Postgres<br/>row level security")]
    AUTH["Auth<br/>Google and email link"]
    STO["Private storage<br/>proofs, quote photos, tender files"]
  end

  PF["PayFast<br/>card and instant EFT"]
  RS["Resend<br/>email"]
  AI["Groq AI<br/>voice, tidy, tender reading"]
  ET["eTenders<br/>public tender feed"]

  O --> APP
  C --> PUB
  APP --> DB
  APP --> AUTH
  PUB --> DB
  APP --> API
  PUB --> API
  API --> DB
  API --> STO
  API --> AI
  API --> RS
  API <--> PF
  CRON --> API
  CRON --> ET
  CRON --> RS
```

The owner app uses the signed-in user, so row level security keeps each business's data private. Customer pages never log in: they use a long random token in the link and call security-definer database functions that return only what that one document needs. The service-role key is used on the server only (`src/lib/supabase/admin.ts`), for jobs and webhooks that have no signed-in user.

## 2. The life of a quote and an invoice

```mermaid
stateDiagram-v2
  direction LR
  [*] --> draft
  draft --> sent: owner sends it
  sent --> viewed: customer really opens it
  sent --> accepted: customer signs and accepts
  viewed --> accepted: customer signs and accepts
  sent --> declined: customer declines, picks a reason
  viewed --> declined
  declined --> sent: customer undoes within 24 hours, or owner reopens
  sent --> expired: expiry date passes
  accepted --> invoice: owner converts the quote
  state invoice {
    [*] --> inv_sent
    inv_sent --> partially_paid: part payment
    inv_sent --> paid: full payment
    partially_paid --> paid
  }
  paid --> [*]
```

A quote that is accepted can take a deposit first (online or EFT). When it becomes an invoice the deposit is credited, so the customer only pays the balance. Sent documents are locked. To correct one, duplicate it, fix the copy and send that.

## 3. What the customer can do on the link

```mermaid
sequenceDiagram
  autonumber
  participant Own as Owner
  participant App as Yebo
  participant Cus as Customer
  participant Mail as Email

  Own->>App: Send quote (WhatsApp or email with PDF)
  Cus->>App: Opens /d/token
  Note over App: A beacon waits 2.5 seconds, then counts one real view.<br/>Robots, link previews and the owner's own devices are skipped.
  App-->>Own: Status becomes "Opened", views are counted
  alt Accept
    Cus->>App: Types full name, confirms
    App-->>Own: Email: accepted and signed by name
    App-->>Cus: Pay your deposit
  else Ask for a change
    Cus->>App: Writes what to change
    App-->>Own: Email with the customer's words
  else Decline
    Cus->>App: Picks a reason, confirms
    App-->>Own: Email with the reason
    Cus->>App: Can undo for 24 hours
  end
  Note over Cus,App: Invoices instead offer Pay now, copy bank details,<br/>"I have paid by EFT" with optional proof, or "I will pay on this day".
```

## 4. How money moves

```mermaid
flowchart TD
  A["Customer opens an invoice"] --> B{"How will they pay?"}
  B -->|"Pay now"| P["Yebo creates a payment attempt<br/>and sends them to PayFast"]
  P --> N["PayFast calls /api/payfast/notify"]
  N --> V{"Signature, source and<br/>amount all check out?"}
  V -->|"No"| X["Rejected and logged"]
  V -->|"Yes"| R["Payment recorded once<br/>status becomes paid or part paid"]
  R --> E1["Receipt email to the customer<br/>plus a review request when fully paid"]
  R --> E2["Alert email to the owner"]
  B -->|"EFT"| Q["Customer copies the bank details<br/>and uses the invoice number as reference"]
  Q --> Cl["Taps I have paid by EFT<br/>can attach proof, photo or PDF"]
  Cl --> M["Owner gets an email and sees the proof<br/>link works for 1 hour"]
  M --> Chk["Owner checks the bank,<br/>taps They paid by EFT"]
  Chk --> R2["Payment recorded, status paid"]
  R2 --> E3["Receipt email to the customer"]
  B -->|"Cannot pay today"| Pr["Customer picks a date, up to 30 days away"]
  Pr --> Pause["Automatic reminders pause until that date"]
```

Yebo never holds money. PayFast pays out to the business's own PayFast account, and EFT goes straight to the business's bank.

## 5. What runs every day

```mermaid
flowchart TD
  T0["04:30 UTC, 06:30 in SA<br/>/api/cron/tender-feed"] --> T1["Read the last 3 days of tenders from eTenders"]
  T1 --> T2["Save to tender_feed<br/>delete tenders closed over a week ago"]
  T2 --> T3["Auto-draft up to 5 matching tenders per owner<br/>and email them once"]

  R0["06:00 UTC, 08:00 in SA<br/>/api/cron/reminders"] --> R1["followups_due:<br/>quotes with no reply, invoices due soon or overdue<br/>3 days apart, at most 3"]
  R1 --> R2{"Owner switched on<br/>automatic reminders<br/>and the plan allows it?"}
  R2 -->|"Yes"| R3["Skip invoices with a promised payment date,<br/>email the customer, record the reminder"]
  R0 --> R4["Quotes that expire in 1 to 2 days<br/>get one expiry reminder"]
  R0 --> R5["Repeating invoices due today:<br/>make a draft copy and email the owner to review and send"]
```

The recurring-invoice job runs inside the reminders job, so it does not use an extra Vercel cron slot. It can also be triggered by hand at `/api/cron/recurring` with the `Authorization: Bearer <CRON_SECRET>` header.

## 6. The Tender Engine

```mermaid
flowchart TD
  F["Tender hub<br/>eTenders feed, filtered by trade and province"] --> S["Start a bid<br/>details and document links copied across"]
  S --> A["Read the documents for me<br/>/api/tenders/id/auto-import"]
  A --> D["Download each hub document<br/>PDF or Excel, max 8 files, 30 MB each"]
  D --> K["Classify by name:<br/>pricing, RFQ, scope, other"]
  K --> I["Read how to submit<br/>email or portal, closing time, RFQ number,<br/>validity, VAT, who to ask, what to return"]
  K --> X{"Excel BOQ found?"}
  X -->|"Yes"| XL["Read exactly"]
  X -->|"No"| PG["Find the pricing pages<br/>inside the RFQ"]
  PG --> TB{"Small clean pricing table?"}
  TB -->|"Yes"| EX["Read exactly, no AI"]
  TB -->|"No"| AIR["AI reads the pricing pages in pieces<br/>then rule-based tidy-up"]
  XL --> L["Lines saved<br/>unsure ones flagged"]
  EX --> L
  AIR --> L
  I --> CARD["How to submit card<br/>filled only from the documents"]
  L --> ED["Owner enters rates only,<br/>checks flagged lines"]
  CARD --> ED
  ED --> V{"Compliance vault ready?<br/>CSD, SARS, B-BBEE, COIDA<br/>not expiring before closing"}
  V -->|"No"| W["Warnings and links to where to get each one"]
  V -->|"Yes"| SUB{"Submit by"}
  SUB -->|"Email"| EM["Merged bid email with the priced Excel"]
  SUB -->|"Portal"| PT["Download the priced Excel<br/>upload it on the portal"]
```

Rules, not training: the reader in `src/lib/tender-docs.ts` is plain code tested against real tender PDFs. It only fills in what is literally written in the documents. The AI is a fallback for large or unusual pricing tables, and every AI-read line is flagged for the owner to check.

## 7. Who counts as a "customer view"

```mermaid
flowchart TD
  L["Someone opens the customer link"] --> J{"Is JavaScript running<br/>in a real browser?"}
  J -->|"No: robot or link preview"| N1["Not counted"]
  J -->|"Yes"| O{"Marked as the owner's device?<br/>or signed in as the owner?<br/>or the Open client view button?"}
  O -->|"Yes"| N2["Not counted"]
  O -->|"No"| W["Wait 2.5 seconds"]
  W --> D{"Another view in the last 30 minutes?"}
  D -->|"Yes"| N3["Not counted again"]
  D -->|"No"| Y["Counted: status Opened, activity feed updated"]
```

An owner who opens the link in a private window or on someone else's phone is still counted as a customer, because Yebo cannot tell the difference there.

## 8. Data model

```mermaid
erDiagram
  businesses ||--o{ clients : has
  businesses ||--o{ documents : owns
  businesses ||--o| compliance_vault : keeps
  businesses ||--o{ tenders : bids
  businesses ||--o{ recurring_invoices : schedules
  clients ||--o{ documents : receives
  documents ||--o{ document_lines : contains
  documents ||--o{ payments : "paid by"
  documents ||--o{ events : logs
  documents ||--o{ document_messages : "client messages"
  documents ||--o{ document_photos : shows
  documents ||--o| recurring_invoices : "repeats from"
  documents ||--o{ payment_attempts : starts
  tenders ||--o{ tender_lines : prices
  tenders ||--o{ tender_sources : reads
  tender_feed ||--o{ tenders : "started from"
```

`document_messages` holds the customer's change requests, proofs of payment, payment promises and typed signatures. Each business also has `subscriptions`, `monthly_targets`, `payfast_settings` and `tender_preferences`. The full list is in the migrations table below.

## 9. Where the private files live

| Storage bucket | What is in it | Who can open it |
|---|---|---|
| `logos` | Business logos and work photos | Public (shown on customer pages) |
| `payment-proofs` | Proof of payment from customers | Owner only, through a link that lasts 1 hour |
| `quote-photos` | Photos the owner attaches to a quote | Customer pages and the owner, through links that last 1 hour |
| `tender-files` | Tender documents and compliance files | The owner who uploaded them |

## 10. Security in one place

| Rule | How it is kept |
|---|---|
| One business can never see another's data | Row level security on every table, using `owns_business()` |
| Customers need no account | A long random token per document (`/d/token`) and per client (`/s/token`), read through security-definer functions |
| Uploads are checked | The real file type is read from the first bytes. Size and count limits apply |
| Robots cannot fake views or claims | Views come from a browser beacon, claims and promises are rate limited in the database |
| Free text from strangers stays out of email | Decline reasons are a fixed list. Change requests are length limited and escaped |
| Daily jobs are private | They need `Authorization: Bearer <CRON_SECRET>` |
| Money never passes through Yebo | PayFast pays the business directly. EFT goes to the business's bank |
