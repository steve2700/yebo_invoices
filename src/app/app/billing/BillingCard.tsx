import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { entitlement, monthUsage } from "@/lib/subscription";
import { priceLabel } from "@/lib/plans";
import { formatSouthAfricaDateTime } from "@/lib/time";
import CancelPlanButton from "./CancelPlanButton";

function Usage({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="font-bold text-yebo-deep">{label}</p>
        <p className="tabular-nums text-yebo-deep/60"><b className="text-yebo-deep">{used}</b> {limit ? `of ${limit}` : "used · no limit"}</p>
      </div>
      {limit ? (
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-yebo-deep/10" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div style={{ width: `${Math.max(pct, 3)}%` }} className={`bar-grow h-full rounded-full ${pct >= 100 ? "bg-orange" : "bg-yebo"}`} />
        </div>
      ) : null}
    </div>
  );
}

// "Your plan" in Settings: what you are on, what you have used this month, and how to change or cancel it.
export default async function BillingCard() {
  const supabase = await createClient();
  const ent = await entitlement(supabase);
  if (!ent.enforced) return null;

  const usage = ent.allowed ? await monthUsage(supabase) : null;
  const until = ent.sub?.current_period_end ? formatSouthAfricaDateTime(ent.sub.current_period_end).split(",").slice(0, 2).join(",") : null;
  const status = ent.sub?.status;

  return (
    <section id="billing" className="scroll-mt-24 rounded-3xl border border-yebo-deep/10 bg-white px-6 py-7 shadow-[0_12px_40px_rgba(12,59,46,0.06)] sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-yebo">Your plan</p>
      {ent.allowed && ent.plan ? (
        <>
          <h2 className="mt-2 text-xl font-black">{ent.plan.name} <span className="text-sm font-semibold text-yebo-deep/50">{status === "comped" ? "· free access" : `· ${priceLabel(ent.plan.id)} a month`}</span></h2>
          <p className="mt-1 text-sm text-yebo-deep/60">
            {status === "cancelled" ? `Cancelled. You keep access until ${until}. You will not be charged again.` : status === "past_due" ? `Your last payment did not go through. Please check your PayFast details so your plan stays active past ${until}.` : status === "comped" ? "Your account has free access." : until ? `Active. Your plan is paid up to about ${until}.` : "Active."}
          </p>
          {usage && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Usage label="Quotes and invoices this month" used={usage.docs} limit={ent.plan.docsPerMonth} />
              <Usage label="Voice quotes this month" used={usage.voice} limit={ent.plan.voicePerMonth} />
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-start gap-3 border-t border-yebo-deep/10 pt-6">
            <Link href="/app/subscribe?change=1" className="inline-flex min-h-11 items-center rounded-xl bg-yebo px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep">Change plan</Link>
            {(status === "active" || status === "past_due") && <CancelPlanButton />}
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-2 text-xl font-black">You are not on a plan</h2>
          <p className="mt-1 text-sm text-yebo-deep/60">Choose a plan to create quotes and invoices again. Everything you have already sent stays available to your clients.</p>
          <Link href="/app/subscribe" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-yebo px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep">Choose a plan</Link>
        </>
      )}
    </section>
  );
}
