"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { requestAdminCode, verifyAdminCode } from "./actions";

export default function AdminGate() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await requestAdminCode(email);
    setBusy(false);
    if (res.ok) {
      setSent(true);
      setMsg("We sent a 6-digit code to that email. It can take a minute, so check spam too.");
    } else setMsg(res.message ?? "Something went wrong. Please try again.");
  }

  async function check(token: string) {
    if (busy) return;
    setBusy(true);
    setMsg("");
    const res = await verifyAdminCode(email, token);
    if (res.ok) {
      window.location.reload();
      return;
    }
    setBusy(false);
    setMsg("That code did not work. Check the newest email, or ask for a new code.");
  }

  const input = "min-h-12 w-full rounded-2xl border border-yebo-deep/15 bg-white px-4 py-3 text-sm text-yebo-deep outline-none focus:border-yebo focus:ring-2 focus:ring-yebo/15";
  const primary = "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-yebo px-5 text-sm font-extrabold text-white transition hover:bg-yebo-deep disabled:cursor-wait disabled:opacity-50";

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5">
      <div className="w-full max-w-sm rounded-3xl border border-yebo-deep/10 bg-white p-7 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Yebo admin</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-yebo-deep">Admin sign-in</h1>
        <p className="mt-2 text-sm leading-6 text-yebo-deep/65">Enter your admin email. We email you a code to check it is you.</p>

        <form onSubmit={send} className="mt-5 flex flex-col gap-3">
          <label htmlFor="admin-email" className="text-sm font-bold text-yebo-deep">Email address</label>
          <input id="admin-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.co.za" className={input} />
          <button type="submit" disabled={busy || !email.trim()} className={primary}>{sent ? "Send a new code" : "Email me a code"}</button>
        </form>

        {sent && (
          <form onSubmit={(e) => { e.preventDefault(); void check(code); }} className="mt-5 flex flex-col gap-3">
            <label htmlFor="admin-code" className="text-xs font-extrabold uppercase tracking-[.14em] text-yebo-deep/60">Code from your email</label>
            <input
              id="admin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={code}
              onChange={(e) => {
                const next = e.target.value.replace(/[^0-9]/g, "");
                setCode(next);
                if (next.length === 6) void check(next);
              }}
              placeholder="123456"
              className={input + " text-center text-lg font-bold tracking-[.3em]"}
            />
            <button type="submit" disabled={busy || code.length < 6} className={primary}>{busy ? "Checking…" : "Open the dashboard"}</button>
          </form>
        )}

        {msg && <p role="status" aria-live="polite" className="mt-4 rounded-2xl bg-yebo-chalk p-3 text-sm leading-6 text-yebo-deep">{msg}</p>}
      </div>
    </main>
  );
}
