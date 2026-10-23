import type { Metadata } from "next";
import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import TenderDemo from "@/components/TenderDemo";
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
      offers: { "@type": "Offer", price: "499", priceCurrency: "ZAR", url: `${appUrl()}/#pricing` },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main className="text-yebo-deep">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-20">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-yebo">Yebo Tenders</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">Find the tender. Price it. Send it before it closes.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-yebo-deep/70">
              Yebo matches live South African tenders to your trade, reads the BOQ for you and checks your compliance papers before you submit. The paperwork stops being the reason you lose.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex min-h-12 items-center rounded-full bg-yebo px-7 text-sm font-extrabold text-white transition hover:bg-yebo-deep">Start your first bid</Link>
              <a href="#how" className="inline-flex min-h-12 items-center rounded-full border border-yebo-deep/20 px-7 text-sm font-extrabold text-yebo-deep transition hover:bg-white">See how it works</a>
            </div>
            <p className="mt-4 text-sm text-yebo-deep/55">Part of The Industry King plan, R499 a month. Works on your phone or laptop.</p>
          </div>
          <TenderDemo />
        </section>

        <section className="border-t border-yebo-deep/10 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Most bids don&rsquo;t fail on price. They fail on paperwork.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-yebo-deep/65">One missing or expired document and a good bid is thrown out before anyone reads it. Yebo keeps these four in one place and tells you what needs attention.</p>
            <dl className="mt-8 grid gap-x-10 sm:grid-cols-2">
              {papers.map(([t, d]) => (
                <div key={t} className="border-b border-yebo-deep/10 py-4"><dt className="text-lg font-extrabold">{t}</dt><dd className="mt-1 text-yebo-deep/65">{d}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <section id="how" className="scroll-mt-24 border-t border-yebo-deep/10 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">From tender alert to sent bid</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([t, d], i) => (
                <li key={t} className="rounded-3xl border border-yebo-deep/10 bg-white p-5">
                  <span className="grid size-9 place-items-center rounded-full bg-lime text-sm font-black text-yebo-deep">{i + 1}</span>
                  <p className="mt-3 text-lg font-extrabold">{t}</p>
                  <p className="mt-1 text-sm leading-6 text-yebo-deep/65">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-yebo-deep/10 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">How to bid for a government tender in South Africa</h2>
            <p className="mt-4 text-lg leading-8 text-yebo-deep/65">The same six steps apply whether you use Yebo or not. Get the first four sorted once and every tender after that is faster.</p>
            <ol className="mt-8 space-y-6">
              {guide.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-yebo-deep text-sm font-black text-white">{i + 1}</span>
                  <div><h3 className="text-lg font-extrabold">{t}</h3><p className="mt-1 leading-7 text-yebo-deep/65">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-yebo-deep/10 py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:px-12">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">One plan for contractors who bid.</h2>
              <p className="mt-6 text-7xl font-black tracking-tight sm:text-8xl">R499<span className="ml-2 text-2xl font-semibold text-yebo-deep/55">a month</span></p>
              <p className="mt-4 text-lg text-yebo-deep/65">One tender you would have missed pays for years of this.</p>
              <Link href="/#pricing" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-yebo px-7 text-sm font-extrabold text-white transition hover:bg-yebo-deep">See The Industry King plan</Link>
            </div>
            <ul className="space-y-3 text-yebo-deep/80">
              {[
                "Live eTenders matched to your trade and province",
                "Excel and PDF BOQs read into editable line items, including very big ones",
                "Every line keeps its original text, so you can check it",
                "Compliance vault for CSD, SARS, B-BBEE and COIDA",
                "Bid and compliance files sent in one email, after you approve",
                "Quotes, invoices, voice quotes and PayFast payments included",
              ].map((t) => (
                <li key={t} className="flex gap-3"><span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-yebo" />{t}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl rounded-3xl bg-yebo-deep p-7 text-white sm:p-9">
            <p className="max-w-3xl leading-7 text-white/85"><b className="text-lime">What Yebo does not do.</b> It helps you avoid being disqualified for missing paperwork. It cannot promise you will win, and it does not fill in the tender&rsquo;s own forms. Always compare your bid with the original tender documents before you submit.</p>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-t border-yebo-deep/10 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Questions</h2>
            <div className="mt-6">
              {faqs.map((f) => (
                <details key={f.q} className="border-b border-yebo-deep/10 py-4">
                  <summary className="cursor-pointer text-lg font-bold">{f.q}</summary>
                  <p className="mt-2 leading-7 text-yebo-deep/65">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-yebo-deep/10 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">The next tender closes soon. Be ready for it.</h2>
            <p className="mt-4 max-w-xl text-lg text-yebo-deep/65">Set up your vault once, and every bid after that starts with the hard part done.</p>
            <Link href="/login" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-yebo px-7 text-sm font-extrabold text-white transition hover:bg-yebo-deep">Get started on Yebo</Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
