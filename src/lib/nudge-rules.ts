// Who should get a friendly reminder email, and which one. Pure logic, so it is easy to test.
export type NudgeKind = "onboarding" | "first_quote";

export type NudgeUser = { id: string; email?: string | null; created_at: string };
export type NudgeBusiness = { id: string; owner_id: string; name: string | null; created_at: string };
export type NudgeHistory = { user_id: string; kind: string; created_at: string };

export const NUDGE_RULES = {
  maxPerKind: 2, // never more than 2 of each kind to one person
  gapDays: 3, // at least 3 days between two emails to the same person
  onboardingAfterDays: 1, // wait a day before asking about onboarding
  firstQuoteAfterDays: 2, // wait 2 days before asking about the first quote
  giveUpAfterDays: 30, // after a month, stop
  maxPerRun: 30,
};

const DAY = 86_400_000;

export type NudgeTarget = { userId: string; email: string; kind: NudgeKind; name: string | null; sentBefore: number };

export function pickNudges(input: {
  users: NudgeUser[];
  businesses: NudgeBusiness[];
  sentQuoteBusinessIds: Set<string>;
  history: NudgeHistory[];
  optedOut: Set<string>;
  adminEmails: Set<string>;
  now: number;
}): NudgeTarget[] {
  const { users, businesses, sentQuoteBusinessIds, history, optedOut, adminEmails, now } = input;
  const ownerBusiness = new Map(businesses.map((b) => [b.owner_id, b]));
  const byUser = new Map<string, NudgeHistory[]>();
  for (const h of history) {
    if (!byUser.has(h.user_id)) byUser.set(h.user_id, []);
    byUser.get(h.user_id)!.push(h);
  }
  const out: NudgeTarget[] = [];
  for (const u of users) {
    const email = (u.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@") || optedOut.has(email) || adminEmails.has(email)) continue;
    const biz = ownerBusiness.get(u.id);
    let kind: NudgeKind;
    let since: number;
    if (!biz) {
      kind = "onboarding";
      since = new Date(u.created_at).getTime();
      if (now - since < NUDGE_RULES.onboardingAfterDays * DAY) continue;
    } else if (!sentQuoteBusinessIds.has(biz.id)) {
      kind = "first_quote";
      since = new Date(biz.created_at).getTime();
      if (now - since < NUDGE_RULES.firstQuoteAfterDays * DAY) continue;
    } else {
      continue;
    }
    if (!(now - since < NUDGE_RULES.giveUpAfterDays * DAY)) continue;
    const mine = byUser.get(u.id) ?? [];
    const ofKind = mine.filter((h) => h.kind === kind);
    if (ofKind.length >= NUDGE_RULES.maxPerKind) continue;
    const last = mine.reduce((m, h) => Math.max(m, new Date(h.created_at).getTime()), 0);
    if (last && now - last < NUDGE_RULES.gapDays * DAY) continue;
    out.push({ userId: u.id, email, kind, name: biz?.name ?? null, sentBefore: ofKind.length });
    if (out.length >= NUDGE_RULES.maxPerRun) break;
  }
  return out;
}
