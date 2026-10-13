"use client";

import { useTransition } from "react";
import { markPaymentThanked } from "@/app/app/payments/actions";

type Props = {
  paymentId: string;
  href: string; // a wa.me link with the thank-you message already written
  firstName: string;
};

// Opens WhatsApp with a ready-to-send thank-you, and removes the card from the dashboard.
// The owner still reads and sends the message themselves. Nothing is sent automatically.
export default function ThankClientButton({ paymentId, href, firstName }: Props) {
  const [pending, startTransition] = useTransition();

  function markDone() {
    startTransition(() => {
      void markPaymentThanked(paymentId);
    });
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={markDone}
        aria-label={`Thank ${firstName} on WhatsApp`}
        className="inline-flex min-h-11 items-center rounded-xl bg-yebo px-4 text-sm font-extrabold text-white transition hover:bg-yebo-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2"
      >
        Thank {firstName} on WhatsApp
      </a>
      <button
        type="button"
        disabled={pending}
        onClick={markDone}
        className="min-h-11 rounded-xl px-3 text-xs font-bold text-ink/55 transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo disabled:opacity-50"
      >
        Not needed
      </button>
    </div>
  );
}
