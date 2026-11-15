// "Your month": this calendar month against last month, in plain words, for the end-of-month email and the admin page.
import type { SupabaseClient } from "@supabase/supabase-js";
import { southAfricaDate } from "./time";
import { formatRand } from "./money";

const SAST_HOURS = 2; // South Africa is UTC+2 all year
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// The Yebo WhatsApp business line (shown in the email and used by the admin page).
export const YEBO_WHATSAPP_DISPLAY = "069 382 4908";
export const YEBO_WHATSAPP_URL = "https://wa.me/27693824908";

export type MonthWindows = { start: Date; end: Date; prevStart: Date; key: string; label: string; prevLabel: string };

export function monthWindows(now: Date = new Date()): MonthWindows {
  const [y, m] = southAfricaDate(now).split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1) - SAST_HOURS * HOUR);
  const prevStart = new Date(Date.UTC(y, m - 2, 1) - SAST_HOURS * HOUR);
  const name = (dt: Date, withYear: boolean) => new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", month: "long", ...(withYear ? { year: "numeric" } : {}) }).format(new Date(dt.getTime() + 6 * HOUR));
  return { start, end: now, prevStart, key: `${y}-${String(m).padStart(2, "0")}`, label: name(start, true), prevLabel: name(prevStart, false) };
}

// True on the last day of the month in South Africa (28, 29, 30 or 31), so February and 31-day months are handled.
export function isLastDayOfMonth(now: Date = new Date()): boolean {
  return southAfricaDate(new Date(now.getTime() + DAY)).endsWith("-01");
}

export type WeekRow = { label: string; range: string; started: boolean; sent: number; accepted: number; collectedCents: number };

export type MonthData = {
  weeks: WeekRow[];
  sent: number; sentPrev: number;
  accepted: number; acceptedPrev: number;
  declined: number;
  collectedCents: number; collectedPrevCents: number;
  invoiced: number; invoicedCents: number;
  waiting: number; waitingCents: number;
  overdue: number; overdueCents: number;
};
export type MonthVerdict = { headline: string; detail: string; tips: string[] };

export function winRate(d: Pick<MonthData, "accepted" | "declined">): number | null {
  const decided = d.accepted + d.declined;
  return decided >= 2 ? Math.round((d.accepted / decided) * 100) : null;
}

export function hasMonthActivity(d: MonthData): boolean {
  return d.sent > 0 || d.accepted > 0 || d.collectedCents > 0 || d.invoiced > 0;
}

// "up 4", "down R2 000", "same as October" in plain words.
export function versus(now: number, before: number, prevLabel: string, money = false): string {
  if (now === before) return now === 0 ? `none in ${prevLabel} either` : `same as ${prevLabel}`;
  const diff = Math.abs(now - before);
  const text = money ? formatRand(diff) : String(diff);
  return `${now > before ? "up" : "down"} ${text} on ${prevLabel}`;
}

export function monthVerdict(d: MonthData): MonthVerdict {
  const tips: string[] = [];
  if (d.overdue > 0) tips.push(`${d.overdue} ${d.overdue === 1 ? "invoice is" : "invoices are"} overdue (${formatRand(d.overdueCents)}). Send the reminder today, it is the quickest money you have.`);
  const rate = winRate(d);
  if (rate !== null && rate < 35) tips.push(`Only ${d.accepted} of ${d.accepted + d.declined} decided quotes said yes. Follow up two days after you send, and say in one line why your price is fair.`);
  if (d.sentPrev >= 3 && d.sent < d.sentPrev) tips.push(`You sent fewer quotes than last month (${d.sent} against ${d.sentPrev}). More quotes out is the fastest way to more jobs.`);
  if (d.waiting > 0 && tips.length < 3) tips.push(`${d.waiting} ${d.waiting === 1 ? "invoice is" : "invoices are"} still waiting to be paid (${formatRand(d.waitingCents)}).`);

  if (d.collectedCents > 0 && d.collectedCents > d.collectedPrevCents)
    return { headline: `${formatRand(d.collectedCents)} collected, a better month`, detail: "More money came in than last month. Keep doing what worked: quote fast, follow up, and invoice the same day a client says yes.", tips: tips.slice(0, 3) };
  if (d.collectedCents > 0)
    return { headline: `${formatRand(d.collectedCents)} collected`, detail: "A little less than last month. The quickest fix is usually chasing what is already owed.", tips: tips.slice(0, 3) };
  if (d.sent > 0)
    return { headline: "Quotes went out, no money in yet", detail: "Quotes are the start, payment is the finish. Follow up the ones that were opened, and invoice every accepted job.", tips: tips.slice(0, 3) };
  return { headline: "A quiet month", detail: "Not much happened in Yebo this month. Send one quote this week, even a small one, to get things moving.", tips: tips.slice(0, 3) };
}

type Row = Record<string, unknown>;
// Week 1 = days 1-7, week 2 = 8-14, week 3 = 15-21, week 4 = 22 to the end of the month.
const weekOf = (d: Date) => Math.min(3, Math.floor((new Date(d.getTime() + SAST_HOURS * HOUR).getUTCDate() - 1) / 7));
const distinct = (rows: Row[], type: string, from: Date, to: Date) => new Set(rows.filter((r) => r.type === type && new Date(String(r.created_at)) >= from && new Date(String(r.created_at)) <= to).map((r) => String(r.document_id))).size;

export async function loadMonth(sb: SupabaseClient, businessId: string, now: Date = new Date()): Promise<{ data: MonthData; windows: MonthWindows } | null> {
  const w = monthWindows(now);
  const today = southAfricaDate(now);
  const [{ data: events, error }, { data: pays }, { data: docs }] = await Promise.all([
    sb.from("events").select("type,document_id,created_at,documents!inner(type,business_id)").eq("documents.business_id", businessId).eq("documents.type", "quote")
      .in("type", ["sent", "accepted", "declined"]).gte("created_at", w.prevStart.toISOString()).lte("created_at", now.toISOString()).limit(5000),
    sb.from("payments").select("amount_cents,paid_at,method,documents!inner(business_id)").eq("documents.business_id", businessId).neq("method", "credit")
      .gte("paid_at", w.prevStart.toISOString()).lte("paid_at", now.toISOString()).limit(5000),
    sb.from("documents").select("id,type,status,total_cents,issue_date,due_date").eq("business_id", businessId).eq("type", "invoice").limit(3000),
  ]);
  if (error) { console.error("[monthly] events:", error.message); return null; }
  const ev = (events ?? []) as Row[];
  const paid = (from: Date, to: Date) => ((pays ?? []) as Row[]).reduce((s, p) => { const t = new Date(String(p.paid_at)).getTime(); return t >= from.getTime() && t <= to.getTime() ? s + Number(p.amount_cents) : s; }, 0);
  const inv = (docs ?? []) as Row[];
  const monthStartDate = southAfricaDate(new Date(w.start.getTime() + 3 * HOUR));
  const issued = inv.filter((x) => x.status !== "draft" && String(x.issue_date) >= monthStartDate && String(x.issue_date) <= today);
  const open = inv.filter((x) => ["sent", "viewed", "partially_paid"].includes(String(x.status)));
  const overdue = open.filter((x) => x.due_date && String(x.due_date) < today);
  const [yy, mm] = w.key.split("-").map(Number);
  const daysIn = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const mon = new Intl.DateTimeFormat("en-ZA", { timeZone: "UTC", month: "short" }).format(new Date(Date.UTC(yy, mm - 1, 15)));
  const todayDay = Number(today.slice(8, 10));
  const weeks: WeekRow[] = [0, 1, 2, 3].map((i) => {
    const from = i * 7 + 1, to = i === 3 ? daysIn : from + 6;
    const inWeek = (iso: unknown) => { const t = new Date(String(iso)); return t >= w.start && t <= now && weekOf(t) === i; };
    const count = (type: string) => new Set(ev.filter((r) => r.type === type && inWeek(r.created_at)).map((r) => String(r.document_id))).size;
    const collected = ((pays ?? []) as Row[]).reduce((s, p) => (inWeek(p.paid_at) ? s + Number(p.amount_cents) : s), 0);
    return { label: `Week ${i + 1}`, range: `${from}-${to} ${mon}`, started: todayDay >= from, sent: count("sent"), accepted: count("accepted"), collectedCents: collected };
  });
  const sum = (rows: Row[]) => rows.reduce((s, x) => s + Number(x.total_cents), 0);
  return {
    windows: w,
    data: {
      weeks,
      sent: distinct(ev, "sent", w.start, now), sentPrev: distinct(ev, "sent", w.prevStart, w.start),
      accepted: distinct(ev, "accepted", w.start, now), acceptedPrev: distinct(ev, "accepted", w.prevStart, w.start),
      declined: distinct(ev, "declined", w.start, now),
      collectedCents: paid(w.start, now), collectedPrevCents: paid(w.prevStart, w.start),
      invoiced: issued.length, invoicedCents: sum(issued),
      waiting: open.length, waitingCents: sum(open),
      overdue: overdue.length, overdueCents: sum(overdue),
    },
  };
}
