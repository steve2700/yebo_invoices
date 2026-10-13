import Link from "next/link";
import Reveal from "@/components/Reveal";
import { PRO_FEATURES, PRO_PRICE_LABEL } from "@/lib/plans";

const reasons = [
  {
    title: "Your money is the only money",
    text: "Free apps have to be paid for somehow, usually with your data or with ads. Yebo is paid for by you and no one else, so Yebo works for you and nobody else.",
  },
  {
    title: "It costs real money to run",
    text: "Every voice quote, every PDF, every email and every secure payment has a cost. A fair monthly price keeps all of it fast, reliable and supported.",
  },
  {
    title: "It pays for itself",
    text: "One quote that is opened, accepted and paid on time more than covers a month. When you pay for something, you use it, and using it is what makes the difference.",
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 bg-yebo-chalk py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
        <Reveal>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">One plan. Everything included.</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[.98] tracking-[-.06em] text-yebo-deep sm:text-5xl">
            {PRO_PRICE_LABEL} a month. Send as many quotes as you like.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-yebo-deep/65">
            No tiers to compare and no limits to watch. One simple price for the whole tool.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <Reveal>
            <div className="h-full rounded-[2rem] bg-white p-7 shadow-[0_24px_70px_-40px_rgba(12,59,46,.45)] ring-1 ring-yebo-deep/10 sm:p-9">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-yebo">Yebo Pro</p>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-[-.05em] text-yebo-deep">{PRO_PRICE_LABEL}</span>
                <span className="text-base font-semibold text-yebo-deep/55">per month</span>
              </p>
              <p className="mt-2 text-sm text-yebo-deep/60">Cancel any time. You keep access until the end of the month you have paid for.</p>
              <ul className="mt-7 flex flex-col gap-3.5">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm font-semibold leading-6 text-yebo-deep">
                    <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-yebo text-[11px] font-black text-white">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-yebo px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-yebo/15 transition hover:-translate-y-0.5 hover:bg-yebo-deep">
                Get started <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <p className="mt-3 text-center text-xs text-yebo-deep/50">
                By continuing you agree to the <Link className="underline underline-offset-2" href="/terms">Terms</Link> and <Link className="underline underline-offset-2" href="/privacy">Privacy Notice</Link>.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="h-full rounded-[2rem] border border-yebo-deep/10 bg-yebo-deep p-7 text-white sm:p-9">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-lime">Why isn&apos;t Yebo free?</p>
              <h3 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight">An honest answer.</h3>
              <ul className="mt-6 flex flex-col gap-6">
                {reasons.map((reason) => (
                  <li key={reason.title}>
                    <p className="font-extrabold text-white">{reason.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-white/70">{reason.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
