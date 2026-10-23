// The three plans. Change a price or a limit here and it changes everywhere it is shown or enforced.
// Only list a feature under "features" once it really exists. Ideas that are not built yet go under "comingSoon".

export type PlanId = "side" | "real" | "king";

export type Plan = {
  id: PlanId;
  name: string;
  priceRand: number;
  tagline: string;
  who: string;
  revenue: string;
  roast: string;
  docsPerMonth: number | null; // null = unlimited (fair use applies)
  voicePerMonth: number | null; // null = unlimited (fair use applies)
  reminders: boolean;
  workPhotos: number; // photos of past work shown on the quote link
  recommended?: boolean;
  features: string[];
  comingSoon: string[];
  catchLine?: string;
};

export const PLAN_ORDER: PlanId[] = ["side", "real", "king"];

export const PLANS: Record<PlanId, Plan> = {
  side: {
    id: "side",
    name: "The Side-Hustler",
    priceRand: 49,
    tagline: "Costs less than a pie and a cold Coke.",
    who: "Casual side-hustles, weekend handymen and anyone who is not busy yet.",
    revenue: "Making under R10 000 a month",
    roast: "Done writing quotes on the back of a cigarette box? Start here.",
    docsPerMonth: 10,
    voicePerMonth: 1,
    reminders: false,
    workPhotos: 1,
    features: [
      "Up to 10 quotes and invoices a month",
      "1 voice quote a month: speak it and Yebo fills it in",
      "Send by email with a PDF, or on WhatsApp in one tap",
      "See when your client opens, accepts or pays",
      "Clients can pay online by card or instant EFT",
      "Your logo and colours on every document",
      "Monthly targets with a progress bar",
      "1 photo of your work on your quote link",
    ],
    comingSoon: [],
    catchLine: "You get 1 voice quote a month. The moment real work shows up, you will upgrade before your pie gets cold.",
  },
  real: {
    id: "real",
    name: "The Real Business",
    priceRand: 199,
    tagline: "Just right for a real business.",
    who: "Electricians, plumbers, solar installers and contractors with steady monthly work.",
    revenue: "Making R10 000 to R50 000 a month",
    roast: "You are not a hobbyist, so stop quoting like one.",
    docsPerMonth: 50,
    voicePerMonth: 5,
    reminders: true,
    workPhotos: 3,
    recommended: true,
    features: [
      "Up to 50 quotes and invoices a month",
      "5 voice quotes a month",
      "Everything in The Side-Hustler",
      "One-tap WhatsApp reminders for quotes and invoices that go quiet, with the message already written",
      "All your clients and past quotes in one place",
      "Up to 3 photos of your work on your quote link",
      "Automatic email reminders to clients who go quiet",
    ],
    comingSoon: ["Google reviews pulled in automatically", "Automatic WhatsApp and SMS reminders"],
  },
  king: {
    id: "king",
    name: "The Industry King",
    priceRand: 499,
    tagline: "Built for the people who run the industry.",
    who: "Established trade companies and high-volume contractors.",
    revenue: "Making R50 000 or more a month",
    roast: "Your time is worth more than R500 an hour. Why are you still doing admin?",
    docsPerMonth: null,
    voicePerMonth: null,
    reminders: true,
    workPhotos: 6,
    features: [
      "Unlimited quotes and invoices",
      "Unlimited voice quotes",
      "Everything in The Real Business",
      "VAT sales summary for your accountant: every invoice and payment for any period, with the VAT on it, as a CSV file",
      "Tender hub: live eTenders matched to your trade and province, with a draft bid opened for you",
      "Tender engine: reads Excel and PDF BOQs into lines you can check and change, keeps your CSD, SARS, B-BBEE and COIDA papers valid, and emails the bid in one go",
      "Up to 6 photos of your work on your quote link",
      "Priority support and a one-to-one setup call",
    ],
    comingSoon: [
      "Expense and input-tax tracking, to turn the VAT summary into a full VAT picture",
      "Profit margin tracking",
      "Multi-crew access",
      "Google review capture",
    ],
  },
};

// "Unlimited" still has a ceiling so that nobody can run up costs for everyone else. This is in the Terms.
export const FAIR_USE = { documentsPerMonth: 2000, voicePerMonth: 300 } as const;

export const priceLabel = (id: PlanId) => `R${PLANS[id].priceRand}`;
export const PRICE_RANGE_LABEL = `${priceLabel("side")} to ${priceLabel("king")}`;

export function isPlanId(value: unknown): value is PlanId {
  return value === "side" || value === "real" || value === "king";
}
