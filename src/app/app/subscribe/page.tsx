import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAccess, planOf } from "@/lib/access";
import { loadSubscription } from "@/lib/subscription";
import { yeboPayfast } from "@/lib/billing-config";
import PlanGrid from "@/components/PlanGrid";

const reasons: Record<string, string> = {
  documents: "You have used all the quotes and invoices on your plan this month. A bigger plan keeps you going.",
  expired: "Your plan has ended. Choose a plan to carry on where you left off.",
};

export default async function Subscribe({ searchParams }: { searchParams: Promise<{ reason?: string; onboarding?: string; change?: string }> }) {
  const { reason, onboarding, change } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase.from("businesses").select("id").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const sub = await loadSubscription(supabase);
  const active = hasAccess(sub);
  // Someone who is already paid up only sees this page when they choose to change plan.
  if (active && !change && !reason) redirect(onboarding ? "/app/onboarding/welcome" : "/app");

  const testMode = yeboPayfast()?.sandbox ?? false;
  const paymentsReady = Boolean(yeboPayfast());

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      {onboarding && (
        <div className="mb-8" role="group" aria-label="Step 3 of 4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Step 3 of 4</p>
          <div className="mt-2 flex max-w-sm gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                {index < 3 && <span style={{ "--d": `${index * 0.15}s` } as React.CSSProperties} className="bar-grow block h-full w-full rounded-full bg-orange" />}
              </span>
            ))}
          </div>
        </div>
      )}

      <header className="fade-up max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Choose your plan</p>
        <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-.05em] text-ink sm:text-5xl">Pick the one that matches your business.</h1>
        <p className="mt-4 text-base leading-7 text-ink/65">Pay monthly. Cancel any time, and you keep access until the end of the month you have paid for. You pay securely on PayFast, and Yebo never sees your card details.</p>
      </header>

      {reason && reasons[reason] && <p role="status" className="mt-6 max-w-3xl rounded-2xl border border-orange/30 bg-orange/10 p-4 text-sm font-semibold text-ink">{reasons[reason]}</p>}
      {testMode && <p role="note" className="mt-6 max-w-3xl rounded-2xl bg-lime/30 p-4 text-sm font-semibold text-ink">Test mode: payments here are practice only and no real money is taken.</p>}
      {!paymentsReady && <p role="alert" className="mt-6 max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">Subscriptions are not switched on yet. Please check back soon.</p>}

      <div className="mt-10">
        <PlanGrid mode="subscribe" currentPlan={active ? planOf(sub) : null} onboarding={Boolean(onboarding)} />
      </div>

      <p className="mt-8 max-w-3xl text-xs leading-6 text-ink/50">
        By subscribing you agree to the <Link className="underline underline-offset-2" href="/terms">Terms of Service</Link> and the <Link className="underline underline-offset-2" href="/privacy">Privacy Notice</Link>. &ldquo;Unlimited&rdquo; plans are subject to fair use. Your plan renews every month until you cancel in Settings.
      </p>
    </main>
  );
}
