import type { Metadata } from "next";
import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import TenderDemo from "@/components/TenderDemo";
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main className="text-yebo-deep">
        <section className="relative overflow-hidden bg-yebo-chalk">
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 size-[34rem] rounded-full bg-lime/30 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:pb-24 lg:pt-20">
            <div>
              <p className="fade-up inline-flex items-center gap-2 rounded-full border border-yebo-deep/10 bg-white/80 py-1.5 pl-1.5 pr-4 text-xs font-bold text-yebo-deep/75">
                <span className="rounded-full bg-yebo-deep px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-lime">Yebo Tenders</span>
                Government work, minus the panic
              </p>
              <h1 className="fade-up mt-6 text-balance text-[clamp(2.6rem,7.5vw,5.4rem)] font-extrabold leading-[.92] tracking-[-.06em]" style={{ "--d": ".08s" } as React.CSSProperties}>
                Find the tender. Price it. <span className="text-yebo">Send it before it closes.</span>
              </h1>
              <p className="fade-up mt-7 max-w-xl text-pretty text-lg leading-8 text-yebo-deep/70" style={{ "--d": ".16s" } as React.CSSProperties}>
                Yebo matches live South African tenders to your trade, reads the BOQ for you and checks your compliance papers before you submit. The paperwork stops being the reason you lose.
              </p>
              <div className="fade-up mt-8 flex flex-col gap-3 sm:flex-row" style={{ "--d": ".24s" } as React.CSSProperties}>
                <Link href="/login" className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-yebo px-7 text-sm font-extrabold text-white shadow-lg shadow-yebo/25 transition hover:-translate-y-0.5 hover:bg-yebo-deep">Start your first bid <span aria-hidden="true" className="ml-2">→</span></Link>
                <a href="#how" className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-yebo-deep/15 bg-white/60 px-7 text-sm font-extrabold text-yebo-deep transition hover:bg-white">See how it works</a>
              </div>
              <p className="mt-5 text-sm font-semibold text-yebo-deep/55">Part of The Industry King plan, R499 a month. Works on your phone or laptop.</p>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-label="Screenshots of Yebo Tenders on a phone">
              <div aria-hidden="true" className="absolute inset-x-6 bottom-0 top-16 rounded-[3rem] bg-yebo-deep sm:inset-x-10" />
              <div className="relative flex items-end justify-center pb-10 pt-6">
                <PhoneFrame src="/screens/tender-boq.png" alt="Yebo tender bid with BOQ items read into editable lines, quantities and rates" tone="light" className="pop-in w-[44vw] max-w-[230px] -rotate-6 translate-x-6 translate-y-6 sm:w-[210px]" />
                <PhoneFrame src="/screens/tenders-list.png" alt="Yebo tenders list with the tender hub, compliance vault warnings and open bids with closing dates" priority className="pop-in relative z-10 w-[50vw] max-w-[260px] rotate-3 -translate-x-4 sm:w-[250px]" />
              </div>
              <div className="stamp absolute bottom-6 right-0 z-20 rounded-2xl bg-orange px-4 py-3 text-white shadow-xl sm:right-2">
                <span className="block text-[10px] font-extrabold uppercase tracking-[.14em] text-white/80">Closes in</span>
                <span className="block text-xl font-black tracking-tight">5 days</span>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-yebo-deep py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-lime">A gentle roast</p>
            <h2 className="mt-4 max-w-3xl text-balance text-4xl font-extrabold leading-[.98] tracking-[-.05em] sm:text-6xl">Most bids don&rsquo;t fail on price. They fail on paperwork.</h2>
            <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-white/65">
              Your rates were great. Your SARS PIN expired last Tuesday. One missing or expired document and a good bid is binned before anyone reads it. Yebo keeps these four in one place and tells you what needs attention.
            </p>
            <dl className="mt-12 grid gap-4 sm:grid-cols-2">
              {papers.map(([t, d], i) => (
                <div key={t} className="rounded-[1.5rem] border border-white/10 bg-white/[.04] p-6 transition hover:border-white/20 hover:bg-white/[.07]">
                  <dt className="flex items-center justify-between gap-4 text-lg font-extrabold">
                    {t}
                    <span aria-hidden="true" className="font-mono text-sm text-white/25">0{i + 1}</span>
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-white/65">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="how" className="scroll-mt-24 bg-yebo-chalk py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-12">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">How it works</p>
              <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[.98] tracking-[-.05em] sm:text-5xl">From tender alert to sent bid</h2>
              <ol className="mt-10 flex flex-col gap-3">
                {steps.map(([t, d], i) => (
                  <li key={t} className="flex gap-4 rounded-[1.5rem] border border-yebo-deep/10 bg-white p-5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime text-sm font-black text-yebo-deep">{i + 1}</span>
                    <div>
                      <p className="text-lg font-extrabold">{t}</p>
                      <p className="mt-1 text-sm leading-6 text-yebo-deep/65">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="lg:sticky lg:top-28">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[.16em] text-yebo-deep/50">Try it: a real BOQ, priced</p>
              <TenderDemo />
            </div>
          </div>
        </section>

        <section className="border-t border-yebo-deep/10 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">The free guide</p>
            <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-.04em] sm:text-5xl">How to bid for a government tender in South Africa</h2>
            <p className="mt-5 text-lg leading-8 text-yebo-deep/65">The same six steps apply whether you use Yebo or not. Get the first four sorted once and every tender after that is faster.</p>
            <ol className="relative mt-10 space-y-8 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-yebo-deep/15">
              {guide.map(([t, d], i) => (
                <li key={t} className="relative flex gap-5">
                  <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-yebo-deep text-sm font-black text-white ring-4 ring-white">{i + 1}</span>
                  <div><h3 className="text-lg font-extrabold">{t}</h3><p className="mt-1 leading-7 text-yebo-deep/65">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-yebo-chalk px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2.25rem] border border-yebo-deep/10 bg-white p-7 sm:p-10 lg:grid-cols-2 lg:p-14">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">The Industry King</p>
              <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-.04em] sm:text-5xl">One plan for contractors who bid.</h2>
              <p className="mt-6 text-7xl font-black tracking-[-.05em] sm:text-8xl">R499<span className="ml-2 text-2xl font-semibold tracking-normal text-yebo-deep/55">a month</span></p>
              <p className="mt-4 text-lg text-yebo-deep/65">One tender you would have missed pays for years of this. One expired certificate costs more.</p>
              <Link href="/pricing" className="mt-7 inline-flex min-h-[52px] items-center rounded-full bg-yebo px-7 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-yebo-deep">See The Industry King plan <span aria-hidden="true" className="ml-2">→</span></Link>
            </div>
            <ul className="flex flex-col gap-3 text-yebo-deep/80">
              {[
                "Live eTenders matched to your trade and province",
                "Excel and PDF BOQs read into editable line items, including very big ones",
                "Every line keeps its original text, so you can check it",
                "Compliance vault for CSD, SARS, B-BBEE and COIDA",
                "Bid and compliance files sent in one email, after you approve",
                "Quotes, invoices, voice quotes and PayFast payments included",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-2xl bg-yebo-chalk/70 px-4 py-3 font-semibold"><span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-yebo text-[10px] font-black text-white">✓</span>{t}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-yebo-chalk px-5 pb-20 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-[1.5rem] border-l-4 border-orange bg-white p-6 sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-orange">Straight talk</p>
            <p className="max-w-3xl leading-7 text-yebo-deep/80"><b className="text-yebo-deep">What Yebo does not do.</b> It helps you avoid being disqualified for missing paperwork. It cannot promise you will win, and it does not fill in the tender&rsquo;s own forms. Always compare your bid with the original tender documents before you submit.</p>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-t border-yebo-deep/10 bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16 lg:px-12">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Tender questions</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-.05em] sm:text-5xl">Questions</h2>
              <p className="mt-5 max-w-sm leading-7 text-yebo-deep/65">The stuff people ask before they trust us with a R2 million bid.</p>
            </div>
            <div className="flex flex-col gap-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-yebo-deep/10 bg-yebo-chalk/50 px-5 transition-colors open:border-yebo/30 open:bg-white open:shadow-[0_18px_40px_-28px_rgba(12,59,46,.5)] sm:px-6">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-lg font-black text-yebo ring-1 ring-yebo-deep/10 transition group-open:rotate-45 group-open:bg-yebo group-open:text-white group-open:ring-yebo">+</span>
                  </summary>
                  <p className="pb-5 pr-10 text-sm leading-7 text-yebo-deep/70">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-yebo-deep px-6 py-14 text-white sm:px-12 sm:py-20">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-yebo/50 blur-3xl" />
            <h2 className="relative max-w-2xl text-balance text-4xl font-extrabold leading-[.98] tracking-[-.05em] sm:text-6xl">The next tender closes soon. <span className="text-lime">Be ready for it.</span></h2>
            <p className="relative mt-5 max-w-xl text-lg text-white/65">Set up your vault once, and every bid after that starts with the hard part done.</p>
            <Link href="/login" className="relative mt-8 inline-flex min-h-[52px] items-center rounded-full bg-yebo-sun px-7 text-sm font-extrabold text-yebo-deep transition hover:-translate-y-0.5 hover:bg-white">Get started on Yebo <span aria-hidden="true" className="ml-2">↗</span></Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
