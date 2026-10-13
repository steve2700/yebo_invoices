// The one paid plan. Change the price here and it changes everywhere it is shown.
export const PRO_PRICE_RAND = 199;
export const PRO_PRICE_LABEL = `R${PRO_PRICE_RAND}`;

// What a Pro subscriber gets, in plain English. Only list things that exist today.
export const PRO_FEATURES = [
  "As many quotes and invoices as you need",
  "Speak a quote and Yebo writes it for you",
  "Send by email with a PDF, or by WhatsApp in one tap",
  "See when your client opens, accepts or pays",
  "Clients pay online by card or instant EFT (PayFast)",
  "Instant \"you've been paid\" alerts for you and a receipt for your client",
  "Monthly targets with a progress bar, so you can see how you are doing",
  "Friendly reminders for quotes and invoices that go quiet",
  "Your logo and colours on every document",
] as const;
