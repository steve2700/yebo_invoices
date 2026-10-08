"use client";
import { useEffect, useState, useTransition } from "react";
import { createQuote, updateDraft } from "./actions";
import { formatRand } from "@/lib/money";
import { greetingName } from "@/lib/names";
import VoiceQuoteAssistant, { type VoiceQuoteDraft } from "./VoiceQuoteAssistant";

type Client = { id: string; name: string; whatsapp_number: string | null; address: string | null; preferred_payment: string | null };
type Item = { description: string; default_price_cents: number };
type Plan = "after" | "deposit" | "full";
type MessageTone = "friendly" | "professional" | "short";
type Line = { description: string; quantity: number; price: number; pricingMode?: "unit" | "line_total" };
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

function getLineTotalCents(line: Line) {
  const amountCents = Math.round(line.price * 100);
  return line.pricingMode === "line_total" ? amountCents : Math.round(amountCents * line.quantity);
}

function normalizeClientName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

type Tip = { id: string; message: string; actionLabel?: string; onAction?: () => void };

const TIPS_KEY = "yebo:dismissed-tips";
const DEPOSIT_TIP_CENTS = 1_000_000; // R10 000: suggest a deposit at or above this quote total
const BIG_LINE_TIP_CENTS = 500_000; // R5 000: suggest splitting a single line at or above this amount

type TidySuggestion = { title: string; location: string; description: string; items: string[] };
type TidyChange = { key: string; label: string; before: string; after: string };

function isTidySuggestion(value: unknown): value is TidySuggestion {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.title === "string"
    && typeof candidate.location === "string"
    && typeof candidate.description === "string"
    && Array.isArray(candidate.items)
    && candidate.items.every((item) => typeof item === "string");
}

type Initial = { clientId: string; f: Fields; lines: Line[] };

export default function QuoteForm({ clients, items, vatRegistered, docType = "quote", documentId, initial }: { clients: Client[]; items: Item[]; vatRegistered: boolean; docType?: "quote" | "invoice"; documentId?: string; initial?: Initial }) {
  const isInvoice = docType === "invoice";
  const [clientId, setClientId] = useState(initial?.clientId ?? (clients.length ? "" : "new"));
  const [newClient, setNewClient] = useState({ name: "", whatsapp: "", email: "", address: "" });
  const [fields, setFields] = useState<Fields>(initial?.f ?? {
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
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? [{ description: "", quantity: 1, price: 0 }]);
  const [error, setError] = useState("");
  const [noteTone, setNoteTone] = useState<MessageTone>("friendly");
  const [draftingNote, setDraftingNote] = useState<MessageTone | null>(null);
  const [noteError, setNoteError] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);
  const [hiddenTips, setHiddenTips] = useState<string[]>([]);
  const [voiceApplied, setVoiceApplied] = useState(false);
  const [descTidying, setDescTidying] = useState(false);
  const [descTidyError, setDescTidyError] = useState("");
  const [descSuggestion, setDescSuggestion] = useState<string | null>(null);
  const [tidying, setTidying] = useState(false);
  const [tidyError, setTidyError] = useState("");
  const [tidySuggestion, setTidySuggestion] = useState<TidySuggestion | null>(null);
  const [pending, start] = useTransition();
  const setField = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((current) => ({ ...current, [key]: value }));

  const validLines = lines.filter((line) => line.description.trim() && line.price > 0 && line.quantity > 0).length;
  const hasClient = clientId === "new" ? Boolean(newClient.name.trim()) : Boolean(clientId);
  const canSubmit = validLines > 0 && hasClient;
  const subtotalCents = lines.reduce((sum, line) => sum + getLineTotalCents(line), 0);
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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TIPS_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setDismissedTips(parsed.filter((id): id is string => typeof id === "string"));
    } catch {
      // Storage can be unavailable (private mode); tips still work for this visit.
    }
  }, []);

  const firstLineText = lines.find((line) => line.description.trim())?.description.trim() ?? "";
  const tips: Tip[] = [];
  if (voiceApplied) {
    tips.push({ id: "voice-check", message: "Voice drafts can mishear numbers. Check every price and quantity before you send." });
  }
  if (!isInvoice && subtotalCents >= DEPOSIT_TIP_CENTS && fields.plan === "after") {
    tips.push({
      id: "deposit",
      message: "Jobs this size often ask for a deposit. It covers your materials and shows the client is committed.",
      actionLabel: "Switch to deposit first",
      onAction: () => setField("plan", "deposit"),
    });
  }
  if (validLines === 1 && lines.some((line) => getLineTotalCents(line) >= BIG_LINE_TIP_CENTS)) {
    tips.push({ id: "split-line", message: "Break this into materials, labour and travel. Clients trust a quote they can see the detail of." });
  }
  if (isInvoice && validLines > 0 && fields.terms === "on completion") {
    tips.push({
      id: "invoice-due",
      message: "Give this invoice a clear deadline. Invoices with a due date get paid sooner.",
      actionLabel: "Set to within 7 days",
      onAction: () => setField("terms", "within 7 days"),
    });
  }
  if (validLines > 0 && !fields.title.trim() && firstLineText) {
    tips.push({
      id: "job-name",
      message: "Give the job a name so your client recognises it at a glance.",
      actionLabel: `Use “${firstLineText.length > 28 ? `${firstLineText.slice(0, 28)}…` : firstLineText}”`,
      onAction: () => setField("title", firstLineText),
    });
  }
  if (validLines > 0 && !fields.description.trim()) {
    tips.push({
      id: "job-description",
      message: "A short description helps your client see exactly what they are paying for, and it builds trust.",
      actionLabel: "Write it now",
      onAction: () => document.getElementById("work-description")?.focus(),
    });
  }
  if (!isInvoice && validLines > 0 && !fields.jobDate && !fields.jobDateTbd) {
    tips.push({
      id: "job-date",
      message: "Clients answer faster when they know when you can start. Add a job date, or mark it as to be agreed.",
      actionLabel: "Date to be agreed",
      onAction: () => setField("jobDateTbd", true),
    });
  }
  const activeTip = tips.find((tip) => !dismissedTips.includes(tip.id) && !hiddenTips.includes(tip.id));

  function dismissTip(id: string, forever: boolean) {
    if (!forever) {
      setHiddenTips((current) => [...current, id]);
      return;
    }
    const next = Array.from(new Set([...dismissedTips, id]));
    setDismissedTips(next);
    try {
      window.localStorage.setItem(TIPS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors; the tip stays hidden for this visit.
    }
  }

  const hasTidyText = lines.some((line) => line.description.trim()) || Boolean(fields.title.trim() || fields.location.trim() || fields.description.trim());
  const tidyChanges: TidyChange[] = tidySuggestion
    ? [
        ...lines.map((line, index) => ({ key: `item-${index}`, label: `Item ${index + 1}`, before: line.description, after: tidySuggestion.items[index] ?? line.description })),
        { key: "title", label: "Job name", before: fields.title, after: tidySuggestion.title },
        { key: "location", label: "Location", before: fields.location, after: tidySuggestion.location },
        { key: "description", label: "What you’ll do", before: fields.description, after: tidySuggestion.description },
      ].filter((change) => change.before.trim() && change.after.trim() && change.before.trim() !== change.after.trim())
    : [];

  async function tidyUp() {
    setTidying(true);
    setTidyError("");
    setTidySuggestion(null);
    try {
      const response = await fetch("/api/tidy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.title,
          location: fields.location,
          description: fields.description,
          items: lines.slice(0, 20).map((line) => line.description),
        }),
      });
      const result = await response.json().catch(() => null) as { tidy?: unknown; error?: unknown } | null;
      if (!response.ok || !result || !isTidySuggestion(result.tidy)) {
        throw new Error(typeof result?.error === "string" ? result.error : "Could not tidy your wording. Please try again.");
      }
      setTidySuggestion(result.tidy);
    } catch (caught) {
      setTidyError(caught instanceof Error ? caught.message : "Could not tidy your wording. Please try again.");
    } finally {
      setTidying(false);
    }
  }

  async function tidyDescription() {
    setDescTidying(true);
    setDescTidyError("");
    setDescSuggestion(null);
    try {
      const response = await fetch("/api/tidy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", location: "", description: fields.description, items: [] }),
      });
      const result = await response.json().catch(() => null) as { tidy?: unknown; error?: unknown } | null;
      if (!response.ok || !result || !isTidySuggestion(result.tidy)) {
        throw new Error(typeof result?.error === "string" ? result.error : "Could not tidy your description. Please try again.");
      }
      setDescSuggestion(result.tidy.description);
    } catch (caught) {
      setDescTidyError(caught instanceof Error ? caught.message : "Could not tidy your description. Please try again.");
    } finally {
      setDescTidying(false);
    }
  }

  function applyDescriptionTidy() {
    if (descSuggestion?.trim()) setField("description", descSuggestion);
    setDescSuggestion(null);
  }

  function applyTidy() {
    if (!tidySuggestion) return;
    const suggestion = tidySuggestion;
    setLines((current) => current.map((line, index) => {
      const after = suggestion.items[index]?.trim();
      return after && line.description.trim() ? { ...line, description: after } : line;
    }));
    setFields((current) => ({
      ...current,
      title: current.title.trim() && suggestion.title.trim() ? suggestion.title : current.title,
      location: current.location.trim() && suggestion.location.trim() ? suggestion.location : current.location,
      description: current.description.trim() && suggestion.description.trim() ? suggestion.description : current.description,
    }));
    setTidySuggestion(null);
  }

  function pickClient(id: string) {
    setClientId(id);
    const selected = clients.find((client) => client.id === id);
    if (selected?.address && !fields.location) setField("location", selected.address);
    if (["deposit", "after", "full"].includes(selected?.preferred_payment ?? "")) {
      setField("plan", selected?.preferred_payment as Plan);
    }
  }

  function applyVoiceDraft(draft: VoiceQuoteDraft) {
    if (draft.clientName) {
      const matchedClient = clients.find((client) => normalizeClientName(client.name) === normalizeClientName(draft.clientName!));
      if (matchedClient) {
        pickClient(matchedClient.id);
      } else {
        setClientId("new");
        setNewClient({ name: draft.clientName, whatsapp: "", email: "", address: "" });
      }
    }
    if (draft.title) setField("title", draft.title);
    if (draft.location) setField("location", draft.location);
    if (draft.description) setField("description", draft.description);
    setLines(draft.items.map((item) => ({
      description: item.description,
      quantity: Math.round(item.quantity * 100) / 100,
      price: item.amountRand === null ? 0 : Math.round(item.amountRand * 100) / 100,
      pricingMode: item.amountRand !== null && item.priceBasis !== "unit_rate" ? "line_total" : "unit",
    })));
    setVoiceApplied(true);
    setHiddenTips((current) => current.filter((id) => id !== "voice-check"));
    setError("");
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function updateDescription(index: number, description: string) {
    const savedItem = items.find((item) => item.description === description);
    updateLine(index, {
      description,
      ...(savedItem && (!lines[index].price || lines[index].pricingMode === "line_total")
        ? { price: savedItem.default_price_cents / 100, pricingMode: "unit" }
        : {}),
    });
  }

  function appendDescription(text: string) {
    setField("description", fields.description ? `${fields.description.trimEnd()}\n${text}` : text);
  }

  function createNote(style: MessageTone) {
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
    setNoteError("");
  }

  async function draftNote(style: MessageTone) {
    setDraftingNote(style);
    setNoteError("");
    try {
      const response = await fetch("/api/ai-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "intro_note",
          style,
          documentType: docType,
          firstName,
          jobTitle: fields.title,
          description: fields.description,
          items: lines.map((line) => line.description).filter(Boolean).slice(0, 5),
        }),
      });
      const result = await response.json() as { message?: unknown; error?: unknown };
      if (!response.ok || typeof result.message !== "string" || !result.message.trim()) {
        throw new Error(typeof result.error === "string" ? result.error : "Could not draft this note.");
      }
      setField("note", result.message);
    } catch (draftError) {
      setNoteError(draftError instanceof Error ? draftError.message : "Could not draft this note. Please try again.");
    } finally {
      setDraftingNote(null);
    }
  }

  function submit(send: boolean) {
    if (!canSubmit || draftingNote || voiceBusy || tidying || descTidying) return;
    setError("");
    start(async () => {
      const payload = {
        clientId: clientId === "new" ? "" : clientId,
        newClient: clientId === "new" ? newClient : null,
        ...fields,
        docType,
        items: lines,
        send,
      };
      const result = documentId ? await updateDraft({ id: documentId, ...payload }) : await createQuote(payload);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-36 pt-5 sm:px-6 sm:pt-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange">{documentId ? `Editing ${docType} draft` : `New ${docType}`}</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-ink">
            {documentId ? "Edit your draft." : isInvoice ? "Get paid, fast." : "Make it an easy yes."}
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

      {!documentId && <VoiceQuoteAssistant docType={docType} onApply={applyVoiceDraft} onBusyChange={setVoiceBusy} />}

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
            <input id={`item-${index}`} list="saved-items" spellCheck lang="en-ZA" autoCapitalize="sentences" className="w-full rounded-xl border-0 bg-white px-3 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-orange" placeholder="Item or service" value={line.description} onChange={(event) => updateDescription(index, event.target.value)} />
            <div className="mt-2 grid grid-cols-[4.25rem_minmax(0,1fr)_5.25rem] items-end gap-2">
              <div>
                <label className="mb-1 block text-center text-[10px] font-bold text-paper/60" htmlFor={`quantity-${index}`}>Qty</label>
                <input id={`quantity-${index}`} type="number" min={0.01} step="0.01" inputMode="decimal" className="w-full rounded-xl border-0 bg-white px-2 py-3 text-center text-sm text-ink" value={line.quantity} onChange={(event) => {
                  const quantity = Math.max(0.01, Number(event.target.value) || 0.01);
                  updateLine(index, { quantity: Math.round(quantity * 100) / 100 });
                }} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-paper/60" htmlFor={`price-${index}`}>{line.pricingMode === "line_total" ? "Line total (R)" : "Price per unit (R)"}</label>
                <input id={`price-${index}`} type="number" min={0} step="0.01" inputMode="decimal" className="w-full min-w-0 rounded-xl border-0 bg-white px-3 py-3 text-sm text-ink" value={line.price || ""} onChange={(event) => updateLine(index, { price: Math.max(0, Number(event.target.value) || 0) })} />
              </div>
              <div>
                <span className="mb-1 block text-right text-[10px] font-bold text-paper/60">Total</span>
                <span className="block min-w-0 text-right text-sm font-black text-lime">{formatRand(getLineTotalCents(line))}</span>
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

        <div className="mt-4">
          <button
            type="button"
            disabled={tidying || !hasTidyText}
            onClick={() => void tidyUp()}
            className="min-h-11 rounded-full bg-lime px-4 py-2 text-sm font-black text-ink transition hover:brightness-95 disabled:opacity-40"
          >
            {tidying ? "Tidying…" : "✨ Tidy up my wording"}
          </button>
          <p className="mt-2 text-xs leading-5 text-paper/60">Fixes spelling and makes your items and description neat. You choose whether to use it.</p>
          {tidyError && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{tidyError}</p>}
          {tidySuggestion && tidyChanges.length === 0 && (
            <p role="status" className="mt-2 rounded-xl bg-white/10 p-3 text-sm text-paper">Your wording already looks tidy. Nothing to change.</p>
          )}
          {tidySuggestion && tidyChanges.length > 0 && (
            <div role="region" aria-label="Suggested wording changes" className="mt-3 rounded-2xl bg-white p-4 text-ink">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange">Review before applying</p>
              <ul className="mt-2 divide-y divide-ink/10">
                {tidyChanges.map((change) => (
                  <li key={change.key} className="py-3 text-sm">
                    <p className="text-xs font-bold text-ink/50">{change.label}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-ink/50 line-through decoration-ink/30">{change.before}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words font-semibold text-ink">{change.after}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={applyTidy} className="min-h-11 rounded-2xl bg-ink px-4 py-2 text-sm font-black text-lime">Use these changes</button>
                <button type="button" onClick={() => setTidySuggestion(null)} className="min-h-11 rounded-2xl border border-ink/15 px-4 py-2 text-sm font-bold text-ink">Keep mine</button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 border-t border-white/15 pt-4 text-sm">
          <div className="flex justify-between py-1 text-paper/65"><span>Subtotal</span><span>{formatRand(subtotalCents)}</span></div>
          <div className="flex justify-between py-1 text-paper/65"><span>VAT</span><span>{vatRegistered ? formatRand(vatCents) : "Not applicable"}</span></div>
          <div className="flex justify-between py-1 text-lg font-black"><span>Total</span><span className="text-lime">{formatRand(totalCents)}</span></div>
        </div>
      </section>

      <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_16px_60px_rgba(20,42,31,.08)] ring-1 ring-ink/5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">Optional · Helps your client say yes</p>
            <h2 className="mt-2 text-xl font-black tracking-tight">Describe the work</h2>
            <p className="mt-1 text-xs leading-5 text-ink/55">Your client sees this as “{isInvoice ? "What you will get" : "What is included"}”.</p>
          </div>
          <span className="shrink-0 rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink/55">Optional</span>
        </div>
        <label className="sr-only" htmlFor="work-description">What you&apos;ll do</label>
        <textarea
          id="work-description"
          rows={4}
          spellCheck
          lang="en-ZA"
          autoCapitalize="sentences"
          className={input}
          value={fields.description}
          onChange={(event) => { setField("description", event.target.value); setDescSuggestion(null); }}
          placeholder="e.g. Supply and install new light fittings in the kitchen. Remove the old ones and test everything."
        />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button type="button" className="min-h-10 rounded-full border border-ink/15 px-3 py-2 font-bold" onClick={() => appendDescription("Not included: extra repairs found once work starts.")}>+ What&apos;s not included</button>
          <button type="button" className="min-h-10 rounded-full border border-ink/15 px-3 py-2 font-bold" onClick={() => appendDescription("Access: someone needs to be on site to let us in.")}>+ Access needed</button>
          <button
            type="button"
            disabled={descTidying || !fields.description.trim()}
            onClick={() => void tidyDescription()}
            className="min-h-10 rounded-full bg-lime px-4 py-2 font-black text-ink transition hover:brightness-95 disabled:opacity-40"
          >
            {descTidying ? "Tidying…" : "✨ Tidy this"}
          </button>
        </div>
        {descTidyError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{descTidyError}</p>}
        {descSuggestion !== null && descSuggestion.trim() === fields.description.trim() && (
          <p role="status" className="mt-3 rounded-xl bg-paper p-3 text-sm text-ink/70">Your description already looks tidy. Nothing to change.</p>
        )}
        {descSuggestion !== null && descSuggestion.trim() !== fields.description.trim() && (
          <div role="region" aria-label="Suggested description" className="mt-3 rounded-2xl border border-ink/10 bg-paper/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange">Review before applying</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink/50 line-through decoration-ink/30">{fields.description}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold text-ink">{descSuggestion}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={applyDescriptionTidy} className="min-h-11 rounded-2xl bg-ink px-4 py-2 text-sm font-black text-lime">Use this</button>
              <button type="button" onClick={() => setDescSuggestion(null)} className="min-h-11 rounded-2xl border border-ink/15 px-4 py-2 text-sm font-bold text-ink">Keep mine</button>
            </div>
          </div>
        )}
      </section>

      {activeTip && (
        <aside role="note" aria-label="Tip" className="mt-5 rounded-[1.5rem] border border-lime/60 bg-lime/15 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange">Tip</p>
          <p className="mt-1 text-sm leading-5 text-ink">{activeTip.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeTip.actionLabel && activeTip.onAction && (
              <button type="button" onClick={activeTip.onAction} className="min-h-10 rounded-full bg-ink px-4 py-2 text-xs font-black text-lime">
                {activeTip.actionLabel}
              </button>
            )}
            <button type="button" onClick={() => dismissTip(activeTip.id, false)} className="min-h-10 rounded-full border border-ink/15 px-3 py-2 text-xs font-bold text-ink">
              Not now
            </button>
            <button type="button" onClick={() => dismissTip(activeTip.id, true)} className="min-h-10 px-2 text-xs font-semibold text-ink/55 underline underline-offset-2">
              Don&apos;t show again
            </button>
          </div>
        </aside>
      )}

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
            <input id="job-title" spellCheck lang="en-ZA" autoCapitalize="sentences" className={input} placeholder="e.g. Kitchen cupboards" value={fields.title} onChange={(event) => setField("title", event.target.value)} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="job-location">Location</label>
                <input id="job-location" spellCheck lang="en-ZA" autoCapitalize="words" className={input} placeholder="Where is the work happening?" value={fields.location} onChange={(event) => setField("location", event.target.value)} />
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
            <textarea id="personal-note" rows={3} spellCheck lang="en-ZA" autoCapitalize="sentences" className={input} value={fields.note} onChange={(event) => setField("note", event.target.value)} placeholder={isInvoice ? "Optional: add a thank-you or payment reminder." : "Optional: add a warm note for your client."} />
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="note-tone">Personal note tone</label>
              <select
                id="note-tone"
                value={noteTone}
                disabled={draftingNote !== null}
                onChange={(event) => setNoteTone(event.target.value as MessageTone)}
                className="min-h-10 rounded-full border border-ink/15 bg-paper px-3 text-xs font-bold text-ink outline-none focus:border-orange disabled:opacity-50"
              >
                <option value="friendly">Friendly tone</option>
                <option value="professional">Professional tone</option>
                <option value="short">Short tone</option>
              </select>
              <button
                type="button"
                disabled={draftingNote !== null}
                onClick={() => void draftNote(noteTone)}
                className="min-h-10 rounded-full bg-orange px-4 py-2 text-xs font-black text-white transition hover:brightness-95 disabled:opacity-50"
              >
                {draftingNote ? "Drafting..." : "Draft with AI"}
              </button>
              <button
                type="button"
                disabled={draftingNote !== null}
                onClick={() => createNote(noteTone)}
                className="min-h-10 rounded-full border border-ink/15 px-3 py-2 text-xs font-bold text-ink disabled:opacity-50"
              >
                Use quick template
              </button>
            </div>
            {draftingNote && <p role="status" className="mt-2 text-xs text-ink/55">Writing your {draftingNote} note...</p>}
            {noteError && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{noteError}</p>}
            <p className="mt-2 text-xs text-ink/50">AI notes are editable. Review the wording before you share.</p>
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
            <button type="button" disabled={pending || draftingNote !== null || voiceBusy || tidying || descTidying || !canSubmit} onClick={() => submit(false)} className="ml-auto min-h-11 rounded-2xl border-2 border-ink px-3 py-3 text-xs font-black text-ink disabled:opacity-40 sm:px-4 sm:text-sm">
              {documentId ? "Save changes" : "Save draft"}
            </button>
            <button type="button" disabled={pending || draftingNote !== null || voiceBusy || tidying || descTidying || !canSubmit} onClick={() => submit(true)} className="min-h-11 rounded-2xl bg-orange px-4 py-3 text-xs font-black text-white shadow-lg shadow-orange/20 disabled:opacity-40 sm:px-5 sm:text-sm">
              {pending ? "Saving..." : isInvoice ? "Send invoice" : documentId ? "Save & send" : "Create & send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
