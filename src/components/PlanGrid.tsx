import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { PLANS, PLAN_ORDER, priceLabel, type PlanId } from "@/lib/plans";

type Props = {
  mode: "landing" | "subscribe";
  currentPlan?: PlanId | null;
  onboarding?: boolean;
};

// The three plans side by side. On the landing page the buttons lead to sign-in. On the subscribe step they start checkout.
export default function PlanGrid({ mode, currentPlan = null, onboarding = false }: Props) {
  return (
    <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
      {PLAN_ORDER.map((id, index) => {
        const plan = PLANS[id];
        const isCurrent = currentPlan === id;
        return (
          <article
            key={id}
            style={{ "--d": `${index * 0.1}s` } as React.CSSProperties}
            className={`fade-up relative flex flex-col rounded-[2rem] bg-white p-6 sm:p-7 ${plan.recommended ? "order-first shadow-[0_28px_80px_-40px_rgba(12,59,46,.6)] ring-2 ring-yebo lg:order-none" : "ring-1 ring-yebo-deep/10"}`}
          >
            {plan.recommended && (
              <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yebo px-4 py-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-white">Recommended</p>
            )}
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-yebo">{plan.name}</p>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-5xl font-black tracking-[-.05em] text-yebo-deep">{priceLabel(id)}</span>
              <span className="text-sm font-semibold text-yebo-deep/55">per month</span>
            </p>
            <p className="mt-2 text-sm font-bold text-yebo-deep">{plan.tagline}</p>
            <p className="mt-3 inline-flex w-fit rounded-full bg-yebo-chalk px-3 py-1 text-[11px] font-bold text-yebo-deep/70">{plan.revenue}</p>
            <p className="mt-3 text-sm leading-6 text-yebo-deep/65">{plan.who}</p>
            <p className="mt-3 border-l-4 border-orange pl-3 text-sm font-semibold italic leading-6 text-yebo-deep">{plan.roast}</p>

            <ul className="mt-5 flex flex-col gap-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-yebo-deep">
                  <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-yebo text-[11px] font-black text-white">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {plan.comingSoon.length > 0 && (
              <div className="mt-5 rounded-2xl bg-yebo-chalk/70 p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-yebo-deep/50">Coming soon</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {plan.comingSoon.map((item) => (
                    <li key={item} className="text-xs font-semibold leading-5 text-yebo-deep/55">· {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {plan.catchLine && (
              <p className="mt-5 rounded-2xl bg-orange/10 p-4 text-xs font-semibold leading-5 text-yebo-deep"><b>The catch:</b> {plan.catchLine}</p>
            )}

            <div className="mt-auto pt-7">
              {mode === "landing" ? (
                <Link href="/login" className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold transition hover:-translate-y-0.5 ${plan.recommended ? "bg-yebo text-white shadow-lg shadow-yebo/20 hover:bg-yebo-deep" : "border-2 border-yebo-deep/15 text-yebo-deep hover:bg-yebo-chalk"}`}>
                  Get {plan.name} <span aria-hidden="true" className="ml-2">→</span>
                </Link>
              ) : isCurrent ? (
                <p className="rounded-full bg-lime/40 px-6 py-3 text-center text-sm font-extrabold text-yebo-deep">Your current plan</p>
              ) : (
                <form method="post" action="/app/subscribe/checkout">
                  <input type="hidden" name="plan" value={id} />
                  {onboarding && <input type="hidden" name="onboarding" value="1" />}
                  <SubmitButton
                    pendingLabel="Taking you to PayFast…"
                    className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold transition hover:-translate-y-0.5 ${plan.recommended ? "bg-yebo text-white shadow-lg shadow-yebo/20 hover:bg-yebo-deep" : "border-2 border-yebo-deep/15 text-yebo-deep hover:bg-yebo-chalk"}`}
                  >
                    {currentPlan ? `Switch to ${plan.name}` : `Subscribe for ${priceLabel(id)} a month`}
                  </SubmitButton>
                </form>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
