"use client";
import { useState } from "react";
import Link from "next/link";
import { waLink } from "@/lib/dates";
import { reminderDetail, reminderKindLabel, reminderMessage, type ReminderItem } from "@/lib/reminder-queue";
import { recordReminderSent } from "../documents/actions";

type Wire = ReminderItem; // plain data only, so it can cross from the server page

// One reminder at a time: read the message, tap to open WhatsApp, come back, and the next one is ready.
export default function ReminderQueue({ items }: { items: Wire[] }) {
  const [index, setIndex] = useState(0);
  const [sent, setSent] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const total = items.length;
  const item = items[index];

  if (!item) {
    return (
      <div role="status" className="mt-6 rounded-3xl bg-lime/30 p-6 text-center">
        <p className="text-xl font-black text-ink">{total === 0 ? "Nothing to send today" : "All done"}</p>
        <p className="mt-2 text-sm text-ink/70">
          {total === 0
            ? "No reminders are due right now. We will email you the morning there are some."
            : `You opened ${sent} reminder${sent === 1 ? "" : "s"} in WhatsApp${skipped ? ` and skipped ${skipped}` : ""}. Each client is left alone for 3 days before the next nudge.`}
        </p>
        <Link href="/app" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-ink px-6 text-sm font-extrabold text-white">Back to dashboard</Link>
      </div>
    );
  }

  const message = edits[item.documentId] ?? reminderMessage(item);
  const href = waLink(item.whatsapp, message);

  function opened() {
    // Never block the WhatsApp tab from opening: record in the background. This starts the 3 day wait.
    void recordReminderSent(item.documentId, item.kind === "quote_followup" ? "quote_followup" : "reminder").catch((error) => console.error("Could not record the reminder:", error));
    setSent((n) => n + 1);
    setIndex((i) => i + 1);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-[0.14em] text-ink/50">
        <span>{index + 1} of {total}</span>
        <span>{sent} opened{skipped ? ` · ${skipped} skipped` : ""}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
        <div className="h-full rounded-full bg-yebo transition-all" style={{ width: `${Math.round((index / total) * 100)}%` }} />
      </div>

      <article key={item.documentId} className="fade-up mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6" aria-label={`Reminder for ${item.clientName}`}>
        <p className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${item.kind === "invoice_overdue" ? "bg-orange/15 text-orange" : "bg-ink/8 text-ink/70"}`}>{reminderKindLabel(item.kind)}</p>
        <h2 className="mt-3 text-xl font-black tracking-tight text-ink">{item.clientName}</h2>
        <p className="text-sm text-ink/65">{item.number} · {reminderDetail(item)}</p>

        <label htmlFor="reminder-text" className="mt-4 block text-xs font-extrabold uppercase tracking-[0.14em] text-ink/50">Message (you can edit it)</label>
        <textarea
          id="reminder-text"
          rows={9}
          value={message}
          onChange={(event) => setEdits((current) => ({ ...current, [item.documentId]: event.target.value }))}
          className="mt-1 w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-6 outline-none focus:border-orange focus:bg-white"
        />

        {!item.whatsapp && (
          <p className="mt-2 rounded-xl bg-orange/10 p-3 text-xs leading-5 text-ink/75">
            There is no WhatsApp number saved for {item.firstName}. WhatsApp will ask you to pick the contact. Add the number on the client to skip that step next time.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={opened} className="inline-flex min-h-14 flex-1 items-center justify-center rounded-xl bg-[#25D366] px-5 text-base font-black text-ink shadow-sm hover:brightness-95">
            Open WhatsApp
          </a>
          <button type="button" onClick={() => { setSkipped((n) => n + 1); setIndex((i) => i + 1); }} className="min-h-14 rounded-xl border-2 border-ink/15 px-5 text-sm font-bold text-ink">
            Skip for now
          </button>
        </div>
        <p className="mt-3 text-xs text-ink/50">You always press send yourself in WhatsApp. Nothing goes out without you.</p>
        <Link href={`/app/documents/${item.documentId}`} className="mt-2 inline-block text-xs font-semibold text-ink/50 underline underline-offset-2">Open {item.number}</Link>
      </article>
    </div>
  );
}
