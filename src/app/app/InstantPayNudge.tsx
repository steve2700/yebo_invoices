"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "yebo:instant-pay-nudge";

// A quiet card for owners who have not added a PayShap number yet. "Not now" hides it on this device.
export default function InstantPayNudge() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem(KEY) === "1"); } catch { setHidden(false); }
  }, []);
  if (hidden) return null;
  return (
    <section className="mb-5 rounded-[1.5rem] border border-lime/60 bg-lime/15 p-4 sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange">Get paid faster</p>
      <h2 className="mt-1 text-lg font-black tracking-tight text-ink">Add instant payments, so weekend money shows straight away.</h2>
      <p className="mt-1 text-sm leading-6 text-ink/70">A normal EFT sent on a weekend can take until Monday or Tuesday. Add the cellphone number linked to your bank account (PayShap) and your quotes and invoices will offer clients an instant option first.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href="/app/settings#banking" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-black text-lime">Add it now</Link>
        <button type="button" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } setHidden(true); }} className="min-h-11 rounded-full px-4 text-sm font-bold text-ink/60">Not now</button>
      </div>
    </section>
  );
}
