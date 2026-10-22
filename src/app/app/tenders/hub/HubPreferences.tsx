"use client";
import { useState } from "react";
import { saveTenderPreferences } from "./actions";
import { TENDER_CATEGORIES } from "@/lib/tenders";
import { PROVINCES } from "@/lib/tender-feed";

type Props = {
  initial: { categories: string[]; provinces: string[]; autoDraft: boolean; emailAlerts: boolean; markupPercent: number };
  startOpen: boolean;
};

const chip = (on: boolean) =>
  `min-h-10 rounded-full px-3.5 text-sm font-bold transition ${on ? "bg-ink text-white" : "border border-ink/15 bg-white text-ink/70 hover:border-yebo"}`;

export default function HubPreferences({ initial, startOpen }: Props) {
  const [open, setOpen] = useState(startOpen);
  const [categories, setCategories] = useState<string[]>(initial.categories);
  const [provinces, setProvinces] = useState<string[]>(initial.provinces);
  const [autoDraft, setAutoDraft] = useState(initial.autoDraft);
  const [emailAlerts, setEmailAlerts] = useState(initial.emailAlerts);
  const [markup, setMarkup] = useState(String(initial.markupPercent));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  async function save() {
    setSaving(true); setMsg(null);
    const res = await saveTenderPreferences({
      categories, provinces, autoDraft, emailAlerts, markupPercent: Number(markup.replace(",", ".")),
    });
    setSaving(false);
    if (res.ok) { setMsg({ ok: true, text: "Saved. Your matches are updated." }); setTimeout(() => window.location.assign("/app/tenders/hub"), 600); }
    else setMsg({ ok: false, text: res.error });
  }

  return (
    <section className="mt-5 rounded-3xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="block text-sm font-black text-ink">My trades and area</span>
          <span className="mt-0.5 block text-sm text-ink/60">
            {categories.length ? `${categories.length} trade${categories.length === 1 ? "" : "s"} · ${provinces.length ? provinces.join(", ") : "all provinces"}${autoDraft ? " · auto-draft on" : ""}` : "Choose your trades to see matching tenders"}
          </span>
        </span>
        <span className="shrink-0 text-sm font-bold text-yebo">{open ? "Hide" : "Edit"}</span>
      </button>

      {open && (
        <div className="mt-5 flex flex-col gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/55">Trades I bid for</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TENDER_CATEGORIES.filter((c) => c !== "Other").map((c) => (
                <button key={c} type="button" aria-pressed={categories.includes(c)} onClick={() => toggle(categories, setCategories, c)} className={chip(categories.includes(c))}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/55">Where I can work <span className="font-semibold normal-case tracking-normal text-ink/45">(none picked = anywhere)</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROVINCES.map((p) => (
                <button key={p} type="button" aria-pressed={provinces.includes(p)} onClick={() => toggle(provinces, setProvinces, p)} className={chip(provinces.includes(p))}>{p}</button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-yebo-chalk p-4">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={autoDraft} onChange={(e) => setAutoDraft(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[#0F8A5F]" />
              <span>
                <span className="block text-sm font-extrabold text-ink">Auto-draft new matching tenders</span>
                <span className="mt-0.5 block text-sm leading-5 text-ink/65">Every morning Yebo opens a draft bid for new tenders that match your trades and area. You upload the BOQ, check every line and approve. Nothing is ever sent without you.</span>
              </span>
            </label>
            <label className="mt-3 flex items-start gap-3">
              <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[#0F8A5F]" />
              <span className="text-sm font-semibold text-ink">Email me when drafts are ready</span>
            </label>
          </div>

          <label className="max-w-xs text-[11px] font-bold uppercase tracking-[0.14em] text-ink/55">Usual markup on my rates (%)
            <input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-xl border border-yebo-deep/10 bg-yebo-chalk/40 px-3.5 py-3 text-sm text-yebo-deep outline-none focus:border-yebo focus:bg-white focus:ring-4 focus:ring-yebo/10" />
            <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-ink/50">Pre-filled in the &ldquo;Add to all rates&rdquo; box on every tender.</span>
          </label>

          {msg && <p role="status" className={`rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-lime/25 text-ink" : "bg-orange/10 text-ink"}`}>{msg.text}</p>}
          <button type="button" onClick={save} disabled={saving} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-yebo px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep disabled:opacity-50">
            {saving ? "Saving…" : "Save my preferences"}
          </button>
        </div>
      )}
    </section>
  );
}
