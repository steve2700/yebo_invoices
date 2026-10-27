import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { PLANS, PLAN_ORDER, priceLabel } from "@/lib/plans";
import { appUrl } from "@/lib/url";

const path = "/which-plan";
const title = "Which Yebo plan should I choose? A simple guide";
const description =
  "Not sure which Yebo Invoices plan fits? Pick by how many quotes you send a month and what you need: follow-ups, VAT summary or tenders. Plans from R49 a month.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { type: "website", locale: "en_ZA", siteName: "Yebo Invoices", title, description, url: path, images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

// What each plan is best for. Limits and prices come from lib/plans.ts so this page never goes out of date.
const picks: Record<(typeof PLAN_ORDER)[number], { choose: string[]; skip: string }> = {
  side: {
    choose: [
      "You send a few quotes and invoices a month, not a few a week.",
      "You are tired of Word, Excel or chat files and want one tidy place.",
      "You are happy to follow up clients yourself for now.",
    ],
    skip: "You quote by voice often, or you keep forgetting to follow up. Look at The Real Business.",
  },
  real: {
    choose: [
      "Quoting is part of every week, and you lose track of who has not answered.",
      "You want a daily list of clients to nudge, with the WhatsApp message already written.",
      "You want your clients and past quotes in one place, and more photos of your work on the quote link.",
    ],
    skip: "You send more than 50 documents a month, need a VAT summary for your accountant, or want to bid for tenders. Look at The Industry King.",
  },
  king: {
    choose: [
      "You send a lot of quotes and invoices and admin is eating billable hours.",
      "Your accountant asks for a VAT sales summary every period.",
      "You want to find and bid on tenders that match your trade and province.",
    ],
    skip: "You are only starting out or quote a few jobs a month. A smaller plan will do.",
  },
};

const compare = [
  ["Everything in one place", "Every quote and invoice in one list with a status", "Separate chats and files you have to name and find yourself"],
  ["Knowing what is outstanding", "Home screen shows collected, outstanding and overdue", "You add it up yourself"],
  ["Knowing who to follow up", "Follow-up list with the message written (Real Business and up)", "You have to remember"],
  ["Knowing the client saw it", "Opened, accepted and paid are tracked", "Nothing tells you"],
  ["Getting paid", "Client pays by card or instant EFT from the quote or invoice link", "You send bank details and wait"],
  ["Speed on the next job", "Start from a similar past quote, or speak the job", "Explain the job again each time"],
  ["Checking the numbers", "Totals and VAT are calculated for you; you still check them", "The chatbot writes the numbers, so you must check every one"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: title,
      description,
      inLanguage: "en-ZA",
      url: `${appUrl()}${path}`,
    },
    {
      "@type": "ItemList",
      itemListElement: PLAN_ORDER.map((id, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: { "@type": "Offer", name: PLANS[id].name, price: String(PLANS[id].priceRand), priceCurrency: "ZAR", description: PLANS[id].who },
      })),
    },
  ],
};

const h2 = "text-2xl font-extrabold tracking-tight text-yebo-deep sm:text-3xl";
const linkCls = "font-semibold text-yebo underline decoration-yebo/30 underline-offset-4 hover:text-yebo-deep";

export default function WhichPlan() {
  return (
    <InfoPage
      title="Which plan should I choose?"
      intro="Pick the plan by how many quotes you send in a normal month and what you need Yebo to do for you. You can change plan any time."
      jsonLd={jsonLd}
    >
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-6 px-5 sm:px-8">
          <h2 className={h2}>The quick answer</h2>
          <ul className="list-disc space-y-3 pl-6 text-lg leading-8 text-yebo-deep/80">
            <li>
              <strong>A few jobs a month:</strong> {PLANS.side.name}, {priceLabel("side")} a month, up to {PLANS.side.docsPerMonth} documents.
            </li>
            <li>
              <strong>Quoting every week and need follow-ups:</strong> {PLANS.real.name}, {priceLabel("real")} a month, up to {PLANS.real.docsPerMonth} documents.
            </li>
            <li>
              <strong>Busy company, VAT summary or tenders:</strong> {PLANS.king.name}, {priceLabel("king")} a month, unlimited documents.
            </li>
          </ul>
          <p className="text-lg leading-8 text-yebo-deep/80">
            Not sure? Start with the smaller plan. If you reach the monthly limit or miss the follow-up list, move up. Nothing you have already created is lost.
          </p>
        </div>
      </section>

      <section className="border-t border-yebo-deep/10 bg-yebo-chalk py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <h2 className={h2}>Which one is for you</h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const p = PLANS[id];
              return (
                <div key={id} className="flex flex-col border-t-2 border-yebo-deep/20 pt-5">
                  <h3 className="text-xl font-bold text-yebo-deep">{p.name}</h3>
                  <p className="mt-1 text-lg font-extrabold text-yebo">{priceLabel(id)} a month</p>
                  <p className="mt-2 text-base leading-7 text-yebo-deep/75">{p.who}</p>
                  <p className="mt-5 text-sm font-bold uppercase tracking-wide text-yebo-deep">Choose it if</p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-7 text-yebo-deep/80">
                    {picks[id].choose.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                  <p className="mt-5 text-sm font-bold uppercase tracking-wide text-yebo-deep">Skip it if</p>
                  <p className="mt-2 text-base leading-7 text-yebo-deep/80">{picks[id].skip}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-10 text-base leading-7 text-yebo-deep/75">
            Every plan includes quotes, invoices, online payments, tracking when clients open, accept or pay, and your own logo and colours. See the full lists on the{" "}
            <Link href="/pricing" className={linkCls}>pricing page</Link>.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className={h2}>Why one place beats a chatbot and a folder</h2>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-yebo-deep/75">
            A chatbot is good at wording a quote. Yebo does the wording too, then keeps the record, so you know where every job stands.
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-base">
              <thead>
                <tr className="border-b-2 border-yebo-deep/20 text-yebo-deep">
                  <th scope="col" className="py-3 pr-4 font-bold">What you need</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Yebo Invoices</th>
                  <th scope="col" className="py-3 font-bold">Chatbot and files</th>
                </tr>
              </thead>
              <tbody className="align-top text-yebo-deep/80">
                {compare.map(([need, yebo, bot]) => (
                  <tr key={need} className="border-b border-yebo-deep/15">
                    <th scope="row" className="py-4 pr-4 font-semibold text-yebo-deep">{need}</th>
                    <td className="py-4 pr-4 leading-7">{yebo}</td>
                    <td className="py-4 leading-7">{bot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-3xl text-base leading-7 text-yebo-deep/75">
            Chatbots are still handy for tricky wording, and some people run a careful spreadsheet alongside them. Yebo is for when you would rather have it all in one place without building and maintaining that system yourself. Read{" "}
            <Link href="/why-i-built-yebo-invoices" className={linkCls}>why I built Yebo</Link>.
          </p>
        </div>
      </section>

      <section className="border-t border-yebo-deep/10 bg-yebo-chalk py-14 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-6 px-5 sm:px-8">
          <h2 className={h2}>Pick one and send your next quote</h2>
          <p className="text-lg leading-8 text-yebo-deep/80">
            The best test is a real job. Send one quote from Yebo and see whether you know, at a glance, who has seen it and what is still owed.
          </p>
          <p>
            <Link href="/login" className="inline-flex min-h-[52px] items-center rounded-md bg-yebo px-7 text-base font-bold text-white transition hover:bg-yebo-deep">Get started</Link>
          </p>
        </div>
      </section>
    </InfoPage>
  );
}
