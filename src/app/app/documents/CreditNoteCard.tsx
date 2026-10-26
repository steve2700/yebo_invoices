"use client";
import { useState } from "react";
import { CREDIT_REASONS, randToCents, splitVat } from "@/lib/credit";
import { formatRand } from "@/lib/money";
import SubmitButton from "@/components/SubmitButton";
import { issueCreditNote } from "./actions";

// "Issue a credit note": lowers what the client owes on this invoice. Shows exactly what will happen before it is issued.
export default function CreditNoteCard({ invoiceId, number, balanceCents, vatPercent, error }: { invoiceId: string; number: string; balanceCents: number; vatPercent: number; error?: string }) {
  const [amount, setAmount] = useState("");
  const cents = randToCents(amount);
  const valid = cents !== null && cents <= balanceCents;
  const vat = cents ? splitVat(cents, vatPercent) : null;
  const messages: Record<string, string> = {
    amount: "Enter an amount, for example 500 or 1 250,50.",
    reason: "Choose a reason.",
    toomuch: "That is more than what is still owed on this invoice.",
    failed: "The credit note could not be issued. Nothing was changed. Please try again.",
  };
  return (
    <form
      id="credit"
      action={issueCreditNote}
      onSubmit={(event) => { if (!window.confirm(`Issue a credit note for ${cents ? formatRand(cents) : "this amount"}? It lowers what is owed on ${number} and cannot be undone.`)) event.preventDefault(); }}
      className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5"
    >
      <input type="hidden" name="invoice" value={invoiceId} />
      <p className="text-ink/70">Use a credit note to lower what your client owes (a discount, work not done, or a mistake). It gets its own number and PDF. Money already paid is not touched.</p>
      {error && messages[error] && <p role="alert" className="mt-3 rounded-xl bg-orange/15 p-3 font-bold">{messages[error]}</p>}
      <label htmlFor="credit-amount" className="mt-4 block text-xs font-extrabold uppercase tracking-[0.14em] text-ink/50">Amount to credit (incl. VAT)</label>
      <div className="mt-1 flex gap-2">
        <input id="credit-amount" name="amount" inputMode="decimal" autoComplete="off" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 500" className="min-h-11 w-full rounded-xl border border-ink/15 px-3" />
        <button type="button" onClick={() => setAmount((balanceCents / 100).toFixed(2))} className="min-h-11 shrink-0 rounded-xl border border-ink/15 px-3 font-bold">Full balance</button>
      </div>
      <p className="mt-1 text-xs text-ink/55">Still owed on this invoice: <b>{formatRand(balanceCents)}</b></p>
      {cents !== null && !valid && <p role="alert" className="mt-2 text-xs font-bold text-orange">That is more than what is still owed.</p>}
      {valid && vat && (
        <p className="mt-2 rounded-xl bg-lime/25 p-3 text-xs leading-5">
          Credit of <b>{formatRand(cents!)}</b>{vatPercent > 0 ? <> ({formatRand(vat.subtotalCents)} + {formatRand(vat.vatCents)} VAT)</> : null}. Your client will then owe <b>{formatRand(balanceCents - cents!)}</b>.
        </p>
      )}
      <label htmlFor="credit-reason" className="mt-4 block text-xs font-extrabold uppercase tracking-[0.14em] text-ink/50">Reason</label>
      <select id="credit-reason" name="reason" required defaultValue="" className="mt-1 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3">
        <option value="" disabled>Choose a reason</option>
        {Object.entries(CREDIT_REASONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <label htmlFor="credit-detail" className="mt-4 block text-xs font-extrabold uppercase tracking-[0.14em] text-ink/50">What is it for? (optional, shown on the credit note)</label>
      <input id="credit-detail" name="detail" maxLength={300} className="mt-1 min-h-11 w-full rounded-xl border border-ink/15 px-3" placeholder="e.g. Discount for the delay on site" />
      <div className="mt-4">
        <SubmitButton pendingLabel="Issuing…" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">Issue credit note</SubmitButton>
      </div>
    </form>
  );
}
