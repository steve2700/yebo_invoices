"use client";

import { useRef, useState } from "react";
import { waLink } from "@/lib/dates";

type MessageMode = "intro" | "reminder";
type Props = {
  mode: MessageMode;
  documentId: string;
  whatsappNumber: string | null;
  fallbackMessage: string;
  balanceLabel?: string;
};

export default function AiMessageComposer({ mode, documentId, whatsappNumber, fallbackMessage, balanceLabel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const isReminder = mode === "reminder";
  const title = isReminder ? "Payment reminder" : "Document introduction";

  async function draftMessage() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/ai-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: mode, documentId }),
      });
      const result = await response.json() as { message?: unknown; error?: unknown };
      if (!response.ok || typeof result.message !== "string" || !result.message.trim()) {
        throw new Error(typeof result.error === "string" ? result.error : "Could not draft this message.");
      }
      setMessage(result.message);
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
      dialog?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Could not draft this message. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const whatsappUrl = waLink(whatsappNumber, message);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          aria-label={`Draft a ${isReminder ? "payment reminder" : "document introduction"} with AI`}
          onClick={() => void draftMessage()}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${isReminder ? "bg-lime text-ink" : "bg-yebo text-white"}`}
        >
          <span>{pending ? "Drafting..." : `Draft ${isReminder ? "reminder" : "intro"} with AI`}</span>
          {balanceLabel && <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-ink/70">{balanceLabel} due</span>}
        </button>
        <a
          href={waLink(whatsappNumber, fallbackMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center rounded-xl border-2 border-neutral-300 px-4 py-2 text-sm font-bold text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2"
        >
          {isReminder ? "Send standard reminder" : "Send standard message"}
        </a>
      </div>
      <p aria-live="polite" className="mt-1 px-1 text-xs text-neutral-500">
        {pending ? "Writing a draft..." : "Review and edit the draft before WhatsApp opens. Nothing sends automatically."}
      </p>
      {error && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <dialog
        ref={dialogRef}
        aria-labelledby={`draft-${mode}-title`}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[2rem] border-0 bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/60"
      >
        <div className="flex items-start justify-between gap-4 rounded-t-[2rem] bg-ink p-5 text-paper">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-lime">AI draft</p>
            <h2 id={`draft-${mode}-title`} className="mt-1 text-xl font-black">Review your {title.toLowerCase()}</h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-10 rounded-full border border-white/20 px-3 text-sm font-semibold text-paper/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            Close
          </button>
        </div>
        <div className="p-5 sm:p-6">
          <label htmlFor={`draft-${mode}-text`} className="block text-xs font-black uppercase tracking-[0.14em] text-ink/55">WhatsApp message</label>
          <textarea
            id={`draft-${mode}-text`}
            rows={9}
            maxLength={1200}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="mt-2 w-full resize-y rounded-2xl border border-ink/15 bg-white p-4 text-sm leading-6 text-ink outline-none focus:border-orange focus:ring-2 focus:ring-orange/15"
          />
          <p className="mt-2 text-xs leading-5 text-ink/55">You can edit the wording. WhatsApp opens with this message ready for you to review and send.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-11 rounded-xl border-2 border-ink/15 px-4 py-2 text-sm font-bold text-ink"
            >
              Cancel
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex min-h-11 items-center rounded-xl bg-yebo px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2"
            >
              Open WhatsApp
            </a>
          </div>
        </div>
      </dialog>
    </div>
  );
}
