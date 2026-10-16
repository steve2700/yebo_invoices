"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// PayFast confirms the subscription with our server a few seconds after the owner comes back.
// This re-checks the page every few seconds, then stops so it never loops forever.
export default function Refresher({ intervalMs = 3000, maxTries = 15 }: { intervalMs?: number; maxTries?: number }) {
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
    <p role="status" className="mt-5 text-sm leading-6 text-ink/65">
      This is taking a little longer than usual. If you have paid, you can safely leave this page. Your plan switches on as soon as PayFast confirms the payment, and we will email you.
    </p>
  ) : (
    <p role="status" aria-live="polite" className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-ink/70">
      <span aria-hidden="true" className="soft-pulse size-2 rounded-full bg-orange" /> Confirming your payment…
    </p>
  );
}
