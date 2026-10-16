import Reveal from "@/components/Reveal";
import PlanGrid from "@/components/PlanGrid";
import { PRICE_RANGE_LABEL } from "@/lib/plans";

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
    text: "One quote that is opened, accepted and paid on time more than covers a month. And when you pay for something, you actually use it, which is what makes the difference.",
  },
];

const oldVsYebo = [
  { vibe: "Writing it", old: "Fixing broken tables in Word or Excel on a laptop at 9 PM.", yebo: "Speak it, check it, send it. From your phone, in minutes." },
  { vibe: "How it looks", old: "Plain text or a basic document that looks like a hobby.", yebo: "Your logo and colours, on a clean page your client trusts." },
  { vibe: "Knowing where you stand", old: "No idea if they opened it, or if they ignored it.", yebo: "You see when it is opened, accepted and paid." },
  { vibe: "Getting paid", old: "Awkwardly texting clients for money.", yebo: "Clients pay by card or instant EFT. You get an alert, they get a receipt." },
  { vibe: "Chasing", old: "Remembering who owes you what.", yebo: "A one-tap reminder with the message already written." },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 bg-yebo-chalk py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        <Reveal>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Pricing</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[.98] tracking-[-.06em] text-yebo-deep sm:text-5xl">
            Three plans, {PRICE_RANGE_LABEL} a month. Pick the one that matches your business.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-yebo-deep/65">
            Pay monthly, cancel any time, and keep access until the end of the month you have paid for. Not sure? Pick the plan that matches what you earn in a normal month. You can change it whenever your business changes.
          </p>
        </Reveal>

        <div className="mt-12">
          <PlanGrid mode="landing" />
        </div>
        <p className="mt-6 text-xs leading-6 text-yebo-deep/50">&ldquo;Unlimited&rdquo; plans are subject to fair use. Items marked &ldquo;Coming soon&rdquo; are not part of your plan yet.</p>

        <Reveal className="mt-20">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">The old way vs the Yebo way</p>
          <h3 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-[-.04em] text-yebo-deep sm:text-4xl">Same job. Very different Tuesday.</h3>
          <div className="mt-8 overflow-hidden rounded-3xl border border-yebo-deep/10 bg-white">
            <div className="hidden grid-cols-[170px_1fr_1fr] gap-4 border-b border-yebo-deep/10 bg-yebo-chalk/60 px-6 py-3 text-[11px] font-extrabold uppercase tracking-[.1em] text-yebo-deep/50 sm:grid">
              <span />
              <span>The old way</span>
              <span className="text-yebo">The Yebo way</span>
            </div>
            <ul className="divide-y divide-yebo-deep/10">
              {oldVsYebo.map((row) => (
                <li key={row.vibe} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[170px_1fr_1fr] sm:gap-4 sm:px-6">
                  <p className="font-extrabold text-yebo-deep">{row.vibe}</p>
                  <p className="leading-6 text-yebo-deep/55"><span aria-hidden="true" className="mr-1.5 font-black text-orange">✕</span>{row.old}</p>
                  <p className="font-semibold leading-6 text-yebo-deep"><span aria-hidden="true" className="mr-1.5 font-black text-yebo">✓</span>{row.yebo}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal className="mt-20" delay={0.05}>
          <div className="rounded-[2rem] bg-yebo-deep p-7 text-white sm:p-10">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-lime">Why isn&apos;t Yebo free?</p>
            <h3 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight">An honest answer.</h3>
            <ul className="mt-8 grid gap-8 md:grid-cols-3">
              {reasons.map((reason) => (
                <li key={reason.title}>
                  <p className="font-extrabold text-white">{reason.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">{reason.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
