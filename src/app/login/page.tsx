"use client";

import { useEffect, useState } from "react";
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
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // The sign-in link only works in the browser where it was asked for. If it failed somewhere else, say so clearly.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("e") === "link") {
      setError(true);
      setMsg("That sign-in link did not work in this browser. A link only works in the browser where you asked for it, so Chrome and Brave do not share it. Enter your email below, then type the 6-digit code from the email instead.");
    }
  }, []);
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
      setSent(true);
      setMsg("We sent a code and a sign-in link to your email. Type the code below. It can take a minute, so check spam too.");
    } catch (caught) {
      setError(true);
      setMsg(caught instanceof Error ? caught.message : "Could not send a sign-in link. Please try again.");
    } finally {
      setEmailPending(false);
    }
  }

  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verifyCode(code);
  }

  async function verifyCode(token: string) {
    if (verifying) return;
    setVerifying(true);
    setError(false);
    setMsg("");
    try {
      const { error: authError } = await createClient().auth.verifyOtp({ email: email.trim(), token: token.replace(/\s/g, ""), type: "email" });
      if (authError) throw authError;
      window.location.assign("/app");
    } catch {
      setError(true);
      setMsg("That code did not work. Check the newest email, or ask for a new code.");
      setVerifying(false);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <aside className="relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-yebo-deep p-6 text-white sm:min-h-[340px] sm:p-9 lg:min-h-screen lg:p-12">
        <div className="relative z-10 flex items-center justify-between">
          <Logo light />
          <Link className="rounded-full border border-white/30 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/10 lg:hidden" href="/">
            Home
          </Link>
        </div>
        <div className="relative z-10 mt-12 max-w-lg">
          <h1 className=" text-3xl font-extrabold leading-[1.02] tracking-[-.05em] sm:text-4xl lg:text-5xl">
            Good work deserves a clear quote.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
            Set up your business, share professional quotes and keep the next step simple.
          </p>
          <Image src="/signs/sign-03.webp" alt="Yard sign reading: Bro, you didn't put your quotes in Yebo already?" width={560} height={560} className="mt-8 hidden w-full max-w-xs lg:block" />
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
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-yebo-deep/25 bg-white px-5 py-3 text-sm font-bold text-yebo-deep transition hover:bg-yebo-chalk disabled:cursor-wait disabled:opacity-60"
          >
            <svg data-google-g aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
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

          {sent && (
            <form data-signin-code onSubmit={verify} className="mt-5 flex flex-col gap-3">
              <p className="text-sm leading-6 text-yebo-deep/70">Check your email on any device, then type the code here.</p>
              <label htmlFor="signin-code" className="text-xs font-extrabold uppercase tracking-[.14em] text-yebo-deep/60">Code from your email</label>
              <input
                id="signin-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={code}
                onChange={(event) => {
                  const next = event.target.value.replace(/[^0-9]/g, "");
                  setCode(next);
                  if (next.length === 6) void verifyCode(next);
                }}
                placeholder="123456"
                className="min-h-12 w-full rounded-2xl border border-yebo-deep/15 bg-white px-4 py-3 text-center text-lg font-bold tracking-[.3em] text-yebo-deep outline-none focus:border-yebo focus:ring-2 focus:ring-yebo/15"
              />
              <button
                type="submit"
                disabled={verifying || code.length < 6}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-yebo px-5 py-3 text-sm font-extrabold text-white transition hover:bg-yebo-deep disabled:cursor-wait disabled:opacity-50"
              >
                {verifying ? "Checking code…" : "Sign in with code"}
              </button>
              <p className="text-xs leading-5 text-yebo-deep/55">Tip: type the code in this same browser tab. If you tap the link instead, open it in the browser you started in.</p>
            </form>
          )}

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
