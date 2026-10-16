"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscription, type CancelResult } from "./actions";

// "Cancel my plan" with a clear confirmation step, a working state, and an honest result.
export default function CancelPlanButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CancelResult | null>(null);

  function cancel() {
    startTransition(async () => {
      const outcome = await cancelSubscription().catch(() => ({ ok: false as const, error: "Something went wrong and nothing was changed. Please try again." }));
      setResult(outcome);
      setConfirming(false);
      if (outcome.ok) router.refresh();
    });
  }

  if (result?.ok) {
    return (
      <p role="status" className="pop-in rounded-xl bg-lime/30 p-3 text-sm font-semibold leading-6 text-yebo-deep">
        Your plan is cancelled. You will not be charged again{result.until ? `, and you keep access until ${result.until}` : ""}.
      </p>
    );
  }

  return (
    <div>
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded-xl border border-yebo-deep/15 px-5 text-sm font-bold text-yebo-deep/70 transition hover:bg-yebo-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo">Cancel my plan</button>
      ) : (
        <div role="alertdialog" aria-label="Confirm cancelling your plan" className="fade-up rounded-2xl border border-orange/30 bg-orange/10 p-4">
          <p className="text-sm font-bold text-yebo-deep">Cancel your plan?</p>
          <p className="mt-1 text-sm leading-6 text-yebo-deep/70">You will not be charged again. You keep access until the end of the month you have already paid for.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={cancel} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yebo-deep px-5 text-sm font-extrabold text-white disabled:opacity-60">
              {pending && <span aria-hidden="true" className="spin inline-block size-4 rounded-full border-2 border-white border-t-transparent" />}
              {pending ? "Cancelling…" : "Yes, cancel my plan"}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-yebo-deep/70">Keep my plan</button>
          </div>
        </div>
      )}
      {result && !result.ok && <p role="alert" className="mt-3 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm font-semibold leading-6 text-yebo-deep">{result.error}</p>}
    </div>
  );
}
