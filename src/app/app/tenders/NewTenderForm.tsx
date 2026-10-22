"use client";
import { useState } from "react";
import { createTender } from "./actions";
import BoqImporter from "./BoqImporter";
import { TENDER_CATEGORIES } from "@/lib/tenders";

const input = "mt-2 w-full rounded-xl border border-yebo-deep/10 bg-yebo-chalk/40 px-3.5 py-3 text-sm text-yebo-deep outline-none transition placeholder:text-yebo-deep/35 focus:border-yebo focus:bg-white focus:ring-4 focus:ring-yebo/10";
const label = "text-[11px] font-bold uppercase tracking-[0.14em] text-yebo-deep/55";

// Step 1: the tender's details. Step 2 (same page): import the BOQ.
export default function NewTenderForm() {
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const closing = String(fd.get("closing") ?? "");
    setBusy(true);
    const res = await createTender({
      title: String(fd.get("title") ?? ""),
      reference: String(fd.get("reference") ?? ""),
      clientName: String(fd.get("client") ?? ""),
      category: String(fd.get("category") ?? ""),
      location: String(fd.get("location") ?? ""),
      // The browser gives local time (the owner's phone is on South African time); the server stores it as a moment in time.
      closingAt: closing ? new Date(closing).toISOString() : "",
      submissionEmail: String(fd.get("email") ?? ""),
      notes: "",
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setId(res.id);
  }

  if (id) {
    return (
      <div className="flex flex-col gap-5">
        <p className="rounded-2xl bg-lime/25 px-4 py-3 text-sm font-semibold text-ink">Tender created. Now import its BOQ, or skip this and type the lines in yourself.</p>
        <BoqImporter tenderId={id} hasLines={false} onDone={() => { window.location.assign(`/app/tenders/${id}`); }} />
        <a href={`/app/tenders/${id}`} className="text-center text-sm font-bold text-yebo underline underline-offset-2">Skip and open the tender</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl border border-yebo-deep/10 bg-white p-5 shadow-sm sm:p-8">
      <label className={label}>Tender name
        <input name="title" required maxLength={200} placeholder="e.g. Mirrors and wall partitioning, Mahlamba" className={input} />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>Tender / RFQ number
          <input name="reference" maxLength={80} placeholder="e.g. RFQ 2026/114" className={input} />
        </label>
        <label className={label}>Who is asking for prices
          <input name="client" maxLength={160} placeholder="Department or company" className={input} />
        </label>
        <label className={label}>Trade category
          <select name="category" defaultValue="" className={input}>
            <option value="">Choose…</option>
            {TENDER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className={label}>Site / area
          <input name="location" maxLength={160} placeholder="e.g. Sandton, Gauteng" className={input} />
        </label>
        <label className={label}>Closing date and time
          <input name="closing" type="datetime-local" className={input} />
        </label>
        <label className={label}>Email the bid to
          <input name="email" type="email" inputMode="email" maxLength={200} placeholder="tenders@client.co.za" className={input} />
        </label>
      </div>
      {error && <p className="rounded-xl bg-orange/10 px-3 py-2 text-sm font-semibold text-ink" role="alert">{error}</p>}
      <button disabled={busy} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-yebo px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep disabled:opacity-50">
        {busy ? "Creating…" : "Next: import the BOQ"}
      </button>
    </form>
  );
}
