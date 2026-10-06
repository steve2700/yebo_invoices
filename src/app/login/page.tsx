"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function google() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  }
  async function magic(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setMsg(error ? error.message : "Check your email for a sign-in link.");
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-extrabold">Sign in to Yebo</h1>
      <button onClick={google} className="mt-6 w-full rounded-xl bg-yebo px-4 py-3 font-bold text-white">
        Continue with Google
      </button>
      <form onSubmit={magic} className="mt-6 space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.co.za" className="w-full rounded-xl border px-3 py-3" />
        <button className="w-full rounded-xl border-2 border-yebo px-4 py-3 font-bold text-yebo">Email me a link</button>
      </form>
      {msg && <p className="mt-4 text-sm text-neutral-600">{msg}</p>}
    </main>
  );
}
