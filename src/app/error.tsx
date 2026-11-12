"use client";

import { useEffect } from "react";
import Link from "next/link";

// Shown when one page breaks but the rest of the app is fine. A clear way forward instead of a dead page.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side problems are already logged on the server; nothing more to do here.
    void error;
  }, [error]);
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-extrabold text-yebo-deep">That page did not load properly</h1>
      <p className="mt-3 text-base leading-7 text-yebo-deep/75">Your work is safe. Try again, and if it keeps happening, tell Steve on WhatsApp and he will sort it out.</p>
      <div className="mt-7 flex flex-col items-center gap-3">
        <button onClick={() => reset()} className="inline-flex min-h-12 items-center rounded-xl bg-yebo px-7 text-base font-bold text-white transition hover:bg-yebo-deep">Try again</button>
        <Link href="/app" className="text-sm font-semibold text-yebo underline underline-offset-2">Go to my dashboard</Link>
      </div>
    </main>
  );
}
