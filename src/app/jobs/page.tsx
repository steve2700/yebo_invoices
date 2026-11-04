import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import { AREAS, PAGES, PHOTOS, photosFor } from "@/lib/opportunities";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Local carpenters in Gauteng: call one or get up to 3 quotes | Yebo",
  description: "Find a local carpenter in Gauteng. Call one now, or tell us once and up to 3 carpenters reply with a quote. Free to ask, and carpenters do not pay per lead.",
  alternates: { canonical: `${appUrl()}/jobs` },
  openGraph: { title: "Local carpenters in Gauteng | Yebo", description: "Call a carpenter now or get up to 3 quotes. Free to ask.", url: `${appUrl()}/jobs`, images: [`${appUrl()}/jobs/${PHOTOS[1].file}.jpg`] },
};

const css = `
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes drift{from{transform:scale(1)}to{transform:scale(1.08)}}
.rise{animation:rise .7s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--d,0s)}
.card img{transition:transform .7s ease}.card:hover img{transform:scale(1.06)}
.mosaic>*:nth-child(odd){animation:drift 18s ease-in-out infinite alternate}
@media (prefers-reduced-motion:reduce){.rise,.mosaic>*{animation:none}.card img{transition:none}}
`;
const d = (s: string) => ({ "--d": s }) as React.CSSProperties;
const h2 = "text-2xl font-extrabold tracking-tight sm:text-4xl";

// How many carpenters have switched Opportunities on for each area. Real numbers only.
async function readyByArea(): Promise<Record<string, number>> {
  try {
    const { data } = await createAdminClient().from("businesses").select("opp_areas").eq("opp_enabled", true).contains("opp_trades", ["carpenter"]).limit(500);
    const out: Record<string, number> = {};
    for (const b of data ?? []) for (const a of (b.opp_areas as string[] | null) ?? []) out[a] = (out[a] ?? 0) + 1;
    return out;
  } catch { return {}; }
}

export default async function Jobs() {
  const ready = await readyByArea();
  const mosaic = [PHOTOS[1], PHOTOS[7], PHOTOS[0], PHOTOS[4]];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: "Local carpenters in Gauteng", url: `${appUrl()}/jobs`, inLanguage: "en-ZA" },
      { "@type": "ItemList", itemListElement: PAGES.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${appUrl()}/jobs/${p.slug}`, name: p.h1 })) },
    ],
  };
  return (
    <>
      <LandingHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="text-yebo-deep">
        <section className="relative isolate overflow-hidden bg-yebo-deep text-white">
          <div aria-hidden="true" className="mosaic absolute inset-0 -z-20 grid grid-cols-2 sm:grid-cols-4">
            {mosaic.map((x) => (
              <div key={x.file} className="relative overflow-hidden">
                <Image src={`/jobs/${x.file}.jpg`} alt="" fill sizes="(min-width:640px) 25vw, 50vw" className="object-cover" priority />
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-yebo-deep/90 via-yebo-deep/85 to-yebo-deep" />
          <div className="mx-auto max-w-7xl px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-20 lg:px-12">
            <p className="rise inline-flex rounded-full bg-orange px-3 py-1 text-xs font-extrabold uppercase tracking-wider">New · opening area by area</p>
            <h1 className="rise mt-5 max-w-4xl text-balance text-[clamp(2.4rem,7vw,5rem)] font-extrabold leading-[.98] tracking-[-.045em]" style={d(".08s")}>A carpenter you can call today.</h1>
            <p className="rise mt-5 max-w-2xl text-pretty text-xl font-semibold leading-8 text-white/90" style={d(".16s")}>Something broke, or you are finally building that cupboard. You should not have to chase five people for a price. Call a local carpenter, or tell us once and up to 3 reply with a quote.</p>
            <div className="rise mt-7 flex flex-wrap gap-3" style={d(".24s")}>
              <a href="#pages" className="inline-flex min-h-12 items-center rounded-2xl bg-yebo px-6 text-base font-extrabold text-white transition active:scale-95">Find my area</a>
              <a href="#why" className="inline-flex min-h-12 items-center rounded-2xl bg-white/15 px-6 text-base font-extrabold ring-1 ring-white/40 transition hover:bg-white/25 active:scale-95">How it works</a>
            </div>
            <ul className="rise mt-7 flex flex-wrap gap-2 text-sm font-bold" style={d(".32s")}>
              {["Free to ask", "Real local carpenters", "Not pay per lead", "Call or WhatsApp directly"].map((t) => <li key={t} className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25"><span className="text-lime">✓</span> {t}</li>)}
            </ul>
          </div>
        </section>

        <section id="pages" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-14 sm:px-8 lg:px-12">
          <h2 className={h2}>Choose what you need</h2>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-yebo-deep/75">Each page shows the carpenters ready for that area, real photos of their work, and a short form. Areas without a carpenter yet say so.</p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PAGES.map((p) => {
              const photo = photosFor(p)[0];
              const n = ready[p.area] ?? 0;
              return (
                <li key={p.slug}>
                  <Link href={`/jobs/${p.slug}`} className="card group block overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-ink/5 transition hover:shadow-xl">
                    <div className="relative aspect-[4/3] overflow-hidden bg-yebo-chalk">
                      {photo && <Image src={`/jobs/${photo.file}.jpg`} alt={photo.alt} fill sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 90vw" className="object-cover" />}
                      <span className={"absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold " + (n > 0 ? "bg-yebo text-white" : "bg-white/90 text-yebo-deep")}>
                        {n > 0 ? `${n} carpenter${n === 1 ? "" : "s"} ready` : "Opening soon"}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-extrabold tracking-tight">{p.h1}</h3>
                      <p className="mt-2 text-base leading-7 text-yebo-deep/70">{p.feel}</p>
                      <span className="mt-4 inline-flex min-h-11 items-center font-extrabold text-yebo group-hover:underline">See carpenters and get quotes →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="why" className="scroll-mt-20 bg-yebo-chalk">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
            <h2 className={h2}>Why this is different</h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Not pay per lead", "Carpenters do not buy your details, and Yebo does not sell them. You can call a carpenter directly or send one request to up to 3 of them."],
                ["A fair, published order", "Who you see first depends on a complete profile, replying to jobs and how fast, and a fair turn. The top spot is not for sale."],
                ["Opening area by area", "Yebo Opportunities is new. We are opening one trade and one area at a time, starting with carpenters in Gauteng, so every request has someone ready to reply."],
              ].map(([t, x], i) => (
                <li key={t} className="rounded-3xl bg-white p-6 shadow-sm"><span className="grid size-10 place-items-center rounded-full bg-yebo text-lg font-extrabold text-white">{i + 1}</span><h3 className="mt-4 text-xl font-extrabold">{t}</h3><p className="mt-2 text-base leading-7 text-yebo-deep/75">{x}</p></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
          <h2 className={h2}>Real work, by carpenters on Yebo</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PHOTOS.slice(0, 8).map((x) => (
              <figure key={x.file} className="card relative aspect-[3/4] overflow-hidden rounded-2xl">
                <Image src={`/jobs/${x.file}.jpg`} alt={x.alt} fill sizes="(min-width:640px) 25vw, 50vw" className="object-cover" />
              </figure>
            ))}
          </div>
        </section>

        <section className="bg-yebo-deep text-white">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
            <h2 className={h2}>Are you a carpenter in Gauteng?</h2>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-white/80">Get found by homeowners in your area, with your phone number, your work and your reviews on the page. Opportunities is part of Yebo, which also runs your quotes, invoices and payments. Pick your areas, switch it on, and reply fast.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex min-h-12 items-center rounded-2xl bg-lime px-6 text-base font-extrabold text-yebo-deep transition active:scale-95">Join Yebo</Link>
              <Link href="/how-it-works" className="inline-flex min-h-12 items-center rounded-2xl bg-white/15 px-6 text-base font-extrabold ring-1 ring-white/40 transition hover:bg-white/25">See how Yebo works</Link>
            </div>
            <p className="mt-8 text-sm text-white/60">Areas: {AREAS.map((a) => a.label).join(", ")}. More to come.</p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
