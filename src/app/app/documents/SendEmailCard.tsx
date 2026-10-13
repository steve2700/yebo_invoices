"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendDocumentEmail, type EmailResult } from "./actions";
import { formatSouthAfricaClock } from "@/lib/time";

type Props = {
  documentId: string;
  kind: "quote" | "invoice";
  clientName: string;
  clientFirstName: string;
  clientEmail: string | null;
  businessEmail: string | null;
  lastEmailedAt: string | null; // when this document was last emailed, if ever
};

// "Email the quote": tells the owner what will happen, shows that it is working, then confirms it was sent.
export default function SendEmailCard({ documentId, kind, clientName, clientFirstName, clientEmail, businessEmail, lastEmailedAt }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<EmailResult | null>(null);

  const hasEmail = Boolean(clientEmail);
  const alreadySent = Boolean(lastEmailedAt) || result?.ok === true;

  function send() {
    setResult(null);
    startTransition(async () => {
      try {
        const outcome = await sendDocumentEmail(documentId);
        setResult(outcome);
        if (outcome.ok) router.refresh(); // updates the status and the activity list underneath
      } catch {
        setResult({ ok: false, error: "Something went wrong and nothing was sent. Please try again." });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-yebo/10 text-lg text-yebo">✉</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-ink">Email the {kind} with a PDF</h3>
          {hasEmail ? (
            <p className="mt-1 text-sm leading-6 text-ink/65">
              We email <b className="break-all text-ink">{clientEmail}</b> a PDF copy and a link to view it online.
              {businessEmail ? <> If {clientFirstName} replies, it comes straight to <b className="break-all text-ink">{businessEmail}</b>.</> : <> <a href="/app/settings#contact" className="font-bold text-yebo underline underline-offset-2">Add your business email in Settings</a> so replies reach you.</>}
            </p>
          ) : (
            <p className="mt-1 text-sm leading-6 text-ink/65">
              {clientName} has no email address saved, so we cannot email this. Use WhatsApp below instead.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        {!(result?.ok) && (
          <button
            type="button"
            onClick={send}
            disabled={!hasEmail || pending}
            aria-busy={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yebo px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <span aria-hidden="true" className="spin inline-block size-4 rounded-full border-2 border-white border-t-transparent" />
                Sending to {clientFirstName}…
              </>
            ) : alreadySent || result?.ok === false ? (
              `Email the ${kind} again`
            ) : (
              `Email the ${kind} to ${clientFirstName}`
            )}
          </button>
        )}

        {pending && (
          <div role="status" className="fade-up mt-3">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-yebo/15"><div className="shimmer-bar absolute inset-0" /></div>
            <p className="mt-2 text-xs text-ink/55">Preparing the PDF and sending it. This usually takes a few seconds. Please keep this page open.</p>
          </div>
        )}

        {result?.ok && (
          <div role="status" className="pop-in mt-1 flex items-start gap-3 rounded-xl border border-yebo/25 bg-lime/25 p-3.5">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 shrink-0 text-yebo" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" className="opacity-30" />
              <path d="M7.5 12.5l3 3 6-7" className="draw-check" />
            </svg>
            <div className="text-sm leading-6 text-ink">
              <p className="font-extrabold">Sent! Your {kind} is on its way to {clientFirstName}.</p>
              <p className="text-ink/70">Emailed to <b className="break-all">{result.to}</b> at {formatSouthAfricaClock(result.at)}.</p>
              <p className="text-ink/70">
                {result.replyTo ? <>Replies will come to <b className="break-all">{result.replyTo}</b>. </> : null}
                We will show here when {clientFirstName} opens it.
              </p>
              <button type="button" onClick={() => setResult(null)} className="mt-1 text-xs font-bold text-yebo underline underline-offset-2">Send it again</button>
            </div>
          </div>
        )}

        {result?.ok === false && (
          <p role="alert" className="fade-up mt-3 rounded-xl border border-orange/30 bg-orange/10 p-3 text-sm font-semibold leading-6 text-ink">{result.error}</p>
        )}

        {!pending && !result && lastEmailedAt && (
          <p className="mt-3 text-xs text-ink/55">Last emailed to {clientFirstName} on {lastEmailedAt}. You can send it again if they have not seen it.</p>
        )}
      </div>
    </div>
  );
}
