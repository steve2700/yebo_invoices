import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import ProActions from "@/components/ProActions";
import { PAGES, PRICES, pageBySlug, photosFor } from "@/lib/opportunities";
import { loadPros, type Pro } from "@/lib/opp-pros";
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
@keyframes drift{from{transform:scale(1)}to{transform:scale(1.08)}}
.rise{animation:rise .7s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--d,0s)}
.tap{animation:ring 2.6s ease-out 1.2s 3}
.ph{overflow:hidden;border-radius:1.25rem}.ph img{transition:transform .6s ease}.ph:hover img{transform:scale(1.05)}
.bg-drift img{animation:drift 22s ease-in-out infinite alternate}
.strip{scroll-snap-type:x mandatory}.strip>*{scroll-snap-align:start}
@media (prefers-reduced-motion:reduce){.rise,.tap,.bg-drift img{animation:none}.ph img{transition:none}}
`;
const d = (s: string) => ({ "--d": s }) as React.CSSProperties;
const h2 = "text-2xl font-extrabold tracking-tight sm:text-3xl";
const digits = (n: string) => { const x = n.replace(/\D/g, ""); return x.startsWith("0") ? "27" + x.slice(1) : x; };

function Logo({ x, size }: { x: Pro; size: number }) {
  return x.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={x.logo} alt={`${x.name} logo`} width={size} height={size} className="shrink-0 rounded-2xl bg-white object-contain" style={{ width: size, height: size }} />
  ) : <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-2xl text-xl font-extrabold text-white" style={{ width: size, height: size, backgroundColor: x.color }}>{x.name.slice(0, 1)}</span>;
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = pageBySlug((await params).slug);
  if (!p) notFound();
  const pros = await loadPros(p.trade, p.area, 3);
  const photos = photosFor(p);
  const hero = photos[0];
  const sameArea = PAGES.filter((o) => o.area === p.area && o.slug !== p.slug);
  const nearby = PAGES.filter((o) => o.area !== p.area).slice(0, 6);
  const links = (x: Pro) => ({
    tel: x.phone ? `tel:+${digits(x.phone)}` : null,
    wa: x.phone ? waLink(x.phone, `Hi ${x.name}, I found you on Yebo (yeboinvoices.com). I need help with ${p.need}. Can you quote me?`) : null,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Yebo", item: appUrl() },
        { "@type": "ListItem", position: 2, name: "Local carpenters", item: `${appUrl()}/jobs` },
        { "@type": "ListItem", position: 3, name: p.h1, item: `${appUrl()}/jobs/${p.slug}` },
      ] },
      { "@type": "WebPage", name: p.h1, description: p.description, url: `${appUrl()}/jobs/${p.slug}`, inLanguage: "en-ZA", ...(hero ? { primaryImageOfPage: `${appUrl()}/jobs/${hero.file}.jpg` } : {}) },
      { "@type": "FAQPage", mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      ...photos.map((x) => ({ "@type": "ImageObject", contentUrl: `${appUrl()}/jobs/${x.file}.jpg`, caption: x.caption, description: x.alt })),
      ...pros.map((x) => ({ "@type": "ProfessionalService", name: x.name, areaServed: p.areaName, ...(x.phone ? { telephone: "+" + digits(x.phone) } : {}), ...(x.logo ? { image: x.logo } : {}), ...(x.about ? { description: x.about } : {}) })),
    ],
  };

  return (
    <>
      <LandingHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="text-yebo-deep">
        {/* HERO: the problem, the answer, and real people you can call, all on the first screen */}
        <section className="relative isolate overflow-hidden bg-yebo-deep text-white">
          {hero && (
            <div className="bg-drift absolute inset-0 -z-20">
              <Image src={`/jobs/${hero.file}.jpg`} alt="" fill priority sizes="100vw" className="object-cover" />
            </div>
          )}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-yebo-deep/90 via-yebo-deep/80 to-yebo-deep/95" />
          <div className="mx-auto max-w-7xl px-5 pb-8 pt-8 sm:px-8 sm:pb-12 sm:pt-12 lg:px-12">
            <nav aria-label="Breadcrumb" className="rise text-xs font-bold text-white/70">
              <Link href="/" className="hover:underline">Yebo</Link> / <Link href="/jobs" className="hover:underline">Local carpenters</Link> / <span className="text-white">{p.areaName}</span>
            </nav>
            <p className="rise mt-4 inline-flex rounded-full bg-orange px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white" style={d(".05s")}>New · opening area by area</p>
            <h1 className="rise mt-4 max-w-4xl text-balance text-[clamp(2.2rem,6.4vw,4.5rem)] font-extrabold leading-[1] tracking-[-.04em]" style={d(".1s")}>{p.h1}</h1>
            <p className="rise mt-4 max-w-2xl text-pretty text-xl font-semibold leading-8 text-white/90" style={d(".18s")}>{p.feel}</p>
            <p className="rise mt-3 max-w-2xl text-pretty text-base leading-7 text-white/75" style={d(".24s")}>No chasing five people for a price. Tell us once, or call a real carpenter right now. It is free, and nobody pays to get your details.</p>
            <div className="rise mt-6 flex flex-wrap gap-3" style={d(".3s")}>
              <a href="#quote" className="tap inline-flex min-h-12 items-center rounded-2xl bg-yebo px-6 text-base font-extrabold text-white transition active:scale-95">Get my free quotes</a>
              {pros.length > 0 && <a href="#carpenters" className="inline-flex min-h-12 items-center rounded-2xl bg-white/15 px-6 text-base font-extrabold text-white ring-1 ring-white/40 transition hover:bg-white/25 active:scale-95">Call a carpenter now</a>}
            </div>

            {pros.length > 0 && (
              <div className="mt-7">
                <p className="rise text-xs font-extrabold uppercase tracking-wider text-white/70" style={d(".36s")}>Carpenters ready for {p.areaName}</p>
                <ul className="strip mt-3 flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
                  {pros.map((x, i) => {
                    const l = links(x);
                    return (
                      <li key={x.id} className="rise w-[19rem] shrink-0 rounded-3xl bg-white p-4 text-yebo-deep shadow-lg lg:w-auto" style={d(`${0.4 + i * 0.1}s`)}>
                        <div className="flex items-center gap-3">
                          <Logo x={x} size={48} />
                          <div className="min-w-0"><p className="truncate text-base font-extrabold">{x.name}</p><p className="text-xs text-yebo-deep/60">{x.since ? `Since ${x.since} · ` : ""}{p.areaName}</p></div>
                        </div>
                        <ProActions id={x.id} page={p.slug} tel={l.tel} wa={l.wa} color={x.color} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_28rem] lg:px-12">
          <div id="quote" className="order-first scroll-mt-20 lg:order-last lg:sticky lg:top-6 lg:self-start">
            <JobForm slug={p.slug} areaName={p.areaName} chips={p.chips} />
            <p className="mt-3 text-center text-xs text-yebo-deep/60">Free to ask. Your details go only to the carpenters who get this job.</p>
          </div>

          <div className="min-w-0 space-y-14">
            <div>
              <h2 className={h2}>You should not have to beg for a quote</h2>
              <p className="mt-3 text-lg leading-8 text-yebo-deep/80">You message a few carpenters. Some never reply. Others want your details first and a fee from them later. Meanwhile the door still will not shut, or the cupboard is still hanging off the wall.</p>
              <p className="mt-3 text-lg leading-8 text-yebo-deep/80"><b>Yebo is different.</b> Real carpenters who run their business on Yebo are listed here with their phone number, their work and their reviews. You can call one now, or send one request to up to 3 of them and compare what comes back.</p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                {[["Not pay per lead", "Carpenters do not buy your details and Yebo does not sell them. They are on Yebo because it runs their quoting and invoicing."], ["Real people", "Prefer to talk? Call or WhatsApp the carpenter straight from this page."], ["Fair order", "Who you see first depends on profile, replies and a fair turn. The top spot is not for sale."]].map(([t, x]) => (
                  <li key={t} className="rounded-3xl bg-yebo-chalk p-5"><b className="block text-lg">{t}</b><span className="mt-1 block text-base leading-7 text-yebo-deep/75">{x}</span></li>
                ))}
              </ul>
            </div>

            <div id="carpenters" className="scroll-mt-20">
              <h2 className={h2}>{pros.length ? `Meet the carpenters for ${p.areaName}` : `Carpenters for ${p.areaName}`}</h2>
              {pros.length ? (
                <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {pros.map((x) => {
                    const l = links(x);
                    return (
                      <li key={x.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/5">
                        <div className="flex items-center gap-3">
                          <Logo x={x} size={56} />
                          <div className="min-w-0"><h3 className="truncate text-lg font-extrabold">{x.name}</h3><p className="text-sm text-yebo-deep/60">{x.since ? `Since ${x.since}` : "Carpenter"} · {p.areaName}</p></div>
                        </div>
                        {x.badges.length > 0 && <p className="mt-3 flex flex-wrap gap-2">{x.badges.map((b) => <span key={b} className="rounded-full bg-yebo-chalk px-3 py-1 text-xs font-bold">{b}</span>)}</p>}
                        {x.about && <p className="mt-3 text-sm leading-6 text-yebo-deep/75">{x.about}</p>}
                        {x.photos.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {x.photos.map((u) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={u} src={u} alt={`Work by ${x.name}`} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                            ))}
                          </div>
                        )}
                        {x.reviews.length > 0 && (
                          <ul className="mt-3 space-y-2">
                            {x.reviews.map((r, i) => <li key={i} className="rounded-xl bg-yebo-chalk p-3 text-sm leading-6">“{r.text}”<span className="mt-1 block text-xs font-bold text-yebo-deep/60">{r.name}{r.place ? `, ${r.place}` : ""}</span></li>)}
                            <li className="text-[11px] text-yebo-deep/45">Reviews supplied by {x.name}.</li>
                          </ul>
                        )}
                        {x.googleUrl && <a href={x.googleUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center rounded-full border border-ink/15 px-4 text-sm font-bold hover:underline" style={{ color: x.color }}>★ See reviews on Google</a>}
                        <ProActions id={x.id} page={p.slug} tel={l.tel} wa={l.wa} color={x.color} />
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
                  {photos.map((x) => (
                    <figure key={x.file} className="ph w-64 shrink-0 bg-white sm:w-auto">
                      <Image src={`/jobs/${x.file}.jpg`} alt={x.alt} width={900} height={1200} sizes="(min-width:640px) 30vw, 70vw" className="aspect-[3/4] w-full object-cover" />
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
              <h2 className={h2}>Why we are opening area by area</h2>
              <p className="mt-3 text-lg leading-8 text-yebo-deep/80">Yebo Opportunities is new, and we are rolling it out one trade and one area at a time, starting with carpenters in Gauteng. We would rather open a place when real carpenters are ready to reply than send your request into silence. So some areas have carpenters today and others are still being added. If your area has nobody yet, we tell you on the screen and keep nothing.</p>
              <p className="mt-3 text-lg leading-8 text-yebo-deep/80">Other trades will follow, one at a time. Are you a carpenter? <Link href="/login" className="font-bold underline">Sign in to Yebo</Link> and switch on Opportunities, or <Link href="/jobs" className="font-bold underline">see all local pages</Link>.</p>
            </div>

            <div>
              <h2 className={h2}>How it works</h2>
              <ol className="mt-4 grid gap-4 sm:grid-cols-3">
                {[["Tell us", "Pick what you need, add your suburb and WhatsApp. A photo is a bonus."], ["They reply", "Up to 3 carpenters for your area are alerted straight away."], ["You choose", "Compare quotes, or just call. Free, and no pressure."]].map(([t, x], i) => (
                  <li key={t} className="rounded-3xl bg-yebo-chalk p-5"><span className="grid size-9 place-items-center rounded-full bg-yebo text-base font-extrabold text-white">{i + 1}</span><b className="mt-3 block text-lg">{t}</b><span className="mt-1 block text-base leading-7 text-yebo-deep/75">{x}</span></li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className={h2}>Questions</h2>
              <div className="mt-4 space-y-3">
                {p.faq.map((f) => (
                  <details key={f.q} className="rounded-2xl bg-white p-4 shadow-sm">
                    <summary className="cursor-pointer text-lg font-bold">{f.q}</summary>
                    <p className="mt-2 text-lg leading-8 text-yebo-deep/75">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight">How we choose who you see</h2>
              <p className="mt-2 text-base leading-7 text-yebo-deep/70">Carpenters are ranked out of 100: up to 40 for a complete profile (logo, phone, about, work photos, reviews), up to 40 for how many local jobs they actually reply to, and up to 20 so everyone gets a turn. We do not sell the top spot, and carpenters do not pay per lead.</p>
              <h3 className="mt-6 text-base font-extrabold">{sameArea.length ? `More in ${p.areaName}` : "More local pages"}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {[...sameArea, ...nearby].slice(0, 8).map((o) => <li key={o.slug}><Link href={`/jobs/${o.slug}`} className="inline-flex min-h-11 items-center rounded-full bg-yebo-chalk px-4 text-sm font-bold hover:underline">{o.h1}</Link></li>)}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
