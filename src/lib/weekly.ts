// "Your week": this week so far against the same point last week, with one plain verdict and one thing to do.
// The rules are fixed and simple on purpose: the verdict names the first weak step in the chain
// quotes sent -> quotes opened -> quotes accepted -> invoiced -> paid. Pure functions first, database loading at the bottom.
import type { SupabaseClient } from "@supabase/supabase-js";
import { southAfricaDate } from "./time";
import { formatRand } from "./money";
import { LOSS_REASONS } from "./winloss";

const SAST_HOURS = 2; // South Africa is UTC+2 all year
const DAY = 24 * 60 * 60 * 1000;

export type WeekWindows = {
  thisStart: Date; thisEnd: Date; lastStart: Date; lastEnd: Date;
  mondayDate: string; // YYYY-MM-DD
  dow: number; // 0 Sunday ... 6 Saturday, in South Africa
  hour: number;
  label: string; // "Mon 10 Nov to Fri 14 Nov"
};

// Monday 00:00 (South African time) up to now, and the same stretch of last week, so a Friday afternoon is never judged against a whole week.
export function weekWindows(now: Date = new Date()): WeekWindows {
  const today = southAfricaDate(now);
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const sinceMonday = (dow + 6) % 7;
  const thisStart = new Date(Date.UTC(y, m - 1, d - sinceMonday) - SAST_HOURS * 60 * 60 * 1000);
  const hour = Number(new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", hourCycle: "h23" }).format(now));
  const fmt = (dt: Date) => new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short" }).format(dt).replace(",", "");
  return {
    thisStart, thisEnd: now,
    lastStart: new Date(thisStart.getTime() - 7 * DAY), lastEnd: new Date(now.getTime() - 7 * DAY),
    mondayDate: southAfricaDate(new Date(thisStart.getTime() + 3 * 60 * 60 * 1000)),
    dow, hour,
    label: `${fmt(thisStart)} to ${fmt(now)}`,
  };
}

// The card appears on Friday from midday and stays through the weekend.
export function showWeeklyCard(now: Date = new Date()): boolean {
  const w = weekWindows(now);
  return (w.dow === 5 && w.hour >= 12) || w.dow === 6 || w.dow === 0;
}

export type WeekData = {
  sent: number; sentPrev: number;
  opened: number; openedPrev: number;
  accepted: number; acceptedPrev: number;
  declined: number;
  collectedCents: number; collectedPrevCents: number;
  // Where things stand right now
  notSeen: number; // quotes sent 2+ days ago that nobody has opened
  hesitating: number; // opened 2+ days ago with no answer
  readyToInvoice: number; readyCents: number;
  overdue: number; overdueCents: number;
  sent14: number; // quotes sent in the last 14 days
  decided30: number; won30: number; // quotes with an answer in the last 30 days
  topLossReason: string | null; // key of LOSS_REASONS
  everSent: boolean;
};

export type Verdict = {
  key: "quiet" | "few-quotes" | "not-seen" | "hesitating" | "low-wins" | "money-waiting" | "slow-payers" | "good" | "steady";
  tone: "good" | "watch" | "calm";
  headline: string;
  detail: string;
  tips: string[];
  action: { label: string; href: string };
  also: string | null;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function cashItem(d: WeekData): { key: "money-waiting" | "slow-payers"; headline: string; detail: string; action: { label: string; href: string }; also: string } | null {
  if (d.readyToInvoice > 0) {
    return {
      key: "money-waiting", headline: "Money is waiting for you",
      detail: `${plural(d.readyToInvoice, "client")} said yes (${formatRand(d.readyCents)}) and ${d.readyToInvoice === 1 ? "has" : "have"} not been invoiced yet. Invoice while the job is fresh.`,
      action: { label: "Make the invoices", href: "/app/documents" },
      also: `${plural(d.readyToInvoice, "accepted quote")} still to invoice (${formatRand(d.readyCents)}).`,
    };
  }
  if (d.overdue > 0) {
    return {
      key: "slow-payers", headline: "Some invoices are overdue",
      detail: `${plural(d.overdue, "invoice")} (${formatRand(d.overdueCents)}) ${d.overdue === 1 ? "is" : "are"} past the due date. A friendly reminder usually works.`,
      action: { label: "Send reminders", href: "/app/reminders" },
      also: `${plural(d.overdue, "invoice")} overdue (${formatRand(d.overdueCents)}).`,
    };
  }
  return null;
}

// One verdict and one action. Honest when there is too little to go on.
export function verdictFor(d: WeekData): Verdict {
  const cash = cashItem(d);
  const base = { tips: [] as string[], also: cash?.also ?? null };

  // Too little to judge
  if (!d.everSent || (d.sent + d.sentPrev + d.sent14 === 0 && !cash)) {
    return {
      ...base, key: "quiet", tone: "calm",
      headline: d.everSent ? "A quiet stretch" : "Your first quote starts the story",
      detail: d.everSent
        ? "No quotes went out in the last two weeks. If that was not on purpose, the first fix is getting in front of more people."
        : "Send a first quote and from next Friday you will see how your week compares.",
      tips: d.everSent ? ["Ask 3 past clients if they know someone who needs work done.", "Post one recent job on your WhatsApp status.", "Make sure your business is on Google Maps with your phone number."] : [],
      action: { label: "Write a quote", href: "/app/quotes/new" }, also: null,
    };
  }

  // 1. Not enough quotes going out: a finding-work problem, not a pricing one.
  const dropped = d.sentPrev >= 4 && d.sent < d.sentPrev / 2;
  if (d.sent <= 1 || dropped) {
    return {
      ...base, key: "few-quotes", tone: "watch",
      headline: "Not enough quotes are going out",
      detail: d.sent === 0
        ? `You sent no quotes this week${d.sentPrev ? `, against ${d.sentPrev} last week` : ""}. When quotes dry up it is usually about getting found, not about your prices.`
        : `${plural(d.sent, "quote")} this week${d.sentPrev ? `, against ${d.sentPrev} last week` : ""}. Fewer quotes means fewer jobs, so this is the one to fix first.`,
      tips: ["Ask 3 past clients if they know someone who needs work done.", "Post one recent job on your WhatsApp status.", "Reply to every enquiry within an hour. The first reply often wins."],
      action: { label: "Write a quote", href: "/app/quotes/new" },
    };
  }

  // 2. Quotes go out but are not being opened.
  if (d.notSeen >= 2 && d.sent14 > 0 && d.notSeen / d.sent14 >= 0.4) {
    return {
      ...base, key: "not-seen", tone: "watch",
      headline: "Some quotes may not be reaching people",
      detail: `${plural(d.notSeen, "quote")} sent more than 2 days ago ${d.notSeen === 1 ? "has" : "have"} not been opened. Check the WhatsApp number or email, and send it again on WhatsApp.`,
      tips: [],
      action: { label: "Open my quotes", href: "/app/documents" },
    };
  }

  // 3. Opened but no answer: they looked and hesitated.
  if (d.hesitating >= 2) {
    const reason = d.topLossReason && d.topLossReason !== "none" ? LOSS_REASONS[d.topLossReason] : null;
    return {
      ...base, key: "hesitating", tone: "watch",
      headline: "They looked, then went quiet",
      detail: `${plural(d.hesitating, "client")} opened ${d.hesitating === 1 ? "their quote" : "their quotes"} and have not answered. A short follow-up in the next day or two wins back more than most people expect.${reason ? ` Your most common reason for losing a quote is: ${reason.toLowerCase()}.` : ""}`,
      tips: d.topLossReason === "price" ? ["Offer a deposit, or Good, Better and Best options, so the price feels easier."] : [],
      action: { label: "Send follow-ups", href: "/app/reminders" },
    };
  }

  // 4. Plenty of answers, few yeses.
  if (d.decided30 >= 4 && d.won30 / d.decided30 < 0.3) {
    const reason = d.topLossReason && d.topLossReason !== "none" ? LOSS_REASONS[d.topLossReason] : null;
    return {
      ...base, key: "low-wins", tone: "watch",
      headline: "Plenty of quotes, not enough yeses",
      detail: `Only ${d.won30} of the last ${d.decided30} answered quotes were accepted.${reason ? ` The reason clients give most: ${reason.toLowerCase()}.` : ""} Look at what the lost ones have in common.`,
      tips: [], action: { label: "See what you win and lose", href: "/app/reports/wins" },
    };
  }

  // 5. The chain looks healthy: put any money job first, otherwise celebrate or stay calm.
  if (cash) return { ...base, key: cash.key, tone: "watch", headline: cash.headline, detail: cash.detail, tips: [], action: cash.action, also: null };

  const better = d.accepted > d.acceptedPrev || (d.accepted === d.acceptedPrev && d.accepted > 0 && d.sent >= d.sentPrev);
  if (better) {
    return { ...base, key: "good", tone: "good", headline: "A good week", detail: `${plural(d.sent, "quote")} sent and ${plural(d.accepted, "yes", "yeses")} so far. Whatever you did this week is working, so do it again next week.`, tips: [], action: { label: "See your numbers", href: "/app/reports/wins" }, also: null };
  }
  return { ...base, key: "steady", tone: "calm", headline: "A steady week", detail: "Nothing is stuck and nothing needs chasing. Keep quotes going out and your numbers will move.", tips: [], action: { label: "Write a quote", href: "/app/quotes/new" }, also: null };
}

// "Up 2", "Down 1", "Same", or nothing to compare yet.
export function arrow(current: number, previous: number): { text: string; tone: "up" | "down" | "flat" } {
  if (current === previous) return { text: previous === 0 ? "None either week" : "Same as last week", tone: "flat" };
  const diff = current - previous;
  return { text: `${diff > 0 ? "Up" : "Down"} ${Math.abs(diff)} on last week`, tone: diff > 0 ? "up" : "down" };
}
export function arrowMoney(current: number, previous: number): { text: string; tone: "up" | "down" | "flat" } {
  if (current === previous) return { text: previous === 0 ? "None either week" : "Same as last week", tone: "flat" };
  const diff = current - previous;
  return { text: `${diff > 0 ? "Up" : "Down"} ${formatRand(Math.abs(diff))} on last week`, tone: diff > 0 ? "up" : "down" };
}

// ---------- database ----------
type Row = Record<string, unknown>;
const distinct = (rows: Row[], type: string, from: Date, to: Date) => {
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.type !== type) continue;
    const t = new Date(String(r.created_at)).getTime();
    if (t >= from.getTime() && t <= to.getTime()) ids.add(String(r.document_id));
  }
  return ids.size;
};

// Works with the signed-in client (row level security) or the admin client; businessId keeps the admin path to one business.
export async function loadWeek(sb: SupabaseClient, businessId: string, now: Date = new Date()): Promise<{ week: WeekData; windows: WeekWindows } | null> {
  const w = weekWindows(now);
  const today = southAfricaDate(now);
  const daysAgo = (n: number) => southAfricaDate(new Date(now.getTime() - n * DAY));

  const [{ data: events, error: eventsError }, { data: pays }, docsRes] = await Promise.all([
    sb.from("events").select("type,document_id,created_at,documents!inner(type,business_id)").eq("documents.business_id", businessId).eq("documents.type", "quote")
      .in("type", ["sent", "viewed", "accepted", "declined"]).gte("created_at", w.lastStart.toISOString()).lte("created_at", w.thisEnd.toISOString()).limit(5000),
    sb.from("payments").select("amount_cents,paid_at,method,documents!inner(business_id)").eq("documents.business_id", businessId).neq("method", "credit")
      .gte("paid_at", w.lastStart.toISOString()).lte("paid_at", w.thisEnd.toISOString()).limit(5000),
    sb.from("documents").select("id,type,status,total_cents,issue_date,due_date,expiry_date,source_quote_id,decline_reason").eq("business_id", businessId).gte("issue_date", daysAgo(120)).limit(3000),
  ]);
  if (eventsError) { console.error("[weekly] events:", eventsError.message); return null; }
  let docs = docsRes.data as Row[] | null;
  if (docsRes.error) {
    // decline_reason needs migration 0023; fall back without it
    const fb = await sb.from("documents").select("id,type,status,total_cents,issue_date,due_date,expiry_date,source_quote_id").eq("business_id", businessId).gte("issue_date", daysAgo(120)).limit(3000);
    docs = (fb.data as Row[] | null) ?? [];
  }
  const ev = (events ?? []) as Row[];
  const paid = (from: Date, to: Date) => ((pays ?? []) as Row[]).reduce((sum, p) => { const t = new Date(String(p.paid_at)).getTime(); return t >= from.getTime() && t <= to.getTime() ? sum + Number(p.amount_cents) : sum; }, 0);

  const all = docs ?? [];
  const converted = new Set(all.map((x) => x.source_quote_id).filter(Boolean) as string[]);
  const quotes = all.filter((x) => x.type === "quote" && x.status !== "draft");
  const expired = (x: Row) => x.status === "expired" || Boolean(x.expiry_date && String(x.expiry_date) < today);
  const old2 = daysAgo(2);
  const notSeen = quotes.filter((x) => x.status === "sent" && !expired(x) && String(x.issue_date) <= old2).length;
  const hesitating = quotes.filter((x) => x.status === "viewed" && !expired(x) && String(x.issue_date) <= old2).length;
  const ready = quotes.filter((x) => x.status === "accepted" && !converted.has(String(x.id)));
  const overdue = all.filter((x) => x.type === "invoice" && ["sent", "viewed", "partially_paid"].includes(String(x.status)) && x.due_date && String(x.due_date) < today);
  const since30 = daysAgo(30);
  const recent30 = quotes.filter((x) => String(x.issue_date) >= since30);
  const won30 = recent30.filter((x) => x.status === "accepted").length;
  const lost = recent30.filter((x) => x.status === "declined");
  const reasons = new Map<string, number>();
  for (const x of lost) { const k = x.decline_reason && LOSS_REASONS[String(x.decline_reason)] ? String(x.decline_reason) : "none"; reasons.set(k, (reasons.get(k) ?? 0) + 1); }
  const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    windows: w,
    week: {
      sent: distinct(ev, "sent", w.thisStart, w.thisEnd), sentPrev: distinct(ev, "sent", w.lastStart, w.lastEnd),
      opened: distinct(ev, "viewed", w.thisStart, w.thisEnd), openedPrev: distinct(ev, "viewed", w.lastStart, w.lastEnd),
      accepted: distinct(ev, "accepted", w.thisStart, w.thisEnd), acceptedPrev: distinct(ev, "accepted", w.lastStart, w.lastEnd),
      declined: distinct(ev, "declined", w.thisStart, w.thisEnd),
      collectedCents: paid(w.thisStart, w.thisEnd), collectedPrevCents: paid(w.lastStart, w.lastEnd),
      notSeen, hesitating,
      readyToInvoice: ready.length, readyCents: ready.reduce((s, x) => s + Number(x.total_cents), 0),
      overdue: overdue.length, overdueCents: overdue.reduce((s, x) => s + Number(x.total_cents), 0),
      sent14: quotes.filter((x) => String(x.issue_date) >= daysAgo(14)).length,
      decided30: won30 + lost.length, won30,
      topLossReason: top ? top[0] : null,
      everSent: quotes.length > 0,
    },
  };
}
