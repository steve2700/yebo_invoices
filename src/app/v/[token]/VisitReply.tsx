"use client";

import { useState } from "react";
import { answerVisit } from "./actions";

export default function VisitReply({ token, color }: { token: string; color: string }) {
  const [mode, setMode] = useState<"ask" | "other" | "yes" | "sent">("ask");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(answer: "yes" | "other") {
    setBusy(true); setError("");
    const res = await answerVisit(token, answer, note).catch(() => ({ ok: false, error: "Could not send. Check your connection." }));
    setBusy(false);
    if (res.ok) setMode(answer === "yes" ? "yes" : "sent");
    else setError(res.error ?? "Something went wrong.");
  }

  if (mode === "yes") return (
    <div role="status" className="mt-6 rounded-2xl bg-yebo-chalk p-4 text-center">
      <p className="text-lg font-extrabold text-yebo-deep">Confirmed. See you then.</p>
      <a href={`/v/${token}/ics`} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-yebo px-4 text-sm font-bold text-yebo">Add to my calendar</a>
    </div>
  );
  if (mode === "sent") return <p role="status" className="mt-6 rounded-2xl bg-yebo-chalk p-4 text-center font-bold text-yebo-deep">Thanks. We have your suggestion and will get back to you.</p>;

  return (
    <div className="mt-6">
      {mode === "ask" ? (
        <div className="flex flex-col gap-3">
          <button type="button" disabled={busy} onClick={() => void send("yes")} style={{ backgroundColor: color }} className="min-h-12 rounded-2xl px-5 text-base font-extrabold text-white disabled:opacity-60">{busy ? "Sending…" : "Yes, that works"}</button>
          <button type="button" onClick={() => setMode("other")} className="min-h-12 rounded-2xl border-2 border-ink/15 px-5 text-base font-bold text-ink">Pick another day</button>
          <a href={`/v/${token}/ics`} className="text-center text-sm font-bold text-yebo">Add to my calendar</a>
        </div>
      ) : (
        <div>
          <label htmlFor="note" className="block text-sm font-bold">Which day or time suits you?</label>
          <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} placeholder="For example: Thursday after 3pm, or any morning next week." className="mt-2 w-full rounded-2xl border border-ink/15 px-4 py-3 text-base outline-none focus:border-yebo focus:ring-2 focus:ring-yebo/20" />
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => void send("other")} style={{ backgroundColor: color }} className="min-h-12 flex-1 rounded-2xl px-5 text-base font-extrabold text-white disabled:opacity-60">{busy ? "Sending…" : "Send"}</button>
            <button type="button" onClick={() => setMode("ask")} className="min-h-12 rounded-2xl px-4 text-sm font-bold text-ink/60">Back</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </div>
  );
}
