"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveVault } from "./actions";
import type { Vault, VaultCheck } from "@/lib/tenders";

const input = "mt-2 w-full rounded-xl border border-yebo-deep/10 bg-yebo-chalk/40 px-3.5 py-3 text-sm text-yebo-deep outline-none transition placeholder:text-yebo-deep/35 focus:border-yebo focus:bg-white focus:ring-4 focus:ring-yebo/10";
const label = "text-[11px] font-bold uppercase tracking-[0.14em] text-yebo-deep/55";
const MAX_FILE = 15 * 1024 * 1024;

type Key = "csd" | "sars" | "bbbee" | "coida";
const fileName = (p: string | null) => (p ? p.split("/").pop()!.replace(/^\d+-/, "") : "");

export default function VaultForm({ userId, initial, checks }: { userId: string; initial: Vault | null; checks: VaultCheck[] }) {
  const [csd, setCsd] = useState(initial?.csd_number ?? "");
  const [sarsPin, setSarsPin] = useState(initial?.sars_pin ?? "");
  const [sarsExpiry, setSarsExpiry] = useState(initial?.sars_expiry ?? "");
  const [level, setLevel] = useState(initial?.bbbee_level ? String(initial.bbbee_level) : "");
  const [bbbeeExpiry, setBbbeeExpiry] = useState(initial?.bbbee_expiry ?? "");
  const [coidaExpiry, setCoidaExpiry] = useState(initial?.coida_expiry ?? "");
  const [paths, setPaths] = useState<Record<Key, string | null>>({
    csd: initial?.csd_path ?? null, sars: initial?.sars_path ?? null, bbbee: initial?.bbbee_path ?? null, coida: initial?.coida_path ?? null,
  });
  const [uploading, setUploading] = useState<Key | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(key: Key, file: File | undefined) {
    if (!file) return;
    setMessage(null);
    if (file.size > MAX_FILE) { setMessage({ ok: false, text: "That file is over 15 MB. Compress it first." }); return; }
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { setMessage({ ok: false, text: "Use a PDF, JPG or PNG file." }); return; }
    setUploading(key);
    const sb = createClient();
    const path = `${userId}/compliance/${key}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]+/gi, "_").slice(-80)}`;
    const { error } = await sb.storage.from("tender-files").upload(path, file, { upsert: true, contentType: file.type || undefined });
    setUploading(null);
    if (error) { setMessage({ ok: false, text: "The upload failed. Check your signal and try again." }); return; }
    setPaths((p) => ({ ...p, [key]: path }));
    setMessage({ ok: true, text: `${file.name} uploaded. Tap Save to keep it.` });
  }

  async function save() {
    setSaving(true); setMessage(null);
    const res = await saveVault({
      csdNumber: csd, csdPath: paths.csd, sarsPin, sarsExpiry, sarsPath: paths.sars,
      bbbeeLevel: level ? Number(level) : null, bbbeeExpiry, bbbeePath: paths.bbbee, coidaExpiry, coidaPath: paths.coida,
    });
    setSaving(false);
    if (res.ok) { setMessage({ ok: true, text: "Saved. Your checks are updated." }); setTimeout(() => window.location.reload(), 700); }
    else setMessage({ ok: false, text: res.error });
  }

  const check = (k: Key) => checks.find((c) => c.key === k);
  const fileField = (k: Key) => (
    <div className="mt-4">
      <p className={label}>Document</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input id={`vault-${k}`} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => upload(k, e.target.files?.[0])} />
        <label htmlFor={`vault-${k}`} className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-yebo-deep/15 bg-yebo-chalk px-4 text-sm font-bold text-ink hover:border-yebo">
          {uploading === k ? "Uploading…" : paths[k] ? "Replace file" : "Upload file"}
        </label>
        <span className="min-w-0 truncate text-sm text-ink/60">{paths[k] ? fileName(paths[k]) : "PDF, JPG or PNG, up to 15 MB"}</span>
      </div>
    </div>
  );
  // Plain functions (not components), so typing in a field never remounts it and loses focus.
  const card = (k: Key, title: string, children: React.ReactNode) => {
    const c = check(k);
    return (
      <section id={k} className="rounded-3xl border border-yebo-deep/10 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-ink">{title}</h2>
          {c && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${c.ok ? "bg-lime/40 text-yebo-deep" : "bg-orange/15 text-orange"}`}>{c.ok ? "✓ Valid" : "✗ Needs update"}</span>}
        </div>
        {c && <p className={`mt-1 text-sm ${c.ok ? "text-ink/60" : "font-semibold text-ink"}`}>{c.detail}</p>}
        {children}
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {card("csd", "CSD Summary (Central Supplier Database)", <>
        <label className={`${label} mt-4 block`}>Supplier number
          <input value={csd} onChange={(e) => setCsd(e.target.value)} placeholder="MAAA0000000" maxLength={12} autoCapitalize="characters" className={input} />
        </label>
        {fileField("csd")}
      </>)}
      {card("sars", "SARS Tax Compliance Status", <>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={label}>Compliance PIN<input value={sarsPin} onChange={(e) => setSarsPin(e.target.value)} placeholder="e.g. 93810283PIN" maxLength={40} className={input} /></label>
          <label className={label}>Valid until<input type="date" value={sarsExpiry} onChange={(e) => setSarsExpiry(e.target.value)} className={input} /></label>
        </div>
        {fileField("sars")}
      </>)}
      {card("bbbee", "B-BBEE Sworn Affidavit", <>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={label}>B-BBEE level
            <select value={level} onChange={(e) => setLevel(e.target.value)} className={input}>
              <option value="">Choose…</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>Level {n}</option>)}
            </select>
          </label>
          <label className={label}>Valid until<input type="date" value={bbbeeExpiry} onChange={(e) => setBbbeeExpiry(e.target.value)} className={input} /></label>
        </div>
        {fileField("bbbee")}
      </>)}
      {card("coida", "COIDA Letter of Good Standing", <>
        <label className={`${label} mt-4 block`}>Valid until<input type="date" value={coidaExpiry} onChange={(e) => setCoidaExpiry(e.target.value)} className={input} /></label>
        {fileField("coida")}
      </>)}
      {message && <p role="status" className={`rounded-xl px-3 py-2 text-sm font-semibold ${message.ok ? "bg-lime/25 text-ink" : "bg-orange/10 text-ink"}`}>{message.text}</p>}
      <button type="button" onClick={save} disabled={saving || uploading !== null} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-yebo px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep disabled:opacity-50">
        {saving ? "Saving…" : "Save vault"}
      </button>
    </div>
  );
}
