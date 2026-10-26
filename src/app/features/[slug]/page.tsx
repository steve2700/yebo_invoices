import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InfoPage from "@/components/InfoPage";
import PhoneFrame from "@/components/PhoneFrame";
import { FEATURE_GROUPS, getGroup } from "@/lib/features";

export function generateStaticParams() {
  return FEATURE_GROUPS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = getGroup(slug);
  if (!g) return {};
  const title = `${g.title} | Yebo Invoices`;
  const description = `${g.promise} ${g.intro}`.slice(0, 200);
  return {
    title,
    description,
    alternates: { canonical: `/features/${g.slug}` },
    openGraph: { type: "website", locale: "en_ZA", siteName: "Yebo Invoices", title, description, url: `/features/${g.slug}`, images: [{ url: "/og.png", width: 1200, height: 630 }] },
  };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGroup(slug);
  if (!g) notFound();
  const others = FEATURE_GROUPS.filter((o) => o.slug !== g.slug);

  return (
    <InfoPage title={g.title} intro={`${g.promise} ${g.intro}`}>
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.2fr_.8fr] lg:gap-16 lg:px-12">
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {g.features.map((f) => (
              <div key={f.title} className="border-t border-yebo-deep/15 pt-4">
                <dt className="text-lg font-bold text-yebo-deep">{f.title}</dt>
                <dd className="mt-1.5 text-sm leading-6 text-yebo-deep/75">{f.text}</dd>
                {f.plan && <dd className="mt-2 text-sm font-semibold text-yebo">{f.plan}</dd>}
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap justify-center gap-4 lg:sticky lg:top-28 lg:self-start lg:justify-end">
            {g.screens.map((s, k) => (
              <PhoneFrame key={s.src} src={s.src} alt={s.alt} tone={k % 2 ? "light" : "dark"} className="w-[44vw] max-w-[230px] sm:w-[230px]" />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-yebo-deep/10 bg-yebo-chalk py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <h2 className="text-xl font-extrabold tracking-tight text-yebo-deep">More from Yebo</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/features/${o.slug}`} className="inline-flex min-h-11 items-center text-base font-semibold text-yebo underline decoration-yebo/30 underline-offset-4 transition hover:text-yebo-deep">{o.title}</Link>
              </li>
            ))}
            <li>
              <Link href="/tenders" className="inline-flex min-h-11 items-center text-base font-semibold text-yebo underline decoration-yebo/30 underline-offset-4 transition hover:text-yebo-deep">Government tenders</Link>
            </li>
          </ul>
        </div>
      </section>
    </InfoPage>
  );
}
