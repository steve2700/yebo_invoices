import Link from "next/link";
import PhoneFrame from "@/components/PhoneFrame";
import { FEATURE_GROUPS } from "@/lib/features";

type Shot = { src: string; alt: string };

// Two real screenshots, slightly tilted and overlapping on a soft glow. On wide screens it stays in view while you read.
function PhoneStack({ screens, glow, light = false }: { screens: Shot[]; glow: string; light?: boolean }) {
  const shown = screens.slice(0, 2);
  return (
    <div className="relative mx-auto flex w-full max-w-[520px] justify-center py-6 lg:sticky lg:top-28 lg:justify-end lg:self-start">
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: `radial-gradient(55% 48% at 50% 46%, ${glow}, transparent 70%)` }} />
      {shown.map((s, k) => (
        <div
          key={s.src}
          className={`transition-transform duration-500 ease-out hover:z-10 hover:scale-[1.03] motion-reduce:transition-none ${
            shown.length > 1 ? (k === 0 ? "z-[1] -rotate-2" : "ml-1 mt-14 rotate-2 sm:ml-3") : ""
          }`}
        >
          <PhoneFrame src={s.src} alt={s.alt} tone={light || k % 2 ? "light" : "dark"} className={`${shown.length > 1 ? "w-[44vw] max-w-[230px] sm:w-[240px]" : "w-[62vw] max-w-[270px] sm:w-[270px]"}`} />
        </div>
      ))}
    </div>
  );
}

// One band per feature group on the landing page. Each shows the first few features and links to the full page.
export default function FeatureBands() {
  return (
    <div id="features" className="scroll-mt-24">
      {FEATURE_GROUPS.map((group, i) => {
        const flip = i % 2 === 1;
        const shown = group.features.slice(0, 4);
        const rest = group.features.length - shown.length;
        const onWhite = i % 2 === 0;
        return (
          <section
            key={group.slug}
            id={group.slug}
            className={`scroll-mt-24 overflow-hidden border-t border-yebo-deep/10 py-16 sm:py-24 ${onWhite ? "bg-white" : "bg-yebo-chalk"}`}
          >
            <div className={`mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-start lg:gap-16 lg:px-12 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <p className="flex items-center gap-3 text-sm font-extrabold uppercase tracking-[.14em] text-yebo">
                  <span className="grid size-8 place-items-center rounded-full bg-yebo-deep text-xs tracking-normal text-yebo-sun">{String(i + 1).padStart(2, "0")}</span>
                  {group.name}
                </p>
                <h2 className="mt-4 max-w-xl text-balance text-4xl font-extrabold leading-[1] tracking-[-.045em] text-yebo-deep sm:text-5xl lg:text-6xl">{group.title}</h2>
                <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-yebo-deep/75">{group.promise}</p>
                <dl className="mt-9 grid gap-3 sm:grid-cols-2">
                  {shown.map((f) => (
                    <div key={f.title} className={`rounded-2xl border border-yebo-deep/10 p-5 ${onWhite ? "bg-yebo-chalk" : "bg-white"}`}>
                      <dt className="flex items-start gap-2.5 text-base font-bold text-yebo-deep">
                        <svg viewBox="0 0 20 20" aria-hidden="true" className="mt-[3px] size-[18px] shrink-0 fill-yebo"><path d="M10 1.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zm4.1 6.9l-4.8 5a.9.9 0 01-1.3 0L5.9 11.3a.9.9 0 111.3-1.3l1.4 1.5 4.2-4.4a.9.9 0 111.3 1.3z" /></svg>
                        {f.title}
                      </dt>
                      <dd className="mt-2 text-sm leading-6 text-yebo-deep/70">{f.text}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href={`/features/${group.slug}`}
                  className="mt-8 inline-flex min-h-12 items-center rounded-lg border-2 border-yebo-deep px-5 text-base font-bold text-yebo-deep transition hover:bg-yebo-deep hover:text-white"
                >
                  {rest > 0 ? `All ${group.features.length} features: ${group.name}` : `More on ${group.name}`} <span aria-hidden="true" className="ml-2">&rarr;</span>
                </Link>
              </div>
              <PhoneStack screens={group.screens} glow={onWhite ? "rgba(15,138,95,.20)" : "rgba(242,178,27,.22)"} />
            </div>
          </section>
        );
      })}

      <section id="tenders" className="scroll-mt-24 border-t border-yebo-deep/10 bg-yebo-deep py-16 text-white sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-start lg:gap-16 lg:px-12">
          <div>
            <h2 className="max-w-xl text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] sm:text-5xl">Government tenders, without the paperwork panic</h2>
            <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              Live eTenders matched to your trade and province. Yebo reads the bill of quantities into lines, checks your CSD, SARS, B-BBEE and COIDA papers, and sends your bid in one email.
            </p>
            <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {[
                ["Tender hub", "New tenders every morning, filtered to your trade and area. Closed ones disappear."],
                ["The BOQ, already typed", "Excel BOQs are read exactly. PDFs are read by AI and anything unsure is marked, with the original text kept beside it."],
                ["Compliance vault", "Your papers are checked for expiry, with a warning 14 days ahead and a link to where to get each one."],
                ["How to submit", "The email or portal, the closing time and what to return, pulled from the tender documents."],
              ].map(([t, d]) => (
                <div key={t}>
                  <dt className="text-base font-bold">{t}</dt>
                  <dd className="mt-1 text-sm leading-6 text-white/75">{d}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 max-w-xl text-sm text-white/70">You approve every bid. Yebo never sends one on its own. Part of The Industry King plan, R499 a month.</p>
            <Link
              href="/tenders"
              className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-yebo-sun underline decoration-yebo-sun/40 underline-offset-4 transition hover:decoration-yebo-sun"
            >
              See how tenders work
            </Link>
          </div>
          <PhoneStack
            glow="rgba(242,178,27,.25)"
            screens={[
              { src: "/screens/app-tenders.webp", alt: "Yebo tenders list with the tender hub, compliance vault and open bids" },
              { src: "/screens/tender-boq.png", alt: "Yebo tender bid with the BOQ read into editable lines" },
            ]}
            light
          />
        </div>
      </section>
    </div>
  );
}
