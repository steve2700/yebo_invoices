import Link from "next/link";
import { billingEnforced } from "@/lib/access";

// Sign-up steps: 1 Your business, 2 Look professional, 3 Get paid, then (when billing is on) Choose a plan, then Welcome.
export const totalSteps = () => (billingEnforced() ? 5 : 4);

export function Progress({ step }: { step: number }) {
  const total = totalSteps();
  return (
    <div className="mb-6" role="group" aria-label={`Step ${step} of ${total}`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Step {step} of {total}</p>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
            {index < step && <span style={{ "--d": `${index * 0.15}s` } as React.CSSProperties} className="bar-grow block h-full w-full rounded-full bg-orange" />}
          </span>
        ))}
      </div>
    </div>
  );
}

export const field = "mt-2 w-full rounded-xl border border-ink/10 bg-paper/60 px-3.5 py-3 text-sm text-ink placeholder:text-ink/35 transition focus:border-orange focus:bg-white focus:outline-none";

export default function Frame({ step, eyebrow, headline, blurb, footnote, back, title, intro, error, children }: {
  step: number; eyebrow: string; headline: string; blurb: string; footnote: string; back?: string; title: string; intro?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(22,45,37,0.12)] ring-1 ring-black/5 lg:grid-cols-[.8fr_1.2fr]">
        <section className="relative overflow-hidden bg-ink px-7 py-9 text-paper sm:px-10 sm:py-12">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-lime/20 blur-2xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2 text-sm font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-lg bg-lime text-ink">Y</span> yebo</div>
            <div className="mt-auto pt-20">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-lime">{eyebrow}</p>
              <h1 className="max-w-sm text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{headline}</h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-paper/65">{blurb}</p>
              <div className="mt-9 flex items-center gap-3 text-xs text-paper/60"><span className="h-px w-10 bg-lime" /> {footnote}</div>
            </div>
          </div>
        </section>

        <section className="px-7 py-8 sm:px-10 sm:py-12">
          <Progress step={step} />
          {back && <Link href={back} className="mb-4 inline-flex min-h-10 items-center rounded-full px-1 text-sm font-bold text-ink/55 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"><span aria-hidden="true" className="mr-1">←</span> Back</Link>}
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h2>
          {intro && <p className="mt-2 text-sm leading-6 text-ink/55">{intro}</p>}
          {error && <div role="alert" className="mt-5 rounded-xl border border-orange/25 bg-orange/10 px-4 py-3 text-sm font-semibold text-ink">{error}</div>}
          {children}
        </section>
      </div>
    </main>
  );
}
