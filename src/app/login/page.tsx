"use client";
import { useState } from "react";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(false);
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function google() {
    try {
      await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    } catch {
      setError(true);
      setMsg("Sign-in is temporarily unavailable because Supabase is not configured for this deployment.");
    }
  }
  async function magic(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
      setError(!!error);
      setMsg(error ? "We could not send that link. Check the email and try again." : "Check your email for your sign-in link. It can take a minute, so check spam too.");
    } catch {
      setError(true);
      setMsg("Sign-in is temporarily unavailable because Supabase is not configured for this deployment.");
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-yebo-deep p-12 text-white lg:flex">
        <Logo light />
        <div>
          <p className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Quotes clients say yes to.</p>
          <p className="mt-4 max-w-sm text-white/70">Set up your business once. Send your first quote in about three minutes.</p>
        </div>
        <p className="text-sm text-white/50">Made in South Africa for small business.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-extrabold tracking-tight">Sign in or create your account</h1>
          <p className="mt-2 text-yebo-deep/70">New here? Signing in creates your account automatically.</p>
          <button onClick={google} className="mt-8 w-full rounded-full bg-yebo-deep px-5 py-3.5 font-bold text-white hover:bg-yebo">Continue with Google</button>
          <div className="my-6 flex items-center gap-3 text-sm text-yebo-deep/50"><span className="h-px flex-1 bg-yebo-deep/15" />or<span className="h-px flex-1 bg-yebo-deep/15" /></div>
          <form onSubmit={magic} className="space-y-3">
            <label className="block text-sm font-semibold" htmlFor="email">Email address</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.co.za" className="w-full rounded-xl border-2 border-yebo-deep/15 bg-white px-4 py-3 focus:border-yebo focus:outline-none" />
            <button className="w-full rounded-full border-2 border-yebo px-5 py-3 font-bold text-yebo hover:bg-yebo hover:text-white">Email me a sign-in link</button>
          </form>
          {msg && <p className={`mt-4 rounded-xl p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{msg}</p>}
        </div>
      </section>
    </main>
  );
}
