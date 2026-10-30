import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, lastDays } from "@/lib/admin-stats";
import { countSessions } from "@/lib/signin-events";
import { dueNudges } from "@/lib/nudges";
import { PLANS, isPlanId } from "@/lib/plans";

export type AuthUser = { id: string; email?: string; created_at: string; last_sign_in_at?: string; app_metadata?: { provider?: string } };
export type Biz = { id: string; owner_id: string; name: string; email: string | null; phone: string | null; created_at: string };
type Doc = { business_id: string; type: string; status: string; created_at: string };
type Sub = { business_id: string; status: string; plan: string };
export type Survey = { answers: Record<string, string | string[]>; source: string | null; created_at: string };
export type ErrorRow = { id: string; source: string; message: string; last_path: string | null; count: number; last_seen: string };

export const MINUTE = 60_000;
export const DAY = 86_400_000;

async function allUsers(admin: ReturnType<typeof createAdminClient>): Promise<AuthUser[]> {
  const users: AuthUser[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    users.push(...(data.users as AuthUser[]));
    if (data.users.length < 1000) break;
  }
  return users;
}

// Everything the admin pages show, loaded once per request. A table that does not exist yet comes back as null, not as a crash.
export const loadAdminData = cache(async () => {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [users, bizRes, docRes, subRes, surveyRes, errRes, sigRes, nudgeRes, visitRes, due] = await Promise.all([
    allUsers(admin),
    admin.from("businesses").select("id,owner_id,name,email,phone,created_at").order("created_at", { ascending: false }).limit(5000),
    admin.from("documents").select("business_id,type,status,created_at").limit(20000),
    admin.from("subscriptions").select("business_id,status,plan").limit(5000),
    admin.from("survey_responses").select("answers,source,created_at").order("created_at", { ascending: false }).limit(2000),
    admin.from("error_log").select("id,source,message,last_path,count,last_seen").eq("resolved", false).order("last_seen", { ascending: false }).limit(50),
    admin.from("signin_events").select("session_id,step,created_at").gte("created_at", since).limit(20000),
    admin.from("nudges").select("email,kind,created_at").order("created_at", { ascending: false }).limit(15),
    admin.from("visits").select("session_id,source,created_at").gte("created_at", since).limit(20000),
    dueNudges(admin).catch(() => []),
  ]);
  const businesses = (bizRes.data ?? []) as Biz[];
  const docs = (docRes.data ?? []) as Doc[];
  const subs = (subRes.data ?? []) as Sub[];
  const surveys = surveyRes.error ? null : ((surveyRes.data ?? []) as Survey[]);
  const errors = errRes.error ? null : ((errRes.data ?? []) as ErrorRow[]);
  const signins = sigRes.error ? null : ((sigRes.data ?? []) as { session_id: string; step: string; created_at: string }[]);
  const nudgeLog = nudgeRes.error ? null : ((nudgeRes.data ?? []) as { email: string; kind: string; created_at: string }[]);
  const visits = visitRes.error ? null : ((visitRes.data ?? []) as { session_id: string; source: string; created_at: string }[]);

  const now = Date.now();
  const ownerIds = new Set(businesses.map((b) => b.owner_id));
  const withQuote = new Set(docs.filter((d) => d.type === "quote").map((d) => d.business_id));
  const withSent = new Set(docs.filter((d) => d.type === "quote" && d.status !== "draft").map((d) => d.business_id));
  const withPaid = new Set(docs.filter((d) => d.type === "invoice" && d.status === "paid").map((d) => d.business_id));
  const activeSubs = subs.filter((s) => s.status === "active");
  const subscribed = new Set(subs.filter((s) => s.status === "active" || s.status === "comped").map((s) => s.business_id));

  const funnel = [
    { label: "Signed up", value: users.length },
    { label: "Finished onboarding", value: businesses.length },
    { label: "Created a quote", value: withQuote.size },
    { label: "Sent a quote", value: withSent.size },
    { label: "Got a paid invoice", value: withPaid.size },
    { label: "On a paid plan", value: subscribed.size },
  ];

  const notOnboarded = users
    .filter((u) => !ownerIds.has(u.id) && (u.email ?? "").toLowerCase() !== ADMIN_EMAIL && now - new Date(u.created_at).getTime() > 30 * MINUTE)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);
  const noSentQuote = businesses.filter((b) => !withSent.has(b.id) && now - new Date(b.created_at).getTime() > 2 * DAY).slice(0, 50);

  const signupDays = lastDays(users.map((u) => u.created_at), 14);
  const docDays = lastDays(docs.map((d) => d.created_at), 14);

  const week = now - 7 * DAY;
  const signin7 = signins ? countSessions(signins.filter((r) => new Date(r.created_at).getTime() >= week)) : {};
  const signin30 = signins ? countSessions(signins) : {};

  const sourceCounts = (from: number) => {
    const seen = new Map<string, Set<string>>();
    for (const v of visits ?? []) {
      if (new Date(v.created_at).getTime() < from) continue;
      if (!seen.has(v.source)) seen.set(v.source, new Set());
      seen.get(v.source)!.add(v.session_id);
    }
    return [...seen].map(([source, set]) => ({ source, count: set.size })).sort((a, b) => b.count - a.count).slice(0, 12);
  };
  const sources7 = sourceCounts(week);
  const sources30 = sourceCounts(now - 30 * DAY);

  const priceOf = (plan: string) => (isPlanId(plan) ? PLANS[plan].priceRand : 0);
  const mrr = activeSubs.reduce((sum, s) => sum + priceOf(s.plan), 0);
  const byPlan = (["side", "real", "king"] as const).map((p) => ({ plan: p, name: PLANS[p].name, price: PLANS[p].priceRand, count: activeSubs.filter((s) => s.plan === p).length }));
  const subCounts = {
    comped: subs.filter((s) => s.status === "comped").length,
    pastDue: subs.filter((s) => s.status === "past_due").length,
    pending: subs.filter((s) => s.status === "pending").length,
  };
  const userEmail = new Map(users.map((u) => [u.id, u.email ?? ""]));

  return {
    users, businesses, subs, surveys, errors, signins, nudgeLog, visits, due,
    funnel, notOnboarded, noSentQuote, signupDays, docDays, signin7, signin30, sources7, sources30,
    activeSubs, mrr, byPlan, subCounts, userEmail,
  };
});
