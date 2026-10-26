import Link from "next/link";
import PhoneFrame from "@/components/PhoneFrame";
import { FEATURE_GROUPS } from "@/lib/features";

// One band per feature group on the landing page. Each shows the first few features and links to the full page.
export default function FeatureBands() {
  return (
    <div id="features" className="scroll-mt-24">
      {FEATURE_GROUPS.map((group, i) => {
        const flip = i % 2 === 1;
        const shown = group.features.slice(0, 4);
        const rest = group.features.length - shown.length;
        return (
          <section
            key={group.slug}
            id={group.slug}
            className={`scroll-mt-24 border-t border-yebo-deep/10 py-16 sm:py-24 ${i % 2 === 0 ? "bg-white" : "bg-yebo-chalk"}`}
          >
            <div className={`mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-start lg:gap-16 lg:px-12 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <h2 className="max-w-xl text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] text-yebo-deep sm:text-5xl">{group.title}</h2>
                <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-yebo-deep/70 sm:text-lg sm:leading-8">{group.promise}</p>
                <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  {shown.map((f) => (
                    <div key={f.title}>
                      <dt className="text-base font-bold text-yebo-deep">{f.title}</dt>
                      <dd className="mt-1 text-sm leading-6 text-yebo-deep/70">{f.text}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href={`/features/${group.slug}`}
                  className="mt-8 inline-flex min-h-11 items-center text-base font-semibold text-yebo underline decoration-yebo/30 underline-offset-4 transition hover:text-yebo-deep hover:decoration-yebo-deep"
                >
                  {rest > 0 ? `All ${group.features.length} features: ${group.name}` : `More on ${group.name}`}
                </Link>
              </div>
              <div className="flex justify-center gap-4 lg:justify-end">
                {group.screens.slice(0, 2).map((s, k) => (
                  <PhoneFrame
                    key={s.src}
                    src={s.src}
                    alt={s.alt}
                    tone={k % 2 ? "light" : "dark"}
                    className={`w-[44vw] max-w-[230px] sm:w-[230px] ${k === 1 ? "mt-10" : ""}`}
                  />
                ))}
              </div>
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
          <div className="flex justify-center gap-4 lg:justify-end">
            <PhoneFrame src="/screens/tenders-list.png" alt="Yebo tenders list with the tender hub, compliance vault and open bids" tone="light" className="w-[44vw] max-w-[230px] sm:w-[230px]" />
            <PhoneFrame src="/screens/tender-boq.png" alt="Yebo tender bid with the BOQ read into editable lines" tone="light" className="mt-10 w-[44vw] max-w-[230px] sm:w-[230px]" />
          </div>
        </div>
      </section>
    </div>
  );
}
