import type { Metadata } from "next";
import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import TenderDemo from "@/components/TenderDemo";
import PhotoStrip from "@/components/PhotoStrip";
import PhoneFrame from "@/components/PhoneFrame";
import { appUrl } from "@/lib/url";

const title = "Yebo Tenders | Find South African tenders, price the BOQ, send your bid";
const description =
  "Live eTenders matched to your trade and province. Yebo reads the BOQ into line items, checks your CSD, SARS, B-BBEE and COIDA papers, and sends your bid in one email. From R499 a month.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tenders" },
  openGraph: { type: "website", locale: "en_ZA", siteName: "Yebo Invoices", title, description, url: `${appUrl()}/tenders` },
  twitter: { card: "summary", title, description },
};

const faqs = [
  { q: "Where do the tenders come from?", a: "Public tenders published on National Treasury's eTenders portal. Yebo reads new tenders every morning, and tenders that have closed are removed automatically. Always confirm the details and closing time on the tender documents themselves." },
  { q: "Do I need to be on the CSD already?", a: "Yes. Government buyers expect a Central Supplier Database registration, which is free and gives you a supplier number starting with MAAA. Yebo keeps your CSD summary in the vault and flags it if it is missing." },
  { q: "What if Yebo misreads a line in the BOQ?", a: "Excel BOQs are read exactly. PDFs are read by AI, so any line it is unsure about is marked, and every line keeps its original BOQ text so you can compare in seconds. You can change any line before you send." },
  { q: "Does Yebo fill in the tender forms for me?", a: "No. Yebo prices the schedule and sends your compliance documents with it. Declaration forms and any other forms the tender asks for still need to be completed and signed by you." },
  { q: "Will Yebo send a bid without my approval?", a: "Never. Auto-draft only opens a draft for tenders that match your trade. You check the lines, add your rates and approve. You can also email yourself a test copy first." },
  { q: "Can I use it on site?", a: "Yes. Yebo works in desktop and mobile browsers and installs on your phone like an app." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Yebo Tenders",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS",
      description,
      offers: { "@type": "Offer", price: "499", priceCurrency: "ZAR", url: `${appUrl()}/pricing` },
      areaServed: "ZA",
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

const papers = [
  ["CSD summary", "Proof you are registered on the Central Supplier Database, with your MAAA supplier number."],
  ["SARS tax compliance status", "Shows your tax affairs are in order. It must still be valid on the day you submit."],
  ["B-BBEE sworn affidavit", "Your ownership and turnover declaration, used for preference points."],
  ["COIDA letter of good standing", "Shows your workers' compensation is up to date."],
];

const steps = [
  ["Find it", "Live eTenders are matched to your trade and province. Closed tenders disappear on their own."],
  ["Open the bid", "Yebo reads the BOQ (Excel or PDF) into line items, quantities and section headings."],
  ["Price it", "Fill in your rates, or fill from rates you used before. Anything Yebo is unsure about is flagged so you can check the original."],
  ["Send it", "The vault checks your documents, then your priced bid and compliance files go out in one email."],
];

const guide = [
  ["Register on the Central Supplier Database (CSD)", "Registration is free and gives you the MAAA supplier number every government buyer asks for. Keep your summary report up to date."],
  ["Get your SARS tax compliance status", "Request it on SARS eFiling. Buyers check that it is valid when the tender closes, so note its expiry date."],
  ["Get a B-BBEE certificate or sworn affidavit", "Small businesses usually submit a sworn affidavit. It is what earns your preference points."],
  ["Get your COIDA letter of good standing", "Issued by the Compensation Fund once your registration and payments are in order. It expires, so check the date."],
  ["Find the tender and read the BOQ", "Tenders are advertised on the National Treasury eTenders portal and on department and municipality websites. The Bill of Quantities lists every item you must price."],
  ["Price every line and submit before it closes", "Late bids are not considered. Submit the way the tender says, for example by email or in the tender box, and keep proof that you sent it."],
];

export default function TendersPage() {
  return (
    <>
      <LandingHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      <main className="text-yebo-deep">
        <section className="bg-yebo-chalk">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-14 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:pb-20 lg:pt-20">
            <div>
              <h1 className="text-balance text-[clamp(2.5rem,6.5vw,4.75rem)] font-extrabold leading-[.95] tracking-[-.05em]">
                Find the tender. Price it. Send it before it closes.
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-yebo-deep/75">
                Yebo matches live South African tenders to your trade, reads the BOQ into lines and checks your compliance papers before you submit, so paperwork is not the reason you lose.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
                <Link href="/login" className="inline-flex min-h-[52px] items-center justify-center rounded-md bg-yebo px-7 text-base font-bold text-white transition hover:bg-yebo-deep">Start your first bid</Link>
                <a href="#how" className="text-base font-semibold text-yebo-deep underline decoration-yebo-deep/30 underline-offset-4 transition hover:decoration-yebo-deep">See how it works</a>
              </div>
              <p className="mt-5 text-sm text-yebo-deep/70">Part of The Industry King plan, R499 a month. Works on your phone or laptop.</p>
            </div>
            <div className="flex justify-center gap-4 lg:justify-end" aria-label="Screenshots of Yebo Tenders on a phone">
              <PhoneFrame src="/screens/tenders-list.png" alt="Yebo tenders list with the tender hub, compliance vault warnings and open bids with closing dates" priority tone="light" className="w-[44vw] max-w-[230px] sm:w-[230px]" />
              <PhoneFrame src="/screens/tender-boq.png" alt="Yebo tender bid with BOQ items read into editable lines, quantities and rates" tone="light" className="mt-10 w-[44vw] max-w-[230px] sm:w-[230px]" />
            </div>
          </div>
        </section>

        <PhotoStrip heading="Real jobs, real bids" />

        <section className="bg-yebo-deep py-16 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <h2 className="max-w-3xl text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] sm:text-5xl">Most bids do not fail on price. They fail on paperwork.</h2>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-8 text-white/80">
              One missing or expired document and a good bid can be thrown out before anyone reads your rates. Yebo keeps these four in one place and tells you what needs attention.
            </p>
            <dl className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
              {papers.map(([t, d]) => (
                <div key={t} className="border-t border-white/25 pt-4">
                  <dt className="text-lg font-bold">{t}</dt>
                  <dd className="mt-1.5 text-base leading-7 text-white/80">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="how" className="scroll-mt-24 bg-yebo-chalk py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-12">
            <div>
              <h2 className="text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] sm:text-5xl">From tender alert to sent bid</h2>
              <ol className="mt-8 flex flex-col gap-6">
                {steps.map(([t, d], i) => (
                  <li key={t} className="border-t-2 border-yebo-deep pt-4">
                    <p className="text-sm font-bold text-yebo">Step {i + 1}</p>
                    <p className="mt-1 text-xl font-extrabold">{t}</p>
                    <p className="mt-1 text-sm leading-6 text-yebo-deep/75">{d}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="lg:sticky lg:top-28">
              <p className="mb-3 text-sm font-bold text-yebo-deep/70">Try it: tap each paper to mark it ready</p>
              <TenderDemo />
            </div>
          </div>
        </section>

        <section className="border-t border-yebo-deep/10 bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <h2 className="text-balance text-3xl font-extrabold tracking-[-.04em] sm:text-5xl">How to bid for a government tender in South Africa</h2>
            <p className="mt-5 text-lg leading-8 text-yebo-deep/75">The same six steps apply whether you use Yebo or not. Get the first four sorted once and every tender after that is faster.</p>
            <ol className="mt-8 space-y-6">
              {guide.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span aria-hidden="true" className="mt-0.5 w-7 shrink-0 text-xl font-extrabold text-yebo">{i + 1}.</span>
                  <div><h3 className="text-lg font-extrabold">{t}</h3><p className="mt-1 leading-7 text-yebo-deep/75">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-yebo-deep/10 bg-yebo-chalk py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12">
            <div>
              <h2 className="text-balance text-3xl font-extrabold tracking-[-.04em] sm:text-5xl">Included in The Industry King</h2>
              <p className="mt-5 text-6xl font-black tracking-[-.04em] sm:text-7xl">R499<span className="ml-2 text-xl font-semibold tracking-normal text-yebo-deep/65">a month</span></p>
              <Link href="/pricing" className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-yebo underline decoration-yebo/30 underline-offset-4 transition hover:text-yebo-deep">See all three plans</Link>
            </div>
            <ul className="flex flex-col divide-y divide-yebo-deep/15 border-y border-yebo-deep/15">
              {[
                "Live eTenders matched to your trade and province",
                "Excel and PDF BOQs read into editable line items, including very big ones",
                "Every line keeps its original text, so you can check it",
                "Compliance vault for CSD, SARS, B-BBEE and COIDA",
                "Bid and compliance files sent in one email, after you approve",
                "Quotes, invoices, voice quotes and PayFast payments too",
              ].map((t) => (
                <li key={t} className="py-3 text-base font-semibold leading-6 text-yebo-deep">{t}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-white pb-4 pt-14">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <p className="max-w-3xl border-l-4 border-yebo-deep pl-5 text-base leading-7 text-yebo-deep/85"><b className="text-yebo-deep">What Yebo does not do.</b> It helps you avoid being disqualified for missing paperwork. It cannot promise you will win, and it does not fill in the tender&rsquo;s own forms. Always compare your bid with the original tender documents before you submit.</p>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 bg-white py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16 lg:px-12">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="text-3xl font-extrabold tracking-[-.04em] sm:text-5xl">Tender questions</h2>
              <p className="mt-4 max-w-sm leading-7 text-yebo-deep/75">What people ask before they trust a tool with a bid.</p>
            </div>
            <div className="flex flex-col divide-y divide-yebo-deep/15 border-y border-yebo-deep/15">
              {faqs.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden="true" className="shrink-0 text-2xl font-normal text-yebo transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-5 pr-10 text-sm leading-7 text-yebo-deep/75">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-yebo-deep py-16 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <h2 className="max-w-2xl text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] sm:text-5xl">Set up your vault once. Every bid after that starts with the hard part done.</h2>
            <Link href="/login" className="mt-8 inline-flex min-h-[52px] items-center rounded-md bg-yebo-sun px-7 text-base font-bold text-yebo-deep transition hover:bg-white">Get started on Yebo</Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
