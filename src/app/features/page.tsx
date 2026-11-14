import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { FEATURE_GROUPS, FEATURE_COUNT } from "@/lib/features";

const title = "Everything Yebo does | Quotes, invoices, payments and tenders";
const description = "Voice quotes, client tracking, online payments, deposits, reminders, VAT summaries and tenders. Every Yebo feature, in plain words.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/features" },
  openGraph: { type: "website", locale: "en_ZA", siteName: "Yebo Invoices", title, description, url: "/features", images: [{ url: "/og.png", width: 1200, height: 630 }] },
};

const card = "group flex h-full flex-col rounded-2xl border border-yebo-deep/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-yebo-deep/30 hover:shadow-md sm:p-7";

export default function FeaturesIndex() {
  return (
    <InfoPage
      eyebrow="Built for how trades work"
      title="Everything Yebo does"
      intro={`${FEATURE_COUNT} things worth knowing about, grouped by what you are trying to get done. Each page explains how it works and which plan it is on.`}
      photo={{ src: "/hero/team-site.jpg", alt: "A South African building crew smiling on site" }}
      cta={{ label: "Send your first quote", href: "/login" }}
    >
      <section className="bg-yebo-chalk py-14 sm:py-20">
        <ul className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 md:grid-cols-2 lg:px-12">
          {FEATURE_GROUPS.map((g, i) => (
            <li key={g.slug}>
              <Link href={`/features/${g.slug}`} className={card}>
                <span className="flex size-9 items-center justify-center rounded-full bg-yebo-sun text-sm font-extrabold text-yebo-deep" aria-hidden="true">{i + 1}</span>
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-yebo-deep">{g.title}</h2>
                <p className="mt-2 text-base leading-7 text-yebo-deep/75">{g.promise}</p>
                <p className="mt-3 text-sm leading-6 text-yebo-deep/60">{g.features.map((f) => f.title).join(", ")}.</p>
                <span className="mt-auto pt-5 text-sm font-extrabold text-yebo group-hover:underline">See how it works →</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/tenders" className="group flex h-full flex-col rounded-2xl bg-yebo-deep p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-7">
              <span className="flex size-9 items-center justify-center rounded-full bg-yebo-sun text-sm font-extrabold text-yebo-deep" aria-hidden="true">{FEATURE_GROUPS.length + 1}</span>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Government tenders, without the paperwork panic</h2>
              <p className="mt-2 text-base leading-7 text-white/80">Find the tender, price the BOQ, send the bid before it closes.</p>
              <p className="mt-3 text-sm leading-6 text-white/65">Tender hub, BOQ reader, compliance vault, how to submit.</p>
              <span className="mt-auto pt-5 text-sm font-extrabold text-yebo-sun group-hover:underline">Explore tenders →</span>
            </Link>
          </li>
        </ul>
      </section>
    </InfoPage>
  );
}
