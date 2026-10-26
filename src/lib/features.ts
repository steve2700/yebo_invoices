// One place for what Yebo does. The landing page sections and the /features pages both read from here,
// so a feature is written once. Only list something here when it exists in the app today.
// Plan wording matches src/lib/plans.ts.

export type Feature = { title: string; text: string; plan?: string };
export type FeatureScreen = { src: string; alt: string };
export type FeatureGroup = {
  slug: string;
  name: string; // short name for menus and links
  title: string; // heading on the landing page and on the feature page
  promise: string; // one plain sentence
  intro: string;
  screens: FeatureScreen[];
  features: Feature[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    slug: "write-quotes",
    name: "Write quotes",
    title: "Write the quote in a few minutes",
    promise: "Say the job out loud, check the draft, send it.",
    intro:
      "Most of the time on a quote goes on typing and second guessing. Yebo takes the typing off you and points out what is missing, and you stay in charge of every price and every word.",
    screens: [
      { src: "/screens/quote-voice.png", alt: "Yebo new quote screen with the voice assistant" },
      { src: "/screens/quote-items.png", alt: "Yebo quote items with quantities, unit prices, VAT and the total" },
    ],
    features: [
      {
        title: "Voice quotes",
        text: "Record a voice note with the client, the work and the prices. Yebo turns it into a draft you can edit. If a price looks wrong, like R1.80 where you meant R1 800, it warns you. Nothing is sent until you review it.",
        plan: "1 a month on The Side-Hustler, 5 on The Real Business, unlimited on The Industry King",
      },
      {
        title: "Tidy up my wording",
        text: "Fixes spelling and tidies item lines, the job name and the description. You see before and after, and it never changes a number.",
      },
      {
        title: "Check before you send",
        text: "A short checklist flags a missing email or WhatsApp number, vague lines like “labour”, and items with no price. Each one has a button that takes you to the fix.",
      },
      {
        title: "Start from a similar job",
        text: "Quoting something you have done before? Yebo offers the items and wording from your last one, ready to change.",
      },
      {
        title: "Tips while you write",
        text: "Short suggestions on the quote screen: ask for a deposit on a big job, split one huge line into materials and labour, add a due date, name the job. You can dismiss any of them.",
      },
      {
        title: "Not included, assumptions and timeline",
        text: "Say what is outside the price and when work starts, so there are no surprises after the yes.",
      },
      {
        title: "Good, better, best",
        text: "Put options on one quote. Your client picks one and accepts it, and the invoice is made from the option they chose.",
      },
      {
        title: "Photos on the quote",
        text: "Add up to 6 photos of the site, the old unit or a sketch, so your client sees what you saw.",
      },
    ],
  },
  {
    slug: "send-and-track",
    name: "Send and track",
    title: "Send it, then know what happens",
    promise: "You see when it is opened, and how your client answers.",
    intro:
      "Your client opens a link on their phone. No account, no app, no PDF that will not open. You get told when they look, and what they decide.",
    screens: [{ src: "/screens/quote-client.png", alt: "Yebo quote page for a client with the client details" }],
    features: [
      {
        title: "WhatsApp or email",
        text: "WhatsApp opens with the message written and you tap send. Email goes out with the PDF attached, and replies go to your business email.",
      },
      {
        title: "Real “viewed” tracking",
        text: "Link previews, robots and your own devices do not count. When Yebo says “Opened 3 times”, a person looked.",
      },
      {
        title: "Accept with a typed name",
        text: "Your client types their name to accept. It is saved as a signature on the page, the PDF and the email you get.",
      },
      {
        title: "Ask for a change, or say no",
        text: "Clients can ask for a change on the page, or decline and give a reason. They can undo a decline for 24 hours, and you can reopen a declined quote at any time.",
      },
      {
        title: "Why hire you",
        text: "Show the year you started, a one line about you, photos of past work, trust ticks such as fully insured or licensed, up to 5 real customer reviews and a Google reviews link. Anything you leave blank is not shown.",
        plan: "Work photos: 1 on The Side-Hustler, 3 on The Real Business, 6 on The Industry King",
      },
      {
        title: "Follow ups",
        text: "Every morning Yebo lists the clients to nudge and emails it to you. Tap a name, WhatsApp opens with the message written, and you press send from your own number. A bell in the app shows how many are waiting. Yebo can also email reminders to your clients for you, 3 days apart, up to 3 times.",
        plan: "The Real Business and up",
      },
      {
        title: "Told when they answer",
        text: "You get an email the moment a client accepts or declines, with a button to make the invoice or send a friendly follow up.",
      },
    ],
  },
  {
    slug: "get-paid",
    name: "Get paid",
    title: "Get paid without the awkward texts",
    promise: "Clients pay by card or instant EFT. You both get told.",
    intro:
      "Each business connects its own PayFast account, so the money goes from your client to you. Yebo never holds it.",
    screens: [{ src: "/screens/home-dashboard.png", alt: "Yebo home screen with money collected, outstanding and overdue invoices" }],
    features: [
      {
        title: "Pay now, by card or instant EFT",
        text: "A Pay now button on every invoice, through PayFast. An invoice is only marked paid when PayFast confirms the payment, never because someone landed on a thank you page.",
      },
      {
        title: "Deposits",
        text: "When a client accepts a quote that asks for a deposit, they see the exact amount to pay. The deposit is credited on the invoice, so they only pay the balance.",
      },
      {
        title: "EFT, with proof",
        text: "Your bank details sit on the page with copy buttons. Clients can tap “I have paid”, upload proof of payment, or promise a date. Reminders pause until that date.",
      },
      {
        title: "Receipts and alerts",
        text: "Your client gets a receipt by email. You get “You’ve been paid”, with the PayFast fee and what lands in your account, and a one tap WhatsApp thank you.",
      },
      {
        title: "Reminders for invoices",
        text: "Due soon and overdue invoices go on your “ready to send” list with the message written. A client who promises a date is left alone until that day, and part payments and credit notes are counted, so the message asks for what is really owed.",
        plan: "The Real Business and up",
      },
      {
        title: "Customer statement",
        text: "One private link per client that lists everything they owe, with a pay button on each invoice.",
      },
      {
        title: "Repeat monthly invoices",
        text: "A draft invoice is made on the day you choose and you are emailed to check it. Nothing goes to the client by itself.",
      },
      {
        title: "Credit notes",
        text: "Fix a mistake or give a discount with a numbered credit note. It lowers what the client owes and is not counted as income.",
      },
    ],
  },
  {
    slug: "know-your-numbers",
    name: "Your numbers",
    title: "Know where the month stands",
    promise: "What is collected, what is owed, and why quotes are lost.",
    intro:
      "“Busy” is a feeling. Yebo gives you the figures, so you can see what is working and what to chase this week.",
    screens: [
      { src: "/screens/home-targets.png", alt: "Yebo monthly targets for money collected and quotes sent" },
      { src: "/screens/home-dashboard.png", alt: "Yebo home screen with collected, outstanding and overdue" },
    ],
    features: [
      {
        title: "Home screen",
        text: "Collected this month, outstanding and overdue, plus who has paid and what needs your attention today.",
      },
      {
        title: "Monthly targets",
        text: "Set a money target and a quotes target. See your progress, the days left, and a gentle suggestion for what to do next.",
      },
      {
        title: "Quote results",
        text: "How many quotes you win, what they were worth, and the reasons clients give when they say no.",
      },
      {
        title: "VAT sales summary",
        text: "Every invoice, or every payment, for any period, with the VAT on it, as a file for your accountant. It covers sales only. It is not a VAT201 return.",
        plan: "The Industry King",
      },
      {
        title: "Activity on every document",
        text: "Sent, emailed, viewed, accepted, declined, reminded and paid, with times in South African time.",
      },
    ],
  },
  {
    slug: "built-for-south-africa",
    name: "Built for South Africa",
    title: "Made for how South African trades work",
    promise: "Rands, VAT, EFT, PayFast and WhatsApp.",
    intro:
      "A lot of invoicing software was built for somewhere else. Yebo starts from how you actually get quoted and paid here.",
    screens: [{ src: "/screens/settings-defaults.png", alt: "Yebo settings with quote defaults and business details" }],
    features: [
      {
        title: "Rands and VAT",
        text: "Amounts in rand. VAT is shown for VAT registered businesses and left out for the rest.",
      },
      {
        title: "PayFast and EFT",
        text: "Card and instant EFT through PayFast, plus manual EFT and cash that you can record yourself.",
      },
      {
        title: "Bank details done properly",
        text: "Pick your bank from a list of 16 and its universal branch code is filled in. You can still edit it.",
      },
      {
        title: "WhatsApp first",
        text: "Send, follow up and say thank you where your clients already are.",
      },
      {
        title: "Your logo and colours",
        text: "Quotes, invoices and PDFs carry your brand, so a client sees you and not a template.",
      },
      {
        title: "Help from a person",
        text: "Call, WhatsApp or email support from inside the app, 8am to 5pm South African time.",
      },
      {
        title: "Works like an app",
        text: "Add Yebo to your phone’s home screen, free, with no app store. Clients do not install anything.",
      },
    ],
  },
];

export function getGroup(slug: string): FeatureGroup | undefined {
  return FEATURE_GROUPS.find((g) => g.slug === slug);
}

export const FEATURE_COUNT = FEATURE_GROUPS.reduce((n, g) => n + g.features.length, 0);
