import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InfoPage from "@/components/InfoPage";
import { PAGES, pageBySlug } from "@/lib/opportunities";
import { appUrl } from "@/lib/url";
import JobForm from "./JobForm";

export const dynamicParams = false;
export const generateStaticParams = () => PAGES.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = pageBySlug((await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.description, alternates: { canonical: `${appUrl()}/jobs/${p.slug}` } };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = pageBySlug((await params).slug);
  if (!p) notFound();
  const others = PAGES.filter((o) => o.slug !== p.slug).slice(0, 6);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: p.h1, description: p.description, url: `${appUrl()}/jobs/${p.slug}`, inLanguage: "en-ZA" },
      { "@type": "FAQPage", mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };
  return (
    <InfoPage title={p.h1} intro={p.intro} jsonLd={jsonLd}>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_28rem] lg:px-12">
        <div>
          <p role="note" className="mb-6 rounded-2xl bg-orange/10 p-4 text-sm leading-6 text-yebo-deep"><b>New:</b> Yebo local jobs is still being rolled out. We are adding carpenters area by area, so in some areas we may not have anyone available yet. If so, we will tell you straight away and nothing is sent.</p>
          <h2 className="text-2xl font-extrabold tracking-tight">What people usually ask for</h2>
          <ul className="mt-4 space-y-2 text-lg leading-8 text-yebo-deep/80">
            {p.problems.map((x) => <li key={x} className="flex gap-3"><span aria-hidden="true" className="text-yebo">✓</span>{x}</li>)}
          </ul>

          <h2 className="mt-10 text-2xl font-extrabold tracking-tight">How it works</h2>
          <ol className="mt-4 space-y-3 text-lg leading-8 text-yebo-deep/80">
            <li><b>1. Tell us about the job.</b> A few lines and, if you can, a photo.</li>
            <li><b>2. Up to 3 local carpenters are alerted.</b> Only carpenters who work in {p.areaName} and chose to get jobs like this.</li>
            <li><b>3. Compare their quotes.</b> Pick one, or none. It is free to ask.</li>
          </ol>

          {p.suburbs.length > 0 && (
            <>
              <h2 className="mt-10 text-2xl font-extrabold tracking-tight">Common suburbs around {p.areaName}</h2>
              <p className="mt-3 text-lg leading-8 text-yebo-deep/80">{p.suburbs.join(", ")} and nearby.</p>
            </>
          )}

          <h2 className="mt-10 text-2xl font-extrabold tracking-tight">Questions</h2>
          <dl className="mt-4 space-y-5">
            {p.faq.map((f) => (
              <div key={f.q}><dt className="text-lg font-bold">{f.q}</dt><dd className="mt-1 text-lg leading-8 text-yebo-deep/75">{f.a}</dd></div>
            ))}
          </dl>

          <h2 className="mt-10 text-2xl font-extrabold tracking-tight">Other pages</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => <li key={o.slug}><Link href={`/jobs/${o.slug}`} className="inline-flex min-h-11 items-center rounded-full bg-yebo-chalk px-4 text-sm font-bold text-yebo-deep hover:underline">{o.h1}</Link></li>)}
          </ul>
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start" id="quote">
          <JobForm slug={p.slug} areaName={p.areaName} />
        </div>
      </section>
    </InfoPage>
  );
}
