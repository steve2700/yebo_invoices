"use client";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteTender, saveTender, setTenderOutcome, submitTender, type LineInput, type SubmitResult } from "./actions";
import BoqImporter from "./BoqImporter";
import { toNumber } from "@/lib/boq-grid";
import {
  TENDER_CATEGORIES, STATUS_LABEL, centsToInput, closingInfo, formatQty, isCompliant, lineFlags, lineTotalCents, lockMessage,
  normaliseDescription, parseRandToCents, randWithCents, summarise, tenderTotals, type TenderLine, type TenderStatus, type VaultCheck,
} from "@/lib/tenders";
import { formatSouthAfricaDateTime } from "@/lib/time";

export type TenderProp = {
  id: string;
  title: string;
  reference: string;
  clientName: string;
  category: string;
  location: string;
  closingAt: string | null;
  submissionEmail: string;
  notes: string;
  status: TenderStatus;
  vatPercent: number;
  submittedAt: string | null;
  submittedTo: string | null;
  sourceFilename: string | null;
  autoDrafted?: boolean;
};

type Props = {
  tender: TenderProp;
  initialLines: TenderLine[];
  checks: VaultCheck[];
  pastRates: [string, number][];
  hasBusinessEmail: boolean;
  docLinks?: { title: string; url: string }[];
  defaultMarkup?: string;
};

const field = "w-full rounded-lg border border-yebo-deep/10 bg-yebo-chalk/40 px-2.5 py-2 text-sm text-yebo-deep outline-none transition placeholder:text-yebo-deep/35 focus:border-yebo focus:bg-white focus:ring-2 focus:ring-yebo/15";
const detailInput = "mt-2 w-full rounded-xl border border-yebo-deep/10 bg-yebo-chalk/40 px-3.5 py-3 text-sm text-yebo-deep outline-none transition placeholder:text-yebo-deep/35 focus:border-yebo focus:bg-white focus:ring-4 focus:ring-yebo/10";
const label = "text-[11px] font-bold uppercase tracking-[0.14em] text-yebo-deep/55";
const tiny = "text-[10px] font-bold uppercase tracking-wider text-ink/45 md:hidden";
const PAGE = 120;

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ---------------------------------------------------------------- one line

type RowProps = {
  line: TenderLine;
  onPatch: (id: string, patch: Partial<TenderLine>) => void;
  onRemove: (id: string) => void;
  onAddBelow: (id: string, kind: "item" | "heading") => void;
};

const LineRow = memo(function LineRow({ line, onPatch, onRemove, onAddBelow }: RowProps) {
  const [rateText, setRateText] = useState(centsToInput(line.rateCents));
  const [qtyText, setQtyText] = useState(formatQty(line.quantity));
  // If something else changes the number (fill from past rates, markup), show it. Typing never gets overwritten.
  useEffect(() => { if (parseRandToCents(rateText) !== line.rateCents) setRateText(centsToInput(line.rateCents)); }, [line.rateCents]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (toNumber(qtyText) !== line.quantity) setQtyText(formatQty(line.quantity)); }, [line.quantity]); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = (
    <div className="flex items-center justify-end gap-1">
      <button type="button" onClick={() => onAddBelow(line.id, "item")} title="Add a line below" aria-label="Add a line below" className="grid size-9 place-items-center rounded-lg text-ink/50 hover:bg-yebo-chalk hover:text-ink">+</button>
      <button type="button" onClick={() => onRemove(line.id)} title="Delete this line" aria-label="Delete this line" className="grid size-9 place-items-center rounded-lg text-ink/50 hover:bg-orange/10 hover:text-orange">✕</button>
    </div>
  );

  if (line.kind === "heading") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-yebo-chalk px-3 py-2">
        <input value={line.description} onChange={(e) => onPatch(line.id, { description: e.target.value })} placeholder="Section heading" aria-label="Section heading" className="min-w-0 flex-1 bg-transparent text-sm font-extrabold uppercase tracking-wide text-ink outline-none" />
        {actions}
      </div>
    );
  }

  const flags = lineFlags(line);
  const total = lineTotalCents(line);
  const unpriced = line.rateCents == null;
  return (
    <div className={`rounded-2xl border bg-white p-3 ${flags.some((f) => f.level === "warn") ? "border-orange/50" : "border-ink/10"}`}>
      <div className="grid grid-cols-6 gap-x-2 gap-y-2 md:grid-cols-[3.5rem_minmax(0,1fr)_5rem_6rem_7.5rem_8rem_4.75rem] md:items-start">
        <label className="col-span-2 md:col-span-1"><span className={tiny}>Item</span>
          <input value={line.itemNo} onChange={(e) => onPatch(line.id, { itemNo: e.target.value })} aria-label="Item number" className={field} />
        </label>
        <label className="col-span-4 md:col-span-1"><span className={tiny}>Description</span>
          <textarea value={line.description} onChange={(e) => onPatch(line.id, { description: e.target.value })} rows={Math.min(5, Math.max(2, Math.ceil(line.description.length / 60)))} aria-label="Description" className={`${field} resize-y leading-5`} />
        </label>
        <label className="col-span-2 md:col-span-1"><span className={tiny}>Unit</span>
          <input value={line.unit} onChange={(e) => onPatch(line.id, { unit: e.target.value })} aria-label="Unit" className={field} />
        </label>
        <label className="col-span-2 md:col-span-1"><span className={tiny}>Qty</span>
          <input value={qtyText} inputMode="decimal" onChange={(e) => { setQtyText(e.target.value); onPatch(line.id, { quantity: toNumber(e.target.value) }); }} aria-label="Quantity" className={`${field} text-right tabular-nums`} />
        </label>
        <label className="col-span-2 md:col-span-1"><span className={tiny}>Your rate (R)</span>
          <input value={rateText} inputMode="decimal" placeholder="0.00" onChange={(e) => { setRateText(e.target.value); onPatch(line.id, { rateCents: parseRandToCents(e.target.value) }); }} aria-label="Your rate in rand" className={`${field} text-right tabular-nums ${unpriced ? "border-orange/50 bg-orange/5" : ""}`} />
        </label>
        <div className="col-span-4 md:col-span-1 md:pt-2"><span className={tiny}>Amount</span>
          <p className="text-right text-sm font-extrabold tabular-nums text-ink">{unpriced || line.quantity == null ? "–" : randWithCents(total)}</p>
        </div>
        <div className="col-span-2 md:col-span-1">{actions}</div>
      </div>
      {(flags.length > 0 || line.estRateCents != null) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {flags.map((f) => (
            <span key={f.text} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${f.level === "warn" ? "bg-orange/15 text-ink" : "bg-yebo-chalk text-ink/70"}`}>{f.level === "warn" ? "⚠ " : ""}{f.text}</span>
          ))}
          {line.estRateCents != null && !flags.some((f) => f.text.startsWith("Far from")) && (
            <span className="rounded-full bg-yebo-chalk px-2.5 py-1 text-[11px] font-semibold text-ink/60">Client estimate {randWithCents(line.estRateCents)}</span>
          )}
        </div>
      )}
      {line.raw && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-yebo">Original BOQ text</summary>
          <p className="mt-1 whitespace-pre-wrap rounded-lg bg-yebo-chalk/70 p-2 text-xs leading-5 text-ink/70">{line.raw}</p>
        </details>
      )}
      <div className="mt-1 flex justify-end">
        <button type="button" onClick={() => onAddBelow(line.id, "heading")} className="text-[11px] font-semibold text-ink/40 hover:text-yebo">+ section heading below</button>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------- compliance panel

function VaultPanel({ checks, onSend, canSend, sending }: { checks: VaultCheck[]; onSend: () => void; canSend: boolean; sending: boolean }) {
  const ok = isCompliant(checks);
  const firstBad = checks.find((c) => !c.ok);
  const lock = lockMessage(checks);
  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6" aria-label="Compliance vault check">
      <p className="text-xs font-extrabold uppercase tracking-[.16em] text-ink/55">Compliance vault check</p>
      <ul className="mt-3 space-y-2">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-3 text-sm">
            <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-black ${c.ok ? "bg-yebo text-white" : "bg-orange text-white"}`}>{c.ok ? "✓" : "✕"}</span>
            <span><strong className="font-extrabold text-ink">{c.label}:</strong> <span className={c.ok ? "text-ink/70" : "font-semibold text-ink"}>{c.detail}</span></span>
          </li>
        ))}
      </ul>
      {!ok && lock && (
        <div className="mt-4 rounded-2xl border border-orange/40 bg-orange/10 p-3" role="alert">
          <p className="text-sm font-extrabold text-ink">⚠ Submission locked</p>
          <p className="mt-1 text-sm text-ink/80">&ldquo;{lock}&rdquo;</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {!ok && firstBad ? (
          <Link href={`/app/tenders/vault#${firstBad.key}`} className="inline-flex min-h-11 items-center rounded-xl border border-yebo-deep/15 bg-yebo-chalk px-4 text-sm font-bold text-ink hover:border-yebo">
            Update {firstBad.key === "coida" ? "COIDA" : firstBad.key === "csd" ? "CSD" : firstBad.key === "sars" ? "SARS" : "B-BBEE"} file
          </Link>
        ) : (
          <Link href="/app/tenders/vault" className="inline-flex min-h-11 items-center rounded-xl border border-yebo-deep/15 bg-yebo-chalk px-4 text-sm font-bold text-ink hover:border-yebo">Open vault</Link>
        )}
        <button type="button" onClick={onSend} disabled={!canSend || sending} className="inline-flex min-h-11 items-center rounded-xl bg-yebo px-4 text-sm font-extrabold text-white hover:bg-yebo-deep disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink/50">
          Submit merged bid email{!ok ? " (disabled)" : ""}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- the editor

export default function TenderEditor({ tender, initialLines, checks, pastRates, hasBusinessEmail, docLinks = [], defaultMarkup = "10" }: Props) {
  const [lines, setLines] = useState<TenderLine[]>(initialLines);
  const [details, setDetails] = useState({
    title: tender.title, reference: tender.reference, clientName: tender.clientName, category: tender.category,
    location: tender.location, submissionEmail: tender.submissionEmail, notes: tender.notes,
  });
  const [closingLocal, setClosingLocal] = useState("");
  useEffect(() => { setClosingLocal(toLocalInput(tender.closingAt)); }, [tender.closingAt]);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "attention" | "unpriced">("all");
  const [limit, setLimit] = useState(PAGE);
  const [markup, setMarkup] = useState(defaultMarkup);
  const [undo, setUndo] = useState<TenderLine[] | null>(null);
  const [showImport, setShowImport] = useState(initialLines.length === 0);
  const [showDetails, setShowDetails] = useState(!tender.title || !tender.submissionEmail);
  const [review, setReview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [status, setStatus] = useState<TenderStatus>(tender.status);
  const [submittedAt, setSubmittedAt] = useState(tender.submittedAt);
  const [submittedTo, setSubmittedTo] = useState(tender.submittedTo);
  const topRef = useRef<HTMLDivElement>(null);

  const rates = useMemo(() => new Map(pastRates), [pastRates]);
  const totals = useMemo(() => tenderTotals(lines, tender.vatPercent), [lines, tender.vatPercent]);
  const summary = useMemo(() => summarise(lines), [lines]);
  const closing = closingInfo(closingLocal ? new Date(closingLocal).toISOString() : tender.closingAt);
  const compliant = isCompliant(checks);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = useCallback((id: string, p: Partial<TenderLine>) => { setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l))); setDirty(true); }, []);
  const remove = useCallback((id: string) => { setLines((ls) => ls.filter((l) => l.id !== id)); setDirty(true); }, []);
  const addBelow = useCallback((id: string | null, kind: "item" | "heading") => {
    const blank: TenderLine = { id: crypto.randomUUID(), kind, itemNo: "", description: "", unit: "", quantity: kind === "item" ? 1 : null, rateCents: null, estRateCents: null, raw: "", aiUnsure: false };
    setLines((ls) => {
      const at = id ? ls.findIndex((l) => l.id === id) : -1;
      if (at < 0) return [...ls, blank];
      return [...ls.slice(0, at + 1), blank, ...ls.slice(at + 1)];
    });
    setDirty(true);
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return lines;
    // Keep section headings that have at least one matching line under them, so the list still makes sense.
    const out: TenderLine[] = [];
    let pendingHeading: TenderLine | null = null;
    for (const l of lines) {
      if (l.kind === "heading") { pendingHeading = l; continue; }
      const hit = filter === "unpriced" ? l.rateCents == null : lineFlags(l).some((f) => f.level === "warn");
      if (hit) { if (pendingHeading) { out.push(pendingHeading); pendingHeading = null; } out.push(l); }
    }
    return out;
  }, [lines, filter]);

  function fillFromPast() {
    let n = 0;
    setUndo(lines);
    setLines((ls) => ls.map((l) => {
      if (l.kind !== "item" || l.rateCents != null) return l;
      const hit = rates.get(normaliseDescription(l.description));
      if (hit == null) return l;
      n++;
      return { ...l, rateCents: hit };
    }));
    setDirty(true);
    setMsg({ ok: n > 0, text: n > 0 ? `Filled ${n} line${n === 1 ? "" : "s"} with the rate you used before. Check them.` : "No matching rates from your earlier tenders." });
  }

  function applyMarkup() {
    const pct = Number(markup.replace(",", "."));
    if (!Number.isFinite(pct) || pct <= -90 || pct > 500) { setMsg({ ok: false, text: "Type a percentage between -90 and 500." }); return; }
    const count = lines.filter((l) => l.kind === "item" && l.rateCents != null).length;
    if (!count) { setMsg({ ok: false, text: "No rates to adjust yet." }); return; }
    setUndo(lines);
    setLines((ls) => ls.map((l) => (l.kind === "item" && l.rateCents != null ? { ...l, rateCents: Math.max(0, Math.round(l.rateCents * (1 + pct / 100))) } : l)));
    setDirty(true);
    setMsg({ ok: true, text: `${pct >= 0 ? "Added" : "Took off"} ${Math.abs(pct)}% on ${count} rate${count === 1 ? "" : "s"}.` });
  }

  const toInput = (): { details: Parameters<typeof saveTender>[1]; lines: LineInput[] } => ({
    details: {
      title: details.title, reference: details.reference, clientName: details.clientName, category: details.category, location: details.location,
      closingAt: closingLocal ? new Date(closingLocal).toISOString() : "", submissionEmail: details.submissionEmail, notes: details.notes,
    },
    lines: lines.map((l) => ({ ...l })),
  });

  async function save(): Promise<boolean> {
    setSaving(true); setMsg(null);
    const input = toInput();
    const res = await saveTender(tender.id, input.details, input.lines);
    setSaving(false);
    if (!res.ok) { setMsg({ ok: false, text: res.error }); return false; }
    setDirty(false);
    setStatus(res.status as TenderStatus);
    setMsg({ ok: true, text: "Saved." });
    return true;
  }

  async function send(testOnly: boolean) {
    if (!testOnly && !window.confirm(`Send this bid to ${details.submissionEmail || "the client"} now? This cannot be undone.`)) return;
    setSending(true); setResult(null);
    if (dirty && !(await save())) { setSending(false); return; }
    const res = await submitTender(tender.id, testOnly);
    setSending(false);
    setResult(res);
    if (res.ok && !res.test) { setStatus("submitted"); setSubmittedAt(res.at); setSubmittedTo(res.to); }
  }

  async function outcome(o: "won" | "lost" | "ready") {
    const res = await setTenderOutcome(tender.id, o);
    if (res.ok) setStatus(o); else setMsg({ ok: false, text: res.error });
  }

  async function removeTender() {
    if (!window.confirm("Delete this tender and all its lines? This cannot be undone.")) return;
    setDirty(false);
    await deleteTender(tender.id);
  }

  const submitted = status === "submitted" || status === "won" || status === "lost";
  const blockers: string[] = [];
  if (!summary.itemCount) blockers.push("Import or add your BOQ lines");
  if (summary.unpricedCount) blockers.push(`${summary.unpricedCount} line${summary.unpricedCount === 1 ? "" : "s"} not priced`);
  if (!details.submissionEmail.trim()) blockers.push("Add the email to send the bid to");
  if (closing.tone === "closed") blockers.push("This tender has closed");
  if (!hasBusinessEmail) blockers.push("Add your business email in Settings");
  const canSend = blockers.length === 0 && compliant && !submitted;

  const pct = summary.itemCount ? Math.round((summary.pricedCount / summary.itemCount) * 100) : 0;

  return (
    <div ref={topRef} className="pb-44">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/app/tenders" className="text-sm font-bold text-yebo">← Tenders</Link>
          <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-ink sm:text-3xl">{details.title || "Untitled tender"}</h1>
          <p className="mt-1 text-sm text-ink/60">{[details.reference, details.clientName, details.category].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-yebo-chalk px-3 py-1 text-xs font-bold text-yebo-deep">{STATUS_LABEL[status]}</span>
          {!submitted && <span className={`rounded-full px-3 py-1 text-xs font-bold ${closing.tone === "urgent" ? "bg-orange/15 text-orange" : closing.tone === "closed" ? "bg-ink/10 text-ink/60" : "bg-lime/40 text-yebo-deep"}`}>{closing.label}</span>}
        </div>
      </div>

      {submitted && submittedAt && (
        <div className="mt-4 rounded-2xl border border-yebo/25 bg-lime/25 p-4 text-sm font-semibold text-ink">
          Bid emailed to {submittedTo} on {formatSouthAfricaDateTime(submittedAt)}.
          {status === "submitted" && (
            <span className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => outcome("won")} className="rounded-full bg-yebo px-4 py-2 text-xs font-extrabold text-white">We won it</button>
              <button type="button" onClick={() => outcome("lost")} className="rounded-full border border-ink/20 bg-white px-4 py-2 text-xs font-extrabold text-ink">We lost it</button>
            </span>
          )}
        </div>
      )}

      {tender.autoDrafted && lines.length === 0 && !submitted && (
        <div className="mt-4 rounded-2xl border border-yebo/25 bg-lime/25 p-4 text-sm font-semibold text-ink">
          Yebo opened this draft because it matches your trades. Download the tender documents below, import the BOQ, then add your rates and check every line.
        </div>
      )}
      {docLinks.length > 0 && (
        <section className="mt-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm" aria-label="Tender documents">
          <p className="text-xs font-extrabold uppercase tracking-[.14em] text-ink/50">Tender documents</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm font-semibold">
            {docLinks.map((d) => (
              <li key={d.url} className="min-w-0"><a href={d.url} target="_blank" rel="noopener noreferrer" className="block truncate text-yebo underline underline-offset-2">{d.title}</a></li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink/50">Download the BOQ from here, then use Import a BOQ below.</p>
        </section>
      )}

      {/* details */}
      <section className="mt-5 rounded-3xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
        <button type="button" onClick={() => setShowDetails((v) => !v)} className="flex w-full items-center justify-between text-left" aria-expanded={showDetails}>
          <span className="text-sm font-black text-ink">Tender details</span>
          <span className="text-sm font-bold text-yebo">{showDetails ? "Hide" : "Edit"}</span>
        </button>
        {showDetails && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>Tender name<input value={details.title} onChange={(e) => { setDetails({ ...details, title: e.target.value }); setDirty(true); }} className={detailInput} /></label>
            <label className={label}>Tender / RFQ number<input value={details.reference} onChange={(e) => { setDetails({ ...details, reference: e.target.value }); setDirty(true); }} className={detailInput} /></label>
            <label className={label}>Who is asking for prices<input value={details.clientName} onChange={(e) => { setDetails({ ...details, clientName: e.target.value }); setDirty(true); }} className={detailInput} /></label>
            <label className={label}>Trade category
              <select value={details.category} onChange={(e) => { setDetails({ ...details, category: e.target.value }); setDirty(true); }} className={detailInput}>
                <option value="">Choose…</option>
                {TENDER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                {details.category && !(TENDER_CATEGORIES as readonly string[]).includes(details.category) && <option>{details.category}</option>}
              </select>
            </label>
            <label className={label}>Site / area<input value={details.location} onChange={(e) => { setDetails({ ...details, location: e.target.value }); setDirty(true); }} className={detailInput} /></label>
            <label className={label}>Closing date and time<input type="datetime-local" value={closingLocal} onChange={(e) => { setClosingLocal(e.target.value); setDirty(true); }} className={detailInput} /></label>
            <label className={label}>Email the bid to<input type="email" inputMode="email" value={details.submissionEmail} onChange={(e) => { setDetails({ ...details, submissionEmail: e.target.value }); setDirty(true); }} className={detailInput} /></label>
          </div>
        )}
      </section>

      {/* compliance */}
      <div className="mt-5"><VaultPanel checks={checks} onSend={() => setReview(true)} canSend={compliant && !submitted} sending={sending} /></div>

      {/* import */}
      <section className="mt-5">
        {!showImport ? (
          <button type="button" onClick={() => setShowImport(true)} className="inline-flex min-h-11 items-center rounded-xl border border-yebo-deep/15 bg-white px-4 text-sm font-bold text-ink hover:border-yebo">
            {lines.length ? "Import another BOQ file" : "Import a BOQ"}
          </button>
        ) : (
          <BoqImporter tenderId={tender.id} hasLines={lines.length > 0} onDone={() => { setDirty(false); window.location.assign(`/app/tenders/${tender.id}`); }} />
        )}
        {tender.sourceFilename && <p className="mt-2 text-xs text-ink/50">Source: {tender.sourceFilename}</p>}
      </section>

      {/* progress + tools */}
      <section className="mt-6 rounded-3xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.14em] text-ink/50">Bill of quantities</p>
            <p className="mt-1 text-sm font-bold text-ink">{summary.pricedCount} of {summary.itemCount} lines priced{summary.flaggedCount ? ` · ${summary.flaggedCount} to check` : ""}</p>
          </div>
          <a href={`/api/tenders/${tender.id}/boq-xlsx`} className="text-sm font-bold text-yebo underline underline-offset-2">Download priced Excel</a>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-yebo-chalk"><div className="h-full rounded-full bg-yebo transition-all" style={{ width: `${pct}%` }} /></div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {([["all", "All lines"], ["attention", `To check (${summary.flaggedCount})`], ["unpriced", `Not priced (${summary.unpricedCount})`]] as const).map(([k, text]) => (
            <button key={k} type="button" onClick={() => { setFilter(k); setLimit(PAGE); }} aria-pressed={filter === k} className={`min-h-9 rounded-full px-3.5 text-xs font-bold ${filter === k ? "bg-ink text-white" : "bg-yebo-chalk text-ink/70"}`}>{text}</button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={fillFromPast} className="min-h-10 rounded-xl border border-yebo-deep/15 bg-yebo-chalk px-3.5 text-sm font-bold text-ink hover:border-yebo">Fill from my past rates</button>
          <div className="flex items-center gap-1.5">
            <input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" aria-label="Markup percentage" className={`${field} w-16 text-right`} />
            <span className="text-sm font-bold text-ink/60">%</span>
            <button type="button" onClick={applyMarkup} className="min-h-10 rounded-xl border border-yebo-deep/15 bg-yebo-chalk px-3.5 text-sm font-bold text-ink hover:border-yebo">Add to all rates</button>
          </div>
          {undo && <button type="button" onClick={() => { setLines(undo); setUndo(null); setDirty(true); }} className="min-h-10 rounded-xl px-3 text-sm font-bold text-orange">Undo</button>}
        </div>
        {msg && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-lime/25 text-ink" : "bg-orange/10 text-ink"}`}>{msg.text}</p>}
      </section>

      {/* lines */}
      <section className="mt-4">
        <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)_5rem_6rem_7.5rem_8rem_4.75rem] gap-2 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink/45 md:grid">
          <span>Item</span><span>Description</span><span>Unit</span><span className="text-right">Qty</span><span className="text-right">Your rate (R)</span><span className="text-right">Amount</span><span />
        </div>
        <div className="flex flex-col gap-2.5">
          {visible.slice(0, limit).map((l) => <LineRow key={l.id} line={l} onPatch={patch} onRemove={remove} onAddBelow={addBelow} />)}
        </div>
        {visible.length > limit && (
          <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="mt-4 w-full rounded-xl border border-yebo-deep/15 bg-white py-3 text-sm font-bold text-ink hover:border-yebo">Show {Math.min(PAGE, visible.length - limit)} more ({visible.length - limit} left)</button>
        )}
        {visible.length === 0 && <p className="rounded-2xl border border-dashed border-ink/20 bg-white p-6 text-center text-sm text-ink/60">{lines.length === 0 ? "No lines yet. Import a BOQ above, or add a line by hand." : "Nothing here. Every line passes this check."}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => addBelow(null, "item")} className="min-h-11 rounded-xl border border-yebo-deep/15 bg-white px-4 text-sm font-bold text-ink hover:border-yebo">+ Add a line</button>
          <button type="button" onClick={() => addBelow(null, "heading")} className="min-h-11 rounded-xl border border-yebo-deep/15 bg-white px-4 text-sm font-bold text-ink hover:border-yebo">+ Add a section heading</button>
        </div>
      </section>

      <div className="mt-10 flex justify-center">
        <button type="button" onClick={removeTender} className="text-xs font-semibold text-ink/40 underline underline-offset-2 hover:text-orange">Delete this tender</button>
      </div>

      {/* sticky totals bar */}
      <div className="fixed inset-x-0 bottom-[var(--tab-h)] z-10 border-t border-ink/10 bg-paper/95 p-3 backdrop-blur sm:p-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0 text-xs leading-5 text-ink/60">
            <p className="tabular-nums">{randWithCents(totals.subtotalCents)} excl. · {tender.vatPercent > 0 ? `VAT ${tender.vatPercent}% ${randWithCents(totals.vatCents)}` : "no VAT"}</p>
            <p className="text-base font-black tabular-nums text-ink">{randWithCents(totals.totalCents)} <span className="text-xs font-bold text-ink/50">total</span></p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={save} disabled={saving || !dirty} className="min-h-11 rounded-xl border border-yebo-deep/20 bg-white px-4 text-sm font-extrabold text-ink disabled:opacity-50">{saving ? "Saving…" : dirty ? "Save" : "Saved"}</button>
            <button type="button" onClick={() => setReview(true)} disabled={submitted} className="min-h-11 rounded-xl bg-yebo px-4 text-sm font-extrabold text-white hover:bg-yebo-deep disabled:opacity-40">Review &amp; send</button>
          </div>
        </div>
      </div>

      {/* review and send */}
      {review && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Review and send bid">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-black text-ink">Review and send</h2>
              <button type="button" onClick={() => { setReview(false); setResult(null); }} className="grid size-9 place-items-center rounded-lg text-ink/60 hover:bg-yebo-chalk" aria-label="Close">✕</button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink/60">Sending to</dt><dd className="text-right font-bold text-ink">{details.submissionEmail || "Not set"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink/60">Lines priced</dt><dd className="font-bold text-ink">{summary.pricedCount} of {summary.itemCount}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink/60">Total excl. VAT</dt><dd className="font-bold tabular-nums text-ink">{randWithCents(totals.subtotalCents)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink/60">Total incl. VAT</dt><dd className="font-black tabular-nums text-ink">{randWithCents(totals.totalCents)}</dd></div>
            </dl>
            <ul className="mt-4 space-y-1.5">
              {checks.map((c) => (
                <li key={c.key} className="flex items-center gap-2 text-sm"><span className={`grid size-5 place-items-center rounded-md text-[11px] font-black text-white ${c.ok ? "bg-yebo" : "bg-orange"}`}>{c.ok ? "✓" : "✕"}</span><span className={c.ok ? "text-ink/70" : "font-bold text-ink"}>{c.label}</span></li>
              ))}
            </ul>
            {(blockers.length > 0 || !compliant) && (
              <div className="mt-4 rounded-2xl border border-orange/40 bg-orange/10 p-3 text-sm text-ink" role="alert">
                <p className="font-extrabold">Not ready to send yet</p>
                <ul className="mt-1 list-disc pl-5">
                  {blockers.map((b) => <li key={b}>{b}</li>)}
                  {!compliant && <li>{lockMessage(checks)}</li>}
                </ul>
              </div>
            )}
            <p className="mt-4 text-xs leading-5 text-ink/55">One email goes out with your priced schedule and compliance documents merged into a single PDF, plus the priced BOQ in Excel. Replies come to your own email.</p>
            {result && (
              <p role="status" className={`mt-4 rounded-xl px-3 py-2 text-sm font-semibold ${result.ok ? "bg-lime/25 text-ink" : "bg-orange/10 text-ink"}`}>
                {result.ok ? `${result.test ? "Test copy" : "Bid"} sent to ${result.to} (${result.sizeKb} KB).${result.skipped.length ? ` Could not merge: ${result.skipped.join(", ")}.` : ""}` : result.error}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2.5">
              <button type="button" onClick={() => send(false)} disabled={!canSend || sending} className="min-h-12 rounded-xl bg-yebo px-5 text-sm font-extrabold text-white hover:bg-yebo-deep disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink/50">
                {sending ? "Sending…" : "Approve & send bid email"}
              </button>
              <button type="button" onClick={() => send(true)} disabled={sending || !hasBusinessEmail || summary.itemCount === 0} className="min-h-11 rounded-xl border border-yebo-deep/20 bg-white px-5 text-sm font-bold text-ink disabled:opacity-50">Send a test copy to myself first</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
