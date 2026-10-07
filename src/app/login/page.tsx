"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(false);
  const [emailPending, setEmailPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function google() {
    setGooglePending(true);
    setError(false);
    setMsg("");
    try {
      const { error: authError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo() },
      });
      if (authError) throw authError;
    } catch (caught) {
      setError(true);
      setMsg(caught instanceof Error ? caught.message : "Could not start Google sign-in. Please try again.");
      setGooglePending(false);
    }
  }

  async function magic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailPending(true);
    setError(false);
    setMsg("");
    try {
      const { error: authError } = await createClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo() },
      });
      if (authError) throw authError;
      setMsg("Check your email for a sign-in link. It can take a minute, so check spam too.");
    } catch (caught) {
      setError(true);
      setMsg(caught instanceof Error ? caught.message : "Could not send a sign-in link. Please try again.");
    } finally {
      setEmailPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <aside className="relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-yebo-deep p-6 text-white sm:min-h-[340px] sm:p-9 lg:min-h-screen lg:p-12">
        <Image
          src="/images/yebo-client-handoff.png"
          alt="A South African contractor and homeowner reviewing a project estimate together"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-yebo-deep/90 via-yebo-deep/45 to-yebo-deep/30" />
        <div className="relative z-10 flex items-center justify-between">
          <Logo light />
          <Link className="rounded-full border border-white/30 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/10 lg:hidden" href="/">
            Home
          </Link>
        </div>
        <div className="relative z-10 mt-12 max-w-lg">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo-sun">Less admin. More momentum.</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-[1.02] tracking-[-.05em] sm:text-4xl lg:text-5xl">
            Good work deserves a clear quote.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
            Set up your business, share professional quotes and keep the next step simple.
          </p>
        </div>
        <p className="relative z-10 mt-10 hidden text-xs font-medium text-white/65 lg:block">Made in South Africa for small business.</p>
      </aside>

      <section className="flex min-h-[520px] flex-col justify-center px-5 py-12 sm:px-10 lg:min-h-screen lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-yebo">Welcome to Yebo</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-.05em] text-yebo-deep sm:text-4xl">
            Sign in or create your account
          </h2>
          <p className="mt-3 text-sm leading-6 text-yebo-deep/65">
            New to Yebo? Sign in and your account will be created automatically.
          </p>

          <button
            type="button"
            onClick={() => void google()}
            disabled={googlePending}
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-yebo-deep px-5 py-3 text-sm font-bold text-white transition hover:bg-yebo disabled:cursor-wait disabled:opacity-60"
          >
            {googlePending ? "Connecting to Google…" : "Continue with Google"}
          </button>

          <div className="my-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-[.14em] text-yebo-deep/35">
            <span aria-hidden="true" className="h-px flex-1 bg-yebo-deep/15" />
            or use email
            <span aria-hidden="true" className="h-px flex-1 bg-yebo-deep/15" />
          </div>

          <form onSubmit={magic} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-yebo-deep" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@business.co.za"
                className="mt-2 min-h-12 w-full rounded-2xl border border-yebo-deep/15 bg-yebo-chalk/45 px-4 py-3 text-sm text-yebo-deep outline-none transition placeholder:text-yebo-deep/35 focus:border-yebo focus:bg-white focus:ring-2 focus:ring-yebo/15"
              />
            </div>
            <button
              type="submit"
              disabled={emailPending || !email.trim()}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-yebo px-5 py-3 text-sm font-extrabold text-yebo transition hover:bg-yebo hover:text-white disabled:cursor-wait disabled:opacity-50"
            >
              {emailPending ? "Sending sign-in link…" : "Email me a sign-in link"}
            </button>
          </form>

          {msg && (
            <p role={error ? "alert" : "status"} aria-live="polite" className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${error ? "bg-red-50 text-red-800" : "bg-yebo-chalk text-yebo-deep"}`}>
              {msg}
            </p>
          )}

          <div className="mt-8 border-t border-yebo-deep/10 pt-5 text-sm text-yebo-deep/55">
            <Link className="font-bold text-yebo-deep transition-colors hover:text-yebo" href="/">← Back to Yebo</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
