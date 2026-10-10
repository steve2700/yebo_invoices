"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// PayFast confirms a payment with our server a few seconds after the client comes back.
// This re-checks the page every few seconds, then stops so it never loops forever.
export default function RefreshWhilePending({ intervalMs = 4000, maxTries = 10 }: { intervalMs?: number; maxTries?: number }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  const finished = tries >= maxTries;

  useEffect(() => {
    if (finished) return;
    const timer = window.setTimeout(() => {
      router.refresh();
      setTries((count) => count + 1);
    }, intervalMs);
    return () => window.clearTimeout(timer);
  }, [tries, finished, intervalMs, router]);

  return finished ? (
    <p role="status" className="mt-4 text-sm leading-6 text-ink/60">
      This is taking a little longer than usual. If you have paid, you can safely close this page. The invoice will show as paid as soon as PayFast confirms it.
    </p>
  ) : (
    <p role="status" aria-live="polite" className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-ink/70">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-orange" /> Confirming your payment…
    </p>
  );
}
