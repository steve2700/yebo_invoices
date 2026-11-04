import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import ProActions from "@/components/ProActions";
import { PAGES, PRICES, pageBySlug, photosFor } from "@/lib/opportunities";
import { loadPros } from "@/lib/opp-pros";
import { waLink } from "@/lib/dates";
import { appUrl } from "@/lib/url";
import JobForm from "./JobForm";

export const revalidate = 300;
export const dynamicParams = false;
export const generateStaticParams = () => PAGES.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = pageBySlug((await params).slug);
  if (!p) return {};
  const first = photosFor(p)[0];
  return {
    title: p.title, description: p.description, alternates: { canonical: `${appUrl()}/jobs/${p.slug}` },
    openGraph: { title: p.title, description: p.description, url: `${appUrl()}/jobs/${p.slug}`, images: first ? [`${appUrl()}/jobs/${first.file}.jpg`] : undefined },
  };
}

const css = `
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes ring{0%{box-shadow:0 0 0 0 rgba(15,138,95,.45)}70%{box-shadow:0 0 0 14px rgba(15,138,95,0)}100%{box-shadow:0 0 0 0 rgba(15,138,95,0)}}
@keyframes drift{from{transform:scale(1)}to{transform:scale(1.06)}}
.rise{animation:rise .7s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--d,0s)}
.tap{animation:ring 2.6s ease-out 1.2s 3}
.ph{overflow:hidden;border-radius:1.25rem}.ph img{transition:transform .6s ease}.ph:hover img{transform:scale(1.05)}
.hero-photo img{animation:drift 14s ease-in-out infinite alternate}
.strip{scroll-snap-type:x mandatory}.strip>*{scroll-snap-align:start}
@media (prefers-reduced-motion:reduce){.rise,.tap,.hero-photo img{animation:none}.ph img{transition:none}}
`;

const h2 = "text-2xl font-extrabold tracking-tight sm:text-3xl";

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = pageBySlug((await params).slug);
  if (!p) notFound();
  const pros = await loadPros(p.trade, p.area, 3);
  const photos = photosFor(p);
  const hero = photos[0];
  const others = PAGES.filter((o) => o.slug !== p.slug).slice(0, 6);
  const digits = (n: string) => { const d = n.replace(/\D/g, ""); return d.startsWith("0") ? "27" + d.slice(1) : d; };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: p.h1, description: p.description, url: `${appUrl()}/jobs/${p.slug}`, inLanguage: "en-ZA", ...(hero ? { primaryImageOfPage: `${appUrl()}/jobs/${hero.file}.jpg` } : {}) },
      { "@type": "FAQPage", mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      ...photos.map((x) => ({ "@type": "ImageObject", contentUrl: `${appUrl()}/jobs/${x.file}.jpg`, caption: x.caption, description: x.alt })),
      ...pros.map((x) => ({
        "@type": "ProfessionalService", name: x.name, areaServed: p.areaName,
        ...(x.phone ? { telephone: "+" + digits(x.phone) } : {}), ...(x.logo ? { image: x.logo } : {}), ...(x.about ? { description: x.about } : {}),
      })),
    ],
  };

  return (
    <>
      <LandingHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="text-yebo-deep">
        <div className="bg-yebo-chalk">
          <div className="mx-auto max-w-7xl px-5 pb-8 pt-10 sm:px-8 sm:pb-12 sm:pt-14 lg:px-12">
            <p className="rise inline-flex rounded-full bg-orange/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-orange">New, rolling out area by area</p>
            <h1 className="rise mt-4 max-w-4xl text-balance text-[clamp(2.1rem,6vw,4.25rem)] font-extrabold leading-[1] tracking-[-.04em]" style={{ "--d": ".08s" } as React.CSSProperties}>{p.h1}</h1>
            <p className="rise mt-4 max-w-2xl text-pretty text-xl font-semibold leading-8 text-yebo-deep/85" style={{ "--d": ".16s" } as React.CSSProperties}>{p.feel}</p>
            <ul className="rise mt-5 flex flex-wrap gap-2 text-sm font-bold" style={{ "--d": ".24s" } as React.CSSProperties}>
              {["Free to ask", "Up to 3 quotes", "Real local carpenters", "Takes about a minute"].map((t) => <li key={t} className="rounded-full bg-white px-3 py-1.5 shadow-sm"><span className="text-yebo">✓</span> {t}</li>)}
            </ul>
          </div>
        </div>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_28rem] lg:px-12">
          <div id="quote" className="rise order-first lg:order-last lg:sticky lg:top-6 lg:self-start" style={{ "--d": ".3s" } as React.CSSProperties}>
            <JobForm slug={p.slug} areaName={p.areaName} chips={p.chips} />
            <p className="mt-3 text-center text-xs text-yebo-deep/60">Prefer to talk? Call or WhatsApp a carpenter below.</p>
          </div>

          <div className="min-w-0 space-y-12">
            <div>
              <h2 className={h2}>{pros.length ? `Carpenters ready for ${p.areaName}` : `Carpenters for ${p.areaName}`}</h2>
              {pros.length ? (
                <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {pros.map((x, i) => {
                    const tel = x.phone ? `tel:+${digits(x.phone)}` : null;
                    const wa = x.phone ? waLink(x.phone, `Hi ${x.name}, I found you on Yebo (yeboinvoices.com). I need help with ${p.need}. Can you quote me?`) : null;
                    return (
                      <li key={x.id} className="rise rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/5" style={{ "--d": `${0.1 + i * 0.1}s` } as React.CSSProperties}>
                        <div className="flex items-center gap-3">
                          {x.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={x.logo} alt={`${x.name} logo`} width={56} height={56} className="size-14 rounded-2xl object-contain" />
                          ) : <span aria-hidden="true" className="grid size-14 place-items-center rounded-2xl text-xl font-extrabold text-white" style={{ backgroundColor: x.color }}>{x.name.slice(0, 1)}</span>}
                          <div className="min-w-0"><h3 className="truncate text-lg font-extrabold">{x.name}</h3><p className="text-sm text-yebo-deep/60">{x.since ? `Since ${x.since}` : "Carpenter"} · {p.areaName}</p></div>
                        </div>
                        {x.about && <p className="mt-3 text-sm leading-6 text-yebo-deep/75">{x.about}</p>}
                        {x.photos.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {x.photos.map((u) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={u} src={u} alt={`Work by ${x.name}`} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                            ))}
                          </div>
                        )}
                        <ProActions id={x.id} page={p.slug} tel={tel} wa={wa} color={x.color} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 rounded-2xl bg-yebo-chalk p-5 text-lg leading-8">We are still adding carpenters for {p.areaName}. Send your request and, if someone is available, they will reply. If nobody is, we will say so straight away.</p>
              )}
              <p className="mt-3 text-xs leading-5 text-yebo-deep/55">Shown in the order explained under “How we choose”. Yebo&apos;s founder also runs a carpentry business that is listed here, ranked by the same rules.</p>
            </div>

            {photos.length > 0 && (
              <div>
                <h2 className={h2}>Real work, real kitchens, real doors</h2>
                <p className="mt-2 text-lg text-yebo-deep/70">Photos of jobs done by carpenters on Yebo.</p>
                <div className="strip mt-5 flex gap-4 overflow-x-auto pb-3 sm:grid sm:grid-cols-3 sm:overflow-visible">
                  {photos.map((x, i) => (
                    <figure key={x.file} className="ph w-64 shrink-0 bg-white sm:w-auto">
                      <div className={i === 0 ? "hero-photo" : ""}>
                        <Image src={`/jobs/${x.file}.jpg`} alt={x.alt} width={900} height={1200} sizes="(min-width:640px) 30vw, 70vw" className="aspect-[3/4] w-full object-cover" priority={i === 0} />
                      </div>
                      <figcaption className="p-3 text-sm font-semibold text-yebo-deep/75">{x.caption}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className={h2}>What people usually ask for</h2>
              <ul className="mt-4 space-y-2 text-lg leading-8 text-yebo-deep/80">
                {p.problems.map((x) => <li key={x} className="flex gap-3"><span aria-hidden="true" className="text-yebo">✓</span>{x}</li>)}
              </ul>
              {p.suburbs.length > 0 && <p className="mt-4 text-lg leading-8 text-yebo-deep/80"><b>Around {p.areaName}:</b> {p.suburbs.join(", ")} and nearby.</p>}
            </div>

            {PRICES.length > 0 && (
              <div>
                <h2 className={h2}>What it usually costs</h2>
                <p className="mt-2 text-sm text-yebo-deep/60">A guide only. Every job is different, so the carpenter confirms the price in their quote.</p>
                <ul className="mt-4 divide-y divide-ink/10 rounded-3xl bg-white shadow-sm">
                  {PRICES.map((r) => <li key={r.job} className="flex items-baseline justify-between gap-4 p-4 text-lg"><span>{r.job}{r.note && <span className="block text-sm text-yebo-deep/55">{r.note}</span>}</span><b className="whitespace-nowrap">R{r.from.toLocaleString("en-ZA")} to R{r.to.toLocaleString("en-ZA")}</b></li>)}
                </ul>
              </div>
            )}

            <div>
              <h2 className={h2}>How it works</h2>
              <ol className="mt-4 grid gap-4 sm:grid-cols-3">
                {[["Tell us", "Pick what you need, add your suburb and WhatsApp. A photo is a bonus."], ["They reply", "Up to 3 carpenters for your area are alerted straight away."], ["You choose", "Compare quotes, or just call. Free, and no pressure."]].map(([t, d], i) => (
                  <li key={t} className="rounded-3xl bg-yebo-chalk p-5"><span className="grid size-9 place-items-center rounded-full bg-yebo text-base font-extrabold text-white">{i + 1}</span><b className="mt-3 block text-lg">{t}</b><span className="mt-1 block text-base leading-7 text-yebo-deep/75">{d}</span></li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className={h2}>Questions</h2>
              <div className="mt-4 space-y-3">
                {p.faq.map((f) => (
                  <details key={f.q} className="group rounded-2xl bg-white p-4 shadow-sm">
                    <summary className="cursor-pointer text-lg font-bold">{f.q}</summary>
                    <p className="mt-2 text-lg leading-8 text-yebo-deep/75">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight">How we choose who you see</h2>
              <p className="mt-2 text-base leading-7 text-yebo-deep/70">Carpenters are ranked out of 100: up to 40 for a complete profile (logo, phone, about, work photos, reviews), up to 40 for how many local jobs they actually reply to, and up to 20 so everyone gets a turn. We do not sell the top spot.</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {others.map((o) => <li key={o.slug}><Link href={`/jobs/${o.slug}`} className="inline-flex min-h-11 items-center rounded-full bg-yebo-chalk px-4 text-sm font-bold hover:underline">{o.h1}</Link></li>)}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
