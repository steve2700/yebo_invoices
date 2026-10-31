# Site visits

On **Quote requests**, each new request has "Propose a site visit". Pick a day and time (South African time) and press the button.
- If the client left an email, they get an email with the link. Otherwise use **Send link on WhatsApp**.
- The link (`/v/<token>`) shows the proposed time. The client taps **Yes, that works** or **Pick another day** and types what suits them.
- You get an email either way, and the request shows Confirmed, Waiting for reply, or Wants another day with their note.
- **Add to my calendar** gives the client a `.ics` file (one hour, with a reminder an hour before).

Setup: run `supabase/migrations/0030_site_visits.sql`, then deploy. Columns added to `quote_requests`: `visit_at`, `visit_status`, `visit_note`, `visit_responded_at`, `visit_token`.
