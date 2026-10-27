import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { appUrl } from "@/lib/url";

const path = "/why-i-built-yebo-invoices";
const title = "Why I built Yebo Invoices: a contractor's story";
const description =
  "I was writing quotes and invoices with ChatGPT and kept losing track of clients, money and follow-ups. So I built Yebo Invoices for South African contractors.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { type: "article", locale: "en_ZA", siteName: "Yebo Invoices", title, description, url: path, images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

// Each row is something that went wrong before, and what Yebo does about it today. Only things that exist in the app.
const fixes = [
  {
    problem: "How many quotes did I send?",
    fix: "Every quote and invoice is in one list with its status: draft, sent, opened, accepted, declined or paid. A Quote results page shows how many you sent, how many you won, your win rate and the reasons clients said no.",
    href: "/features/know-your-numbers",
  },
  {
    problem: "How much money did we make?",
    fix: "Your home screen shows what you collected this month, what is still outstanding and what is overdue. You can set a monthly target and watch it fill up.",
    href: "/features/know-your-numbers",
  },
  {
    problem: "Who do I need to follow up?",
    fix: "Yebo lists the clients who have gone quiet or are late, with the message already written. One tap opens WhatsApp, and you press send. It also tells you the moment a client opens or answers a quote.",
    href: "/features/send-and-track",
    plan: "The follow-up list is on The Real Business and The Industry King.",
  },
  {
    problem: "Did I forget a client?",
    fix: "Nobody falls off the list. A quote that nobody answered stays visible until it is accepted, declined or expires, and Yebo reminds you three days apart, up to three times.",
    href: "/features/send-and-track",
  },
  {
    problem: "Getting paid",
    fix: "Clients pay by card or instant EFT from the same link, or you record an EFT or cash payment yourself. You can ask for a deposit, and you get a receipt and an alert when the money lands.",
    href: "/features/get-paid",
  },
  {
    problem: "Typing everything again",
    fix: "Say the job out loud and get a draft to check. Start from a similar quote you did before. Before you send, Yebo points out a missing email or WhatsApp number, vague lines and items with no price.",
    href: "/features/write-quotes",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: title,
      description,
      inLanguage: "en-ZA",
      datePublished: "2026-10-27",
      mainEntityOfPage: `${appUrl()}${path}`,
      author: { "@type": "Person", name: "Stewart", jobTitle: "Founder, Yebo Invoices" },
      publisher: { "@type": "Organization", name: "Yebo Invoices", url: appUrl() },
      image: `${appUrl()}/og.png`,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Yebo Invoices", item: appUrl() },
        { "@type": "ListItem", position: 2, name: "Why I built Yebo Invoices", item: `${appUrl()}${path}` },
      ],
    },
  ],
};

const body = "text-lg leading-8 text-yebo-deep/80";
const h2 = "text-2xl font-extrabold tracking-tight text-yebo-deep sm:text-3xl";

export default function WhyIBuiltYebo() {
  return (
    <InfoPage
      title="Why I built Yebo Invoices"
      intro="I used to write my quotes and invoices with ChatGPT. The words were fine. Keeping track of the business was not. So I built a tool made for South African contractors."
      jsonLd={jsonLd}
    >
      <article className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-6 px-5 sm:px-8">
          <h2 className={h2}>How I used to quote</h2>
          <p className={body}>
            I run a contracting business in South Africa. Like many small business owners, I was using ChatGPT to write my quotes and invoices. It was quick, and the writing looked professional.
          </p>
          <p className={body}>
            The trouble started a few weeks later. Every quote and every invoice was a separate file somewhere. There was no list, no totals and no reminders. There was no structure at all, just a folder that kept getting bigger.
          </p>

          <h2 className={`${h2} pt-6`}>What kept going wrong</h2>
          <ul className="list-disc space-y-3 pl-6 text-lg leading-8 text-yebo-deep/80">
            <li>I could not say how many quotes I had sent.</li>
            <li>I could not say how much money the business had made.</li>
            <li>I could not see which quotes needed a follow-up.</li>
            <li>I forgot some clients who should have been followed up, and that cost me work and money.</li>
          </ul>
          <p className={body}>
            A chatbot is good at words. A contractor also needs a record: who was quoted, what they said, what they owe and who needs a call. I was keeping all of that in my head, and my head is busy on site.
          </p>

          <h2 className={`${h2} pt-6`}>What I wanted</h2>
          <p className={body}>
            One place for every quote and invoice. One screen that shows what came in, what is outstanding and who I need to chase. A client link that is easy to open on a phone, so people can say yes and pay without a back and forth. And nothing sent to a client without me pressing send.
          </p>
          <p className={body}>That is what Yebo Invoices is.</p>
        </div>
      </article>

      <section className="border-t border-yebo-deep/10 bg-yebo-chalk py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className={h2}>How Yebo makes a contractor&apos;s week easier</h2>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-yebo-deep/75">Every problem above, and what Yebo does about it today.</p>
          <dl className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {fixes.map((f) => (
              <div key={f.problem} className="border-t border-yebo-deep/15 pt-5">
                <dt className="text-xl font-bold text-yebo-deep">{f.problem}</dt>
                <dd className="mt-2 text-base leading-7 text-yebo-deep/80">{f.fix}</dd>
                {f.plan && <dd className="mt-2 text-sm font-semibold text-yebo">{f.plan}</dd>}
                <dd className="mt-3">
                  <Link href={f.href} className="inline-flex min-h-11 items-center text-base font-semibold text-yebo underline decoration-yebo/30 underline-offset-4 hover:text-yebo-deep">See how it works</Link>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-6 px-5 sm:px-8">
          <h2 className={h2}>Who Yebo is for</h2>
          <p className={body}>
            Plumbers, electricians, builders, painters, carpenters, tilers, installers and anyone else who quotes jobs and chases payment from a phone. If you run a small business in South Africa and your quotes and invoices live in chats and folders, Yebo is for you. It works in rands, handles VAT, and sends clients a link that opens on any phone with nothing to install.
          </p>

          <h2 className={`${h2} pt-6`}>What I will not pretend</h2>
          <p className={body}>
            Yebo is new, and I am still building it with feedback from the people who use it. AI helps draft your quote, but the prices, dates and totals are always yours to check. Nothing goes to your client unless you send it. Some features, such as the follow-up list, are on the higher plans, and you can see exactly what each plan includes on the{" "}
            <Link href="/pricing" className="font-semibold text-yebo underline decoration-yebo/30 underline-offset-4">pricing page</Link>.
          </p>

          <h2 className={`${h2} pt-6`}>Try it on your next quote</h2>
          <p className={body}>
            Send one real quote and see whether it feels like more control. If something slows you down, tell me. I read every message.
          </p>
          <p>
            <Link href="/login" className="inline-flex min-h-[52px] items-center rounded-md bg-yebo px-7 text-base font-bold text-white transition hover:bg-yebo-deep">Send your first quote</Link>
          </p>
          <p className="text-base leading-7 text-yebo-deep/70">
            Want to see more first?{" "}
            <Link href="/features" className="font-semibold text-yebo underline decoration-yebo/30 underline-offset-4">Everything Yebo does</Link>
            {" · "}
            <Link href="/how-it-works" className="font-semibold text-yebo underline decoration-yebo/30 underline-offset-4">How it works</Link>
            {" · "}
            <Link href="/faq" className="font-semibold text-yebo underline decoration-yebo/30 underline-offset-4">Questions</Link>
          </p>
        </div>
      </section>
    </InfoPage>
  );
}
