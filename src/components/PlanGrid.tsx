import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { PLANS, PLAN_ORDER, priceLabel, type PlanId } from "@/lib/plans";

type Props = {
  mode: "landing" | "subscribe";
  currentPlan?: PlanId | null;
  onboarding?: boolean;
  renewable?: boolean; // their own plan is cancelled or failed: let them pay again
};

// The three plans side by side. On the landing page the buttons lead to sign-in. On the subscribe step they start checkout.
// Only the recommended plan gets a filled button, so there is one obvious choice.
export default function PlanGrid({ mode, currentPlan = null, onboarding = false, renewable = false }: Props) {
  return (
    <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        const isCurrent = currentPlan === id;
        // Someone choosing a plan for the first time is led to the cheapest way in. Everyone else keeps the usual recommendation.
        const startHere = mode === "subscribe" && !currentPlan && id === "side";
        const filled = mode === "subscribe" && !currentPlan ? startHere : Boolean(plan.recommended);
        const btn = filled
          ? "bg-yebo text-white hover:bg-yebo-deep"
          : "border-2 border-yebo-deep/25 text-yebo-deep hover:bg-yebo-chalk";
        return (
          <article
            key={id}
            className={`relative flex flex-col rounded-lg bg-white p-6 sm:p-7 ${startHere ? "ring-2 ring-yebo shadow-md" : plan.recommended ? "ring-2 ring-yebo" : "ring-1 ring-yebo-deep/15"}`}
          >
            <h3 className="flex items-center gap-3 text-lg font-extrabold text-yebo-deep">
              {plan.name}
              {startHere && <span className="rounded bg-lime px-2 py-0.5 text-xs font-bold text-ink">Easiest start</span>}
              {plan.recommended && <span className="rounded bg-yebo-sun px-2 py-0.5 text-xs font-bold text-yebo-deep">Most picked</span>}
            </h3>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-5xl font-black tracking-[-.04em] text-yebo-deep">{priceLabel(id)}</span>
              <span className="text-sm font-semibold text-yebo-deep/65">per month</span>
            </p>
            {id === "side" && <p className="mt-2 text-sm font-bold text-yebo">About the price of a cold drink and a pie. Stay organised for once.</p>}
            <p className="mt-2 text-base font-bold text-yebo-deep">{plan.tagline}</p>
            <p className="mt-1 text-sm text-yebo-deep/70">{plan.revenue}. {plan.who}</p>

            <ul className="mt-5 flex flex-col gap-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm leading-6 text-yebo-deep">
                  <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-sm bg-yebo" />
                  {feature}
                </li>
              ))}
            </ul>

            {plan.comingSoon.length > 0 && (
              <div className="mt-5 border-t border-yebo-deep/10 pt-4">
                <p className="text-sm font-bold text-yebo-deep/70">Coming soon, not included yet</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {plan.comingSoon.map((item) => (
                    <li key={item} className="text-sm leading-5 text-yebo-deep/65">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {plan.catchLine && <p className="mt-5 border-t border-yebo-deep/10 pt-4 text-sm leading-6 text-yebo-deep/80"><b>Worth knowing:</b> {plan.catchLine}</p>}

            <div className="mt-auto pt-7">
              {mode === "landing" ? (
                <Link href="/login" className={`inline-flex min-h-12 w-full items-center justify-center rounded-md px-6 py-3 text-sm font-bold transition ${btn}`}>
                  Get {plan.name}
                </Link>
              ) : isCurrent && !renewable ? (
                <p className="rounded-md bg-yebo-chalk px-6 py-3 text-center text-sm font-bold text-yebo-deep">Your current plan</p>
              ) : (
                <form method="post" action="/app/subscribe/checkout">
                  <input type="hidden" name="plan" value={id} />
                  {onboarding && <input type="hidden" name="onboarding" value="1" />}
                  <SubmitButton
                    pendingLabel="Taking you to secure payment…"
                    className={`inline-flex min-h-12 w-full items-center justify-center rounded-md px-6 py-3 text-sm font-bold transition ${btn}`}
                  >
                    {isCurrent ? `Keep ${plan.name} (${priceLabel(id)} a month)` : currentPlan ? `Switch to ${plan.name}` : startHere ? `Start for ${priceLabel(id)} a month` : `Subscribe for ${priceLabel(id)} a month`}
                  </SubmitButton>
                  <p className="mt-2 text-center text-xs font-semibold text-yebo-deep/60">Cancel or change plan any time</p>
                </form>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
