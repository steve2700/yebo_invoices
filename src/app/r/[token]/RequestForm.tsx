"use client";

import { useState, useTransition } from "react";
import { submitRequest } from "./actions";

const field = "mt-2 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-yebo focus:ring-2 focus:ring-yebo/20";
const label = "mt-5 block text-sm font-bold text-ink";

export default function RequestForm({ token, businessName, color }: { token: string; businessName: string; color: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<"form" | "done">("form");
  const [error, setError] = useState("");

  if (state === "done") {
    return (
      <div role="status" className="rounded-3xl bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-4xl" aria-hidden="true">✓</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Request sent</h2>
        <p className="mt-2 text-base leading-7 text-ink/70">{businessName} has your details and will get back to you with a quote. You do not need to do anything else.</p>
      </div>
    );
  }

  return (
    <form
      className="rounded-3xl bg-white p-5 shadow-sm sm:p-8"
      action={(formData) => {
        setError("");
        start(async () => {
          const res = await submitRequest(token, formData).catch(() => ({ ok: false, error: "Could not send. Check your connection and try again." }));
          if (res.ok) setState("done");
          else setError(res.error ?? "Something went wrong.");
        });
      }}
    >
      <label className={label + " mt-0"} htmlFor="name">Your name</label>
      <input id="name" name="name" required maxLength={80} autoComplete="name" className={field} />

      <label className={label} htmlFor="whatsapp">WhatsApp number</label>
      <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="082 123 4567" className={field} />

      <label className={label} htmlFor="email">Email <span className="font-normal text-ink/50">(optional)</span></label>
      <input id="email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={120} className={field} />

      <label className={label} htmlFor="location">Where is the job? <span className="font-normal text-ink/50">(suburb or town)</span></label>
      <input id="location" name="location" maxLength={100} className={field} />

      <label className={label} htmlFor="details">What do you need done?</label>
      <textarea id="details" name="details" required minLength={8} maxLength={1500} rows={5} placeholder="For example: replace a leaking geyser, about 150 litres, in the garage." className={field} />

      {/* A hidden field only bots fill in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        style={{ backgroundColor: color }}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-extrabold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Sending…" : "Ask for a quote"}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-ink/50">Your details go only to {businessName}.</p>
    </form>
  );
}
