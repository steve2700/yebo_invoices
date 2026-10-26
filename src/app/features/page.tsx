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

export default function FeaturesIndex() {
  return (
    <InfoPage title="Everything Yebo does" intro={`${FEATURE_COUNT} things worth knowing about, grouped by what you are trying to get done. Each page explains how it works and which plan it is on.`}>
      <section className="bg-white py-14 sm:py-20">
        <ul className="mx-auto grid max-w-7xl gap-x-12 gap-y-10 px-5 sm:px-8 md:grid-cols-2 lg:px-12">
          {FEATURE_GROUPS.map((g) => (
            <li key={g.slug} className="border-t-2 border-yebo-deep pt-5">
              <h2 className="text-2xl font-extrabold tracking-tight text-yebo-deep">
                <Link href={`/features/${g.slug}`} className="underline decoration-yebo-deep/20 underline-offset-4 transition hover:decoration-yebo-deep">{g.title}</Link>
              </h2>
              <p className="mt-2 text-base leading-7 text-yebo-deep/70">{g.promise}</p>
              <p className="mt-3 text-sm leading-6 text-yebo-deep/60">{g.features.map((f) => f.title).join(", ")}.</p>
            </li>
          ))}
          <li className="border-t-2 border-yebo-deep pt-5">
            <h2 className="text-2xl font-extrabold tracking-tight text-yebo-deep">
              <Link href="/tenders" className="underline decoration-yebo-deep/20 underline-offset-4 transition hover:decoration-yebo-deep">Government tenders, without the paperwork panic</Link>
            </h2>
            <p className="mt-2 text-base leading-7 text-yebo-deep/70">Find the tender, price the BOQ, send the bid before it closes.</p>
            <p className="mt-3 text-sm leading-6 text-yebo-deep/60">Tender hub, BOQ reader, compliance vault, how to submit.</p>
          </li>
        </ul>
      </section>
    </InfoPage>
  );
}
