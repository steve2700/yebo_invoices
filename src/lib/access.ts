import { isPlanId, type PlanId } from "@/lib/plans";

// Pure helpers with no server-only imports, so the middleware can use them too.

export type SubscriptionRow = {
  status: string;
  plan: string;
  current_period_end: string | null;
  pf_token?: string | null;
  cancelled_at?: string | null;
};

export const billingEnforced = () => process.env.BILLING_ENFORCED === "true";

// Someone has access if their account is comped, or if they have paid and their paid period has not run out.
// A cancelled plan keeps working until the end of the month that was paid for.
export function hasAccess(sub: SubscriptionRow | null | undefined, now: Date = new Date()) {
  if (!sub) return false;
  if (sub.status === "comped") return true;
  if (sub.status !== "active" && sub.status !== "past_due" && sub.status !== "cancelled") return false;
  return Boolean(sub.current_period_end) && new Date(sub.current_period_end as string).getTime() > now.getTime();
}

export function planOf(sub: SubscriptionRow | null | undefined): PlanId {
  return sub && isPlanId(sub.plan) ? sub.plan : "real";
}
