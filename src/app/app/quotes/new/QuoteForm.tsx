"use client";
import { useState, useTransition } from "react";
import { createQuote } from "./actions";
import { formatRand } from "@/lib/money";

type Client = { id: string; name: string; whatsapp_number: string | null; address: string | null; preferred_payment: string | null };
type Item = { description: string; default_price_cents: number };
type Plan = "after" | "deposit" | "full";

const box = "mt-1 w-full rounded-xl border px-3 py-2";
const lbl = "mt-4 block text-sm font-semibold text-neutral-600";

export default function QuoteForm({ clients, items, vatRegistered }: { clients: Client[]; items: Item[]; vatRegistered: boolean }) {
  const [clientId, setClientId] = useState("");
  const [nc, setNc] = useState({ name: "", whatsapp: "", email: "", address: "" });
  const [f, setF] = useState({ title: "", location: "", description: "", jobDate: "", jobDateTbd: false, laborOnly: false,
    plan: "after" as Plan, pct: 50, terms: "on completion", note: "" });
  const [lines, setLines] = useState([{ description: "", quantity: 1, price: 0 }]);
  const [gone, setGone] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const sub = lines.reduce((a, l) => a + l.quantity * l.price, 0);
  const vat = vatRegistered ? sub * 0.15 : 0;
  const total = sub + vat;
  const valid = lines.filter((l) => l.description.trim() && l.price > 0).length;
  const first = (clients.find((c) => c.id === clientId)?.name ?? nc.name).split(" ")[0] || "there";
  const job = (f.title || "the job").toLowerCase();

  const tips: [boolean, string, string][] = [
    [valid > 0 && !f.description.trim(), "d", "Describe the job in 2 or 3 sentences. Clients say yes faster when they see you understood what they want."],
    [!!f.description.trim() && !/not included/i.test(f.description), "x", "Say what's NOT included to avoid arguments later."],
    [valid > 0 && !f.location.trim(), "l", "Add the job location so the client knows you have the right address."],
    [f.plan === "after" && total > 5000, "p", "Big job with no deposit. Consider asking for a deposit to cover materials."],
    [valid > 0 && !f.note.trim(), "n", "Add a short personal note. Tap Friendly below to start."],
  ];
  const tip = tips.find((t) => t[0] && !gone.includes(t[1]));

  function pick(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c?.address && !f.location) set("location", c.address);
    if (c?.preferred_payment === "deposit" || c?.preferred_payment === "after" || c?.preferred_payment === "full") set("plan", c.preferred_payment);
  }
  function setLine(i: number, patch: Partial<(typeof lines)[number]>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function desc(i: number, v: string) {
    const m = items.find((it) => it.description === v);
    setLine(i, { description: v, ...(m && !lines[i].price ? { price: m.default_price_cents / 100 } : {}) });
  }
  function submit(send: boolean) {
    setErr("");
    start(async () => {
      const r = await createQuote({ clientId: clientId === "new" ? "" : clientId, newClient: clientId === "new" ? nc : null,
        ...f, plan: f.plan, items: lines, send });
      if (r?.error) setErr(r.error);
    });
  }

  return (
    <main className="mx-auto max-w-xl px-5 pb-32 pt-8">
      <h1 className="text-2xl font-extrabold">New quote</h1>
      {tip && (
        <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3 text-sm">
          <b>Tip:</b> {tip[2]}
          <div className="mt-1 text-xs text-neutral-500">
            <button onClick={() => setGone([...gone, tip[1]])}>Dismiss</button>
          </div>
        </div>
      )}
      <section className="mt-4 rounded-2xl bg-white p-5">
        <label className={lbl} style={{ marginTop: 0 }}>Client</label>
        <select className={box} value={clientId} onChange={(e) => pick(e.target.value)}>
          <option value="">Choose a client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="new">+ New client</option>
        </select>
        {clientId === "new" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input className={box} placeholder="Name" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
            <input className={box} placeholder="WhatsApp number" value={nc.whatsapp} onChange={(e) => setNc({ ...nc, whatsapp: e.target.value })} />
            <input className={box} placeholder="Email (optional)" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} />
            <input className={box} placeholder="Address (optional)" value={nc.address} onChange={(e) => setNc({ ...nc, address: e.target.value })} />
          </div>
        )}
        <label className={lbl}>Job name</label>
        <input className={box} placeholder="e.g. Kitchen cupboards" value={f.title} onChange={(e) => set("title", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <div><label className={lbl}>Location</label>
            <input className={box} value={f.location} onChange={(e) => set("location", e.target.value)} /></div>
          <div><label className={lbl}>Job date</label>
            <input type="date" className={box} value={f.jobDate} disabled={f.jobDateTbd} onChange={(e) => set("jobDate", e.target.value)} /></div>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.jobDateTbd} onChange={(e) => set("jobDateTbd", e.target.checked)} /> Date to be agreed
        </label>
        <label className={lbl}>What you'll do</label>
        <textarea rows={4} className={box} value={f.description} onChange={(e) => set("description", e.target.value)}
          placeholder="e.g. Build and install 6 kitchen cupboards. Includes clearing away the old units." />
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {[["+ What's not included", "Not included: extra repairs found once work starts."], ["+ Access needed", "Access: someone needs to be on site to let us in."]].map(([l, t]) => (
            <button key={l} className="rounded-full border px-3 py-1" onClick={() => set("description", (f.description ? f.description + "\n" : "") + t)}>{l}</button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">Items and prices</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.laborOnly} onChange={(e) => set("laborOnly", e.target.checked)} /> Labour only</label>
        </div>
        <datalist id="items">{items.map((i) => <option key={i.description} value={i.description} />)}</datalist>
        {lines.map((l, i) => (
          <div key={i} className="mt-3 rounded-xl border p-3">
            <input list="items" className={box} placeholder="What are you charging for?" value={l.description} onChange={(e) => desc(i, e.target.value)} />
            <div className="mt-2 flex items-center gap-2">
              <input type="number" min={1} className="w-16 rounded-xl border px-2 py-2" value={l.quantity} onChange={(e) => setLine(i, { quantity: Math.max(1, +e.target.value || 1) })} />
              <input type="number" min={0} className="flex-1 rounded-xl border px-3 py-2" placeholder="Price (R)" value={l.price || ""} onChange={(e) => setLine(i, { price: Math.max(0, +e.target.value || 0) })} />
              <span className="w-24 text-right font-bold">{formatRand(l.quantity * l.price * 100)}</span>
            </div>
            {lines.length > 1 && <button className="mt-1 text-xs text-neutral-500" onClick={() => setLines(lines.filter((_, x) => x !== i))}>Remove</button>}
          </div>
        ))}
        <button className="mt-3 text-sm font-semibold text-yebo" onClick={() => setLines([...lines, { description: "", quantity: 1, price: 0 }])}>+ Add another item</button>
        <div className="mt-4 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatRand(sub * 100)}</span></div>
          <div className="flex justify-between"><span>VAT</span><span>{vatRegistered ? formatRand(vat * 100) : "Not applicable"}</span></div>
          <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span>{formatRand(total * 100)}</span></div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5">
        <h2 className="font-extrabold">How and when you get paid</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          {([["after", "Pay after the job"], ["deposit", "Deposit first"], ["full", "Full upfront"]] as [Plan, string][]).map(([p, l]) => (
            <button key={p} onClick={() => set("plan", p)}
              className={`rounded-xl border-2 px-2 py-2 font-semibold ${f.plan === p ? "border-yebo bg-emerald-50 text-yebo" : ""}`}>{l}</button>
          ))}
        </div>
        {f.plan === "deposit" && (
          <select className={box} value={f.pct} onChange={(e) => set("pct", +e.target.value)}>
            {[25, 50, 70].map((p) => <option key={p} value={p}>{p}% deposit</option>)}
          </select>
        )}
        {f.plan !== "full" && (
          <select className={box} value={f.terms} onChange={(e) => set("terms", e.target.value)}>
            {["on completion", "within 7 days", "within 14 days", "within 30 days"].map((t) => <option key={t}>{t}</option>)}
          </select>
        )}
        <label className={lbl}>Personal note</label>
        <textarea rows={3} className={box} value={f.note} onChange={(e) => set("note", e.target.value)} />
        <div className="mt-2 flex gap-2 text-xs">
          <button className="rounded-full border px-3 py-1" onClick={() => set("note", `Hi ${first}, thanks for the chat today. I've put together everything we discussed for ${job}. Happy to adjust anything.`)}>Friendly</button>
          <button className="rounded-full border px-3 py-1" onClick={() => set("note", `Dear ${first}, thank you for the opportunity to quote for ${job}. Please get in touch with any questions.`)}>Professional</button>
          <button className="rounded-full border px-3 py-1" onClick={() => set("note", `Hi ${first}, here's your quote for ${job}. Shout if you'd like changes.`)}>Short</button>
        </div>
      </section>

      {err && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="fixed inset-x-0 bottom-0 border-t bg-white p-4">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="text-xs text-neutral-500">Total<b className="block text-lg text-neutral-900">{formatRand(total * 100)}</b></div>
          <button disabled={pending || !valid} onClick={() => submit(false)} className="ml-auto rounded-xl border-2 border-yebo px-4 py-3 font-bold text-yebo disabled:opacity-40">Save draft</button>
          <button disabled={pending || !valid} onClick={() => submit(true)} className="rounded-xl bg-yebo px-5 py-3 font-bold text-white disabled:opacity-40">{pending ? "Saving..." : "Create & send"}</button>
        </div>
      </div>
    </main>
  );
}
