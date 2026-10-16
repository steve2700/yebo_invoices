import { createClient } from "@/lib/supabase/server";
import { billingEnforced, hasAccess, planOf, type SubscriptionRow } from "@/lib/access";
import { FAIR_USE, PLANS, type Plan } from "@/lib/plans";
import { formatSouthAfricaDateTime, southAfricaMonth } from "@/lib/time";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Everything about what the signed-in owner is allowed to do right now.
// When billing is not switched on (BILLING_ENFORCED), everyone has full access and there are no limits.
export type Entitlement = {
  enforced: boolean;
  allowed: boolean;
  plan: Plan | null;
  sub: SubscriptionRow | null;
  docsLimit: number | null; // null = no limit
  voiceLimit: number | null;
};

export async function loadSubscription(supabase: Supabase): Promise<SubscriptionRow | null> {
  const { data } = await supabase.from("subscriptions").select("status,plan,current_period_end,pf_token,cancelled_at").maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

export async function entitlement(supabase: Supabase): Promise<Entitlement> {
  if (!billingEnforced()) return { enforced: false, allowed: true, plan: null, sub: null, docsLimit: null, voiceLimit: null };
  const sub = await loadSubscription(supabase);
  const allowed = hasAccess(sub);
  const plan = allowed ? PLANS[planOf(sub)] : null;
  return {
    enforced: true,
    allowed,
    plan,
    sub,
    docsLimit: plan ? (plan.docsPerMonth ?? FAIR_USE.documentsPerMonth) : 0,
    voiceLimit: plan ? (plan.voicePerMonth ?? FAIR_USE.voicePerMonth) : 0,
  };
}

// What has been used so far this month (South African calendar month).
export async function monthUsage(supabase: Supabase) {
  const month = southAfricaMonth();
  const [{ count: docs }, { count: voice }] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).gte("created_at", month.startIso).lt("created_at", month.endIso),
    supabase.from("usage_events").select("id", { count: "exact", head: true }).eq("kind", "voice_quote").gte("created_at", month.startIso).lt("created_at", month.endIso),
  ]);
  return { docs: docs ?? 0, voice: voice ?? 0 };
}

export type Allowance = { ok: true } | { ok: false; message: string };

const upgradeHint = "You can upgrade your plan in Settings.";

export async function checkDocumentAllowance(supabase: Supabase): Promise<Allowance> {
  const ent = await entitlement(supabase);
  if (!ent.enforced) return { ok: true };
  if (!ent.allowed) return { ok: false, message: "Your plan has ended. Choose a plan to keep creating quotes and invoices." };
  const { docs } = await monthUsage(supabase);
  if (ent.docsLimit !== null && docs >= ent.docsLimit) {
    return { ok: false, message: `You have used all ${ent.docsLimit} quotes and invoices on ${ent.plan?.name} this month. ${upgradeHint}` };
  }
  return { ok: true };
}

export async function checkVoiceAllowance(supabase: Supabase): Promise<Allowance> {
  const ent = await entitlement(supabase);
  if (!ent.enforced) return { ok: true };
  if (!ent.allowed) return { ok: false, message: "Your plan has ended. Choose a plan to keep using voice quotes." };
  const { voice } = await monthUsage(supabase);
  if (ent.voiceLimit !== null && voice >= ent.voiceLimit) {
    return { ok: false, message: `You have used ${ent.voiceLimit === 1 ? "your 1 voice quote" : `all ${ent.voiceLimit} voice quotes`} on ${ent.plan?.name} this month. You can still type your ${"quote"}, or upgrade your plan in Settings for more.` };
  }
  return { ok: true };
}

// How many voice quotes are left this month, or null when there is no limit to show.
export async function voiceQuotesLeft(supabase: Supabase): Promise<number | null> {
  const ent = await entitlement(supabase);
  if (!ent.enforced || !ent.allowed || ent.plan?.voicePerMonth == null) return null;
  const { voice } = await monthUsage(supabase);
  return Math.max(ent.plan.voicePerMonth - voice, 0);
}

// AI features and reminders cost money to run, so they need a plan that is currently paid up.
export async function checkAiAccess(supabase: Supabase, needs?: "reminders"): Promise<Allowance> {
  const ent = await entitlement(supabase);
  if (!ent.enforced) return { ok: true };
  if (!ent.allowed) return { ok: false, message: "Your plan has ended. Choose a plan to keep using this feature." };
  if (needs === "reminders" && !ent.plan?.reminders) {
    return { ok: false, message: `Reminders are part of The Real Business plan and above. ${upgradeHint}` };
  }
  return { ok: true };
}

// A short note shown at the top of the app when the plan needs attention.
export async function billingBanner(): Promise<{ tone: "warn" | "info"; text: string } | null> {
  if (!billingEnforced()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const sub = await loadSubscription(supabase);
  if (!sub || sub.status === "comped" || !hasAccess(sub)) return null;
  const until = sub.current_period_end ? formatSouthAfricaDateTime(sub.current_period_end).split(",").slice(0, 2).join(",") : "";
  if (sub.status === "cancelled") return { tone: "info", text: `Your plan is cancelled and stays active until ${until}. You will not be charged again.` };
  if (sub.status === "past_due") return { tone: "warn", text: `Your last payment did not go through. Please check your PayFast details so your plan stays active past ${until}.` };
  return null;
}
