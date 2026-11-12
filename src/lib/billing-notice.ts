import type { SubscriptionRow } from "@/lib/access";
import { formatSouthAfricaDateTime } from "@/lib/time";

export type BillingNotice = { tone: "warn" | "info"; text: string; cta?: { label: string; href: string } };

const DAY = 24 * 60 * 60 * 1000;

// What the top-of-app note should say about a plan. Pure, so it is easy to read and to test.
// Comped (free) accounts and healthy, auto-renewing plans see nothing.
export function billingNoticeFor(sub: SubscriptionRow | null | undefined, now: Date = new Date()): BillingNotice | null {
  if (!sub || sub.status === "comped" || !sub.current_period_end) return null;
  const end = new Date(sub.current_period_end);
  const left = end.getTime() - now.getTime();
  if (left <= 0) return null; // the plan has already ended: the plan page takes over
  const days = Math.max(1, Math.ceil(left / DAY));
  const until = formatSouthAfricaDateTime(sub.current_period_end).split(",").slice(0, 2).join(",");
  const inDays = days === 1 ? "tomorrow" : `in ${days} days`;

  if (sub.status === "past_due") {
    return { tone: "warn", text: `Your last payment did not go through. Please check your card so your plan stays active past ${until}.`, cta: { label: "Fix payment", href: "/app/subscribe?change=1" } };
  }
  if (sub.status === "cancelled") {
    if (days <= 7) {
      return { tone: "warn", text: `Your plan ends ${inDays} (${until}). Pay in advance to keep quoting without a break. Any days you have left are added on top.`, cta: { label: "Keep my plan", href: "/app/subscribe?change=1" } };
    }
    return { tone: "info", text: `Your plan is cancelled and stays active until ${until}. You will not be charged again.`, cta: { label: "Keep my plan", href: "/app/subscribe?change=1" } };
  }
  if (sub.provider === "eft" && sub.status === "active" && days <= 5) {
    return { tone: "warn", text: `Your plan ends ${inDays} (${until}). You pay by EFT, so please pay again to carry on without a break.`, cta: { label: "Pay for next month", href: "/app/subscribe?change=1" } };
  }
  return null;
}
