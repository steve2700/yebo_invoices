"use client";
import { useState } from "react";
import Link from "next/link";

const DOCS = ["CSD summary", "SARS tax compliance status", "B-BBEE sworn affidavit", "COIDA certificate"];

// A small example on the Yebo Tenders page: tap each paper to mark it ready, and the send button unlocks only when all four are.
// It is a demo of how the vault gate works. Nothing here is saved or sent.
export default function TenderDemo() {
  const [ready, setReady] = useState<boolean[]>(DOCS.map(() => false));
  const count = ready.filter(Boolean).length;
  const all = count === DOCS.length;

  return (
    <div className="rounded-3xl border border-yebo-deep/10 bg-white p-5 shadow-[0_18px_50px_rgba(12,59,46,0.12)] sm:p-6" aria-label="Example tender bid">
      <span className="inline-flex rounded-full bg-lime/40 px-3 py-1 text-xs font-bold text-yebo-deep">Carpentry &amp; Joinery · Example</span>
      <h2 className="mt-3 text-xl font-black tracking-tight text-yebo-deep">Supply and install office partitioning</h2>
      <p className="mt-0.5 text-sm text-yebo-deep/60">Example Department of Public Works</p>

      <div className="mt-4 flex items-baseline justify-between gap-3 rounded-2xl bg-yebo-deep px-4 py-3 text-white">
        <span className="text-sm text-white/75">Closes in</span>
        <span className="text-2xl font-black tabular-nums">6 days</span>
      </div>

      <p className="mt-5 flex items-baseline justify-between text-sm font-extrabold text-yebo-deep">
        Compliance vault <span className="text-xs font-semibold text-yebo-deep/55" aria-live="polite">{count} of {DOCS.length} ready</span>
      </p>
      <ul className="mt-2 grid gap-2">
        {DOCS.map((name, i) => (
          <li key={name}>
            <button
              type="button"
              aria-pressed={ready[i]}
              onClick={() => setReady((r) => r.map((v, j) => (j === i ? !v : v)))}
              className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-bold transition ${ready[i] ? "bg-lime/40 text-yebo-deep" : "bg-orange/10 text-yebo-deep"}`}
            >
              {name}
              <span className={`shrink-0 text-xs font-extrabold ${ready[i] ? "text-yebo-deep" : "text-orange"}`}>{ready[i] ? "✓ Ready" : "Needs attention"}</span>
            </button>
          </li>
        ))}
      </ul>

      {all ? (
        <Link href="/login" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-yebo px-5 text-sm font-extrabold text-white transition hover:bg-yebo-deep">Start your first bid</Link>
      ) : (
        <button type="button" disabled className="mt-4 min-h-12 w-full cursor-not-allowed rounded-xl bg-yebo-deep/10 px-5 text-sm font-extrabold text-yebo-deep/50">Submission locked until the vault is complete</button>
      )}
      <p className="mt-3 text-center text-xs text-yebo-deep/55">{all ? "Everything is in place. This is what a bid looks like when it is ready to go." : "Tap each paper to mark it ready. This is how Yebo stops an incomplete bid leaving your phone."}</p>
    </div>
  );
}
