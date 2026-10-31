# Request links: QR codes, places, date and photos

## QR code and poster
Open **Quote requests** in the app. Under "QR code and links for each place" you see a QR code for your link.
- **Download QR** saves a PNG you can send to a printer or put on a sticker.
- **Print poster** opens a ready poster (business name, "Scan to ask for a quote", the QR code) and the print dialog.

## One link per place
Each place you share gets its own link: `https://yeboinvoices.com/r/<token>?s=facebook-page`.
There are ready-made places (Facebook, Instagram, WhatsApp, Google, website, email signature, van sticker, business card, flyer, Gumtree and more) and a box to make your own (letters, numbers and dashes).
The `s` value is stored on the request (`quote_requests.source`). `?utm_source=` and `?ref=` also work. The owner sees "From: <place>" on every request and a "Where requests came from" bar list.

## Date and photos on the form
- **When would you like it done?** (optional) is stored in `quote_requests.preferred_date` and shown on the request.
- **Photos of the job** (optional, up to 3) are shrunk in the client's browser to about 1280 px, posted to `/api/request/<token>`, checked by their real bytes, and stored in the private `request-photos` bucket. The owner sees them through links that expire after an hour.

## Setup
Run `supabase/migrations/0029_request_extras.sql` in the Supabase SQL editor, then deploy.

## Not built yet: calendar booking
This feature is a quote request, not a time-slot booking. See the chat notes on adding site-visit slots later.
