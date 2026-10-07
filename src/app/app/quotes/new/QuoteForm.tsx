"use client";
import { useState, useTransition } from "react";
import { createQuote } from "./actions";
import { formatRand } from "@/lib/money";
import { greetingName } from "@/lib/names";

type Client = { id: string; name: string; whatsapp_number: string | null; address: string | null; preferred_payment: string | null };
type Item = { description: string; default_price_cents: number };
type Plan = "after" | "deposit" | "full";
type Line = { description: string; quantity: number; price: number };
type Fields = {
  title: string;
  location: string;
  description: string;
  jobDate: string;
  jobDateTbd: boolean;
  laborOnly: boolean;
  plan: Plan;
  pct: number;
  terms: string;
  note: string;
};

const input = "mt-2 w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm outline-none transition focus:border-orange focus:bg-white";
const label = "mt-5 block text-xs font-black uppercase tracking-[0.16em] text-ink/55";
const plans: [Plan, string][] = [["after", "After the job"], ["deposit", "Deposit first"], ["full", "Full upfront"]];

export default function QuoteForm({ clients, items, vatRegistered, docType = "quote" }: { clients: Client[]; items: Item[]; vatRegistered: boolean; docType?: "quote" | "invoice" }) {
  const isInvoice = docType === "invoice";
  const [clientId, setClientId] = useState(clients.length ? "" : "new");
  const [newClient, setNewClient] = useState({ name: "", whatsapp: "", email: "", address: "" });
  const [fields, setFields] = useState<Fields>({
    title: "",
    location: "",
    description: "",
    jobDate: "",
    jobDateTbd: false,
    laborOnly: false,
    plan: "after",
    pct: 50,
    terms: isInvoice ? "within 7 days" : "on completion",
    note: "",
  });
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, price: 0 }]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const setField = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((current) => ({ ...current, [key]: value }));

  const validLines = lines.filter((line) => line.description.trim() && line.price > 0).length;
  const hasClient = clientId === "new" ? Boolean(newClient.name.trim()) : Boolean(clientId);
  const canSubmit = validLines > 0 && hasClient;
  const subtotalCents = lines.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0);
  const vatCents = vatRegistered ? Math.round((subtotalCents * 15) / 100) : 0;
  const totalCents = subtotalCents + vatCents;
  const clientName = clients.find((client) => client.id === clientId)?.name ?? newClient.name;
  const firstName = greetingName(clientName);
  const jobName = (fields.title.trim() || "the job").toLowerCase();
  const paymentSummary = isInvoice
    ? fields.terms
    : fields.plan === "deposit"
      ? `${fields.pct}% deposit`
      : fields.plan === "full"
        ? "Full upfront"
        : "After the job";
  const actionHint = !hasClient && validLines === 0
    ? clientId === "new" ? "Enter the client’s name and add a priced item to continue." : "Choose a client and add a priced item to continue."
    : !hasClient
      ? clientId === "new" ? "Enter the client’s name to continue." : "Choose a client to continue."
      : validLines === 0
        ? "Add an item with a price to continue."
        : "";

  function pickClient(id: string) {
    setClientId(id);
    const selected = clients.find((client) => client.id === id);
    if (selected?.address && !fields.location) setField("location", selected.address);
    if (["deposit", "after", "full"].includes(selected?.preferred_payment ?? "")) {
      setField("plan", selected?.preferred_payment as Plan);
    }
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function updateDescription(index: number, description: string) {
    const savedItem = items.find((item) => item.description === description);
    updateLine(index, {
      description,
      ...(savedItem && !lines[index].price ? { price: savedItem.default_price_cents / 100 } : {}),
    });
  }

  function appendDescription(text: string) {
    setField("description", fields.description ? `${fields.description.trimEnd()}\n${text}` : text);
  }

  function createNote(style: "friendly" | "professional" | "short") {
    const kind = isInvoice ? "invoice" : "quote";
    const messages = {
      friendly: isInvoice
        ? `Hi ${firstName}, thank you for choosing us for ${jobName}. Your invoice is below, with the payment details at the bottom. Thanks again!`
        : `Hi ${firstName}, thanks for the chat today. I’ve put together everything we discussed for ${jobName}. Happy to adjust anything.`,
      professional: `Dear ${firstName}, please find your ${kind} for ${jobName} below. Please get in touch if you have any questions.`,
      short: isInvoice
        ? "Thanks for your business. Please use the invoice number as your payment reference."
        : "Thanks for considering us. Let me know if you’d like any changes.",
    };
    setField("note", messages[style]);
  }

  function submit(send: boolean) {
    if (!canSubmit) return;
    setError("");
    start(async () => {
      const result = await createQuote({
        clientId: clientId === "new" ? "" : clientId,
        newClient: clientId === "new" ? newClient : null,
        ...fields,
        docType,
        items: lines,
        send,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-36 pt-5 sm:px-6 sm:pt-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange">New {docType}</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-ink">
            {isInvoice ? "Get paid, fast." : "Make it an easy yes."}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink/60">
            {isInvoice
              ? "Choose a client and add what they owe. Payment is due in 7 days by default."
              : "Choose a client and add what you’re charging for. The rest is optional."}
          </p>
        </div>
        <div className="hidden rounded-full bg-lime px-3 py-2 text-xs font-black text-ink sm:block">
          {isInvoice ? "NEW INVOICE" : "NEW QUOTE"}
        </div>
      </header>

      <section className="rounded-[2rem] bg-white p-5 shadow-[0_16px_60px_rgba(20,42,31,.08)] ring-1 ring-ink/5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">01 · Start here</p>
        <h2 className="mt-2 text-xl font-black tracking-tight">Who is this for?</h2>
        <label className={label} htmlFor="client">Client</label>
        <select id="client" className={input} value={clientId} onChange={(event) => pickClient(event.target.value)}>
          <option value="">Choose a client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          <option value="new">+ Add a new client</option>
        </select>
        {clientId === "new" && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input aria-label="Client name" autoComplete="name" className={input} placeholder="Client name (required)" value={newClient.name} onChange={(event) => setNewClient({ ...newClient, name: event.target.value })} />
            <input aria-label="WhatsApp number (optional)" autoComplete="tel" type="tel" className={input} placeholder="WhatsApp (optional)" value={newClient.whatsapp} onChange={(event) => setNewClient({ ...newClient, whatsapp: event.target.value })} />
            <input aria-label="Email (optional)" autoComplete="email" type="email" className={input} placeholder="Email (optional)" value={newClient.email} onChange={(event) => setNewClient({ ...newClient, email: event.target.value })} />
            <input aria-label="Address (optional)" autoComplete="street-address" className={input} placeholder="Address (optional)" value={newClient.address} onChange={(event) => setNewClient({ ...newClient, address: event.target.value })} />
          </div>
        )}
        {clients.length === 0 && <p className="mt-2 text-xs text-ink/50">Only the client’s name is needed to get started.</p>}
      </section>

      <section className="mt-5 rounded-[2rem] bg-ink p-5 text-paper shadow-[0_16px_60px_rgba(20,42,31,.12)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-lime">02 · The amount</p>
            <h2 className="mt-2 text-xl font-black">What are you charging for?</h2>
            <p className="mt-1 text-xs leading-5 text-paper/60">
              {items.length ? "Choose a saved item to fill its usual price, or type a new one." : "Add an item or service and its price."}
            </p>
          </div>
        </div>
        <datalist id="saved-items">
          {items.map((item) => <option key={item.description} value={item.description} />)}
        </datalist>
        {lines.map((line, index) => (
          <div key={index} className="mt-4 rounded-2xl bg-white/10 p-3">
            <label className="sr-only" htmlFor={`item-${index}`}>Item or service {index + 1}</label>
            <input id={`item-${index}`} list="saved-items" className="w-full rounded-xl border-0 bg-white px-3 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-orange" placeholder="Item or service" value={line.description} onChange={(event) => updateDescription(index, event.target.value)} />
            <div className="mt-2 grid grid-cols-[4.25rem_minmax(0,1fr)_5.25rem] items-end gap-2">
              <div>
                <label className="mb-1 block text-center text-[10px] font-bold text-paper/60" htmlFor={`quantity-${index}`}>Qty</label>
                <input id={`quantity-${index}`} type="number" min={1} step={1} inputMode="numeric" className="w-full rounded-xl border-0 bg-white px-2 py-3 text-center text-sm text-ink" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-paper/60" htmlFor={`price-${index}`}>Price (R)</label>
                <input id={`price-${index}`} type="number" min={0} step="0.01" inputMode="decimal" className="w-full min-w-0 rounded-xl border-0 bg-white px-3 py-3 text-sm text-ink" value={line.price || ""} onChange={(event) => updateLine(index, { price: Math.max(0, Number(event.target.value) || 0) })} />
              </div>
              <div>
                <span className="mb-1 block text-right text-[10px] font-bold text-paper/60">Total</span>
                <span className="block min-w-0 text-right text-sm font-black text-lime">{formatRand(Math.round(line.price * 100) * line.quantity)}</span>
              </div>
            </div>
            {lines.length > 1 && (
              <button type="button" className="mt-2 min-h-10 text-xs font-semibold text-paper/60 underline underline-offset-2" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                Remove item
              </button>
            )}
          </div>
        ))}
        <button type="button" className="mt-4 min-h-11 rounded-full border border-lime/40 px-4 py-2 text-sm font-bold text-lime transition hover:bg-white/10" onClick={() => setLines((current) => [...current, { description: "", quantity: 1, price: 0 }])}>
          + Add another item
        </button>
        <div className="mt-6 border-t border-white/15 pt-4 text-sm">
          <div className="flex justify-between py-1 text-paper/65"><span>Subtotal</span><span>{formatRand(subtotalCents)}</span></div>
          <div className="flex justify-between py-1 text-paper/65"><span>VAT</span><span>{vatRegistered ? formatRand(vatCents) : "Not applicable"}</span></div>
          <div className="flex justify-between py-1 text-lg font-black"><span>Total</span><span className="text-lime">{formatRand(totalCents)}</span></div>
        </div>
      </section>

      <details className="group mt-5 overflow-hidden rounded-[2rem] bg-white shadow-[0_16px_60px_rgba(20,42,31,.08)] ring-1 ring-ink/5">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange sm:px-7">
          <span>
            <span className="block font-black text-ink">Add details</span>
            <span className="mt-0.5 block text-xs text-ink/55">Job information, payment options and a note</span>
            <span className="mt-1 block text-xs font-semibold text-ink/70">{isInvoice ? `Due ${paymentSummary}` : `Payment: ${paymentSummary}`}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink/55">Optional</span>
            <span aria-hidden="true" className="text-xl font-bold leading-none text-ink/45">+</span>
          </span>
        </summary>
        <div className="border-t border-ink/10 p-5 sm:p-7">
          <section>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">Job details</p>
            <label className={label} htmlFor="job-title">Job or project name</label>
            <input id="job-title" className={input} placeholder="e.g. Kitchen cupboards" value={fields.title} onChange={(event) => setField("title", event.target.value)} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="job-location">Location</label>
                <input id="job-location" className={input} placeholder="Where is the work happening?" value={fields.location} onChange={(event) => setField("location", event.target.value)} />
              </div>
              <div>
                <label className={label} htmlFor="job-date">Job date</label>
                <input id="job-date" type="date" className={input} value={fields.jobDate} disabled={fields.jobDateTbd} onChange={(event) => setField("jobDate", event.target.value)} />
              </div>
            </div>
            <label className="mt-3 flex min-h-10 items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" checked={fields.jobDateTbd} onChange={(event) => setField("jobDateTbd", event.target.checked)} />
              Date to be agreed
            </label>
            <label className={label} htmlFor="work-description">What you&apos;ll do</label>
            <textarea id="work-description" rows={3} className={input} value={fields.description} onChange={(event) => setField("description", event.target.value)} placeholder="Describe the work, if you’d like to add more detail." />
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button type="button" className="min-h-10 rounded-full border border-ink/15 px-3 py-2 font-bold" onClick={() => appendDescription("Not included: extra repairs found once work starts.")}>+ What&apos;s not included</button>
              <button type="button" className="min-h-10 rounded-full border border-ink/15 px-3 py-2 font-bold" onClick={() => appendDescription("Access: someone needs to be on site to let us in.")}>+ Access needed</button>
            </div>
            <label className="mt-4 flex min-h-10 items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" checked={fields.laborOnly} onChange={(event) => setField("laborOnly", event.target.checked)} />
              Labour only
            </label>
          </section>

          <section className="mt-7 border-t border-ink/10 pt-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">Payment</p>
            {isInvoice ? (
              <>
                <label className={label} htmlFor="payment-terms">Payment due</label>
                <select id="payment-terms" className={input} value={fields.terms} onChange={(event) => setField("terms", event.target.value)}>
                  {["on completion", "within 7 days", "within 14 days", "within 30 days"].map((term) => <option key={term}>{term}</option>)}
                </select>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink/60">Choose when you&apos;d like to be paid. Defaults to after the job.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {plans.map(([plan, planLabel]) => (
                    <button key={plan} type="button" aria-pressed={fields.plan === plan} onClick={() => setField("plan", plan)} className={`min-h-11 rounded-2xl border-2 px-3 py-2 text-sm font-bold transition ${fields.plan === plan ? "border-orange bg-orange/10 text-ink" : "border-ink/10 text-ink/60"}`}>
                      {planLabel}
                    </button>
                  ))}
                </div>
                {fields.plan === "deposit" && (
                  <label className={label} htmlFor="deposit-percent">
                    Deposit amount
                    <select id="deposit-percent" className={input} value={fields.pct} onChange={(event) => setField("pct", Number(event.target.value))}>
                      {[25, 50, 70].map((percent) => <option key={percent} value={percent}>{percent}% deposit</option>)}
                    </select>
                  </label>
                )}
                {fields.plan !== "full" && (
                  <label className={label} htmlFor="payment-terms">
                    Payment due
                    <select id="payment-terms" className={input} value={fields.terms} onChange={(event) => setField("terms", event.target.value)}>
                      {["on completion", "within 7 days", "within 14 days", "within 30 days"].map((term) => <option key={term}>{term}</option>)}
                    </select>
                  </label>
                )}
              </>
            )}
            <label className={label} htmlFor="personal-note">Personal note</label>
            <textarea id="personal-note" rows={3} className={input} value={fields.note} onChange={(event) => setField("note", event.target.value)} placeholder={isInvoice ? "Optional: add a thank-you or payment reminder." : "Optional: add a warm note for your client."} />
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button type="button" className="min-h-10 rounded-full border border-ink/15 px-3 py-2 font-bold" onClick={() => createNote("friendly")}>Friendly</button>
              <button type="button" className="min-h-10 rounded-full border border-ink/15 px-3 py-2 font-bold" onClick={() => createNote("professional")}>Professional</button>
              <button type="button" className="min-h-10 rounded-full border border-ink/15 px-3 py-2 font-bold" onClick={() => createNote("short")}>Short</button>
            </div>
          </section>
        </div>
      </details>

      {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="fixed inset-x-0 bottom-[var(--tab-h)] z-10 border-t border-ink/10 bg-paper/95 p-3 backdrop-blur sm:p-4">
        <div className="mx-auto max-w-2xl">
          {!canSubmit && <p className="mb-2 text-center text-xs text-ink/60" aria-live="polite">{actionHint}</p>}
          <div className="flex items-center gap-2">
            <div className="min-w-0 text-xs text-ink/55">
              {isInvoice ? "Invoice total" : "Quote total"}
              <span className="block truncate text-lg font-black text-ink">{formatRand(totalCents)}</span>
            </div>
            <button type="button" disabled={pending || !canSubmit} onClick={() => submit(false)} className="ml-auto min-h-11 rounded-2xl border-2 border-ink px-3 py-3 text-xs font-black text-ink disabled:opacity-40 sm:px-4 sm:text-sm">
              Save draft
            </button>
            <button type="button" disabled={pending || !canSubmit} onClick={() => submit(true)} className="min-h-11 rounded-2xl bg-orange px-4 py-3 text-xs font-black text-white shadow-lg shadow-orange/20 disabled:opacity-40 sm:px-5 sm:text-sm">
              {pending ? "Creating..." : isInvoice ? "Send invoice" : "Create & send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
