import PlanGrid from "@/components/PlanGrid";
import { PRICE_RANGE_LABEL } from "@/lib/plans";

const reasons = [
  { title: "You are the only one paying", text: "Free apps are paid for with your data or with ads. Yebo is paid for by the businesses that use it, so it works for them." },
  { title: "It costs money to run", text: "Every voice quote, PDF, email and secure payment has a cost. A fair monthly price keeps it fast and supported." },
  { title: "One paid quote covers it", text: "A quote that gets opened, accepted and paid on time more than covers a month." },
];

const oldVsYebo = [
  { vibe: "Writing it", old: "Fixing broken tables in Word or Excel at 9 PM.", yebo: "Speak it, check it, send it from your phone." },
  { vibe: "How it looks", old: "Plain text or a document that looks like a hobby.", yebo: "Your logo and colours on a clean page your client trusts." },
  { vibe: "Knowing where you stand", old: "No idea if they opened it or ignored it.", yebo: "You see when it is opened, accepted and paid." },
  { vibe: "Getting paid", old: "Texting clients for money.", yebo: "Clients pay by card or instant EFT. You get an alert, they get a receipt." },
  { vibe: "Chasing", old: "Trying to remember who owes you what.", yebo: "A one tap reminder with the message already written." },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-yebo-deep/10 bg-yebo-chalk py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        <h2 className="max-w-3xl text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] text-yebo-deep sm:text-5xl">Three plans, {PRICE_RANGE_LABEL} a month</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-yebo-deep/75">
          Pay monthly, cancel any time, and keep access until the end of the month you have paid for. Pick the plan that matches a normal month for your business. You can change it whenever you need to.
        </p>

        <div className="mt-10">
          <PlanGrid mode="landing" />
        </div>
        <p className="mt-5 text-sm leading-6 text-yebo-deep/65">&ldquo;Unlimited&rdquo; plans are subject to fair use. Items marked as coming soon are not part of your plan yet.</p>

        <h3 className="mt-16 text-2xl font-extrabold tracking-tight text-yebo-deep sm:text-3xl">The old way and the Yebo way</h3>
        <div className="mt-6 overflow-hidden rounded-lg border border-yebo-deep/15 bg-white">
          <div className="hidden grid-cols-[170px_1fr_1fr] gap-4 border-b border-yebo-deep/15 bg-yebo-chalk px-6 py-3 text-sm font-bold text-yebo-deep/70 sm:grid">
            <span />
            <span>The old way</span>
            <span className="text-yebo">The Yebo way</span>
          </div>
          <ul className="divide-y divide-yebo-deep/10">
            {oldVsYebo.map((row) => (
              <li key={row.vibe} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[170px_1fr_1fr] sm:gap-4 sm:px-6">
                <p className="font-bold text-yebo-deep">{row.vibe}</p>
                <p className="leading-6 text-yebo-deep/65"><span className="font-semibold sm:hidden">Old way: </span>{row.old}</p>
                <p className="leading-6 text-yebo-deep"><span className="font-semibold sm:hidden">Yebo: </span>{row.yebo}</p>
              </li>
            ))}
          </ul>
        </div>

        <h3 className="mt-16 text-2xl font-extrabold tracking-tight text-yebo-deep sm:text-3xl">Why Yebo is not free</h3>
        <ul className="mt-6 grid gap-8 md:grid-cols-3">
          {reasons.map((reason) => (
            <li key={reason.title} className="border-t-2 border-yebo-deep pt-4">
              <p className="font-bold text-yebo-deep">{reason.title}</p>
              <p className="mt-2 text-sm leading-6 text-yebo-deep/75">{reason.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
