import { southAfricaDate } from "./time";

// Who may open /admin: the emails listed in the ADMIN_EMAILS setting, separated by commas.
export function adminEmails(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, raw: string | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return Boolean(e) && adminEmails(raw).includes(e);
}

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part * 100) / whole) : 0);

// How many of these timestamps fall on each of the last `days` South African calendar days, oldest first.
export function lastDays(timestamps: string[], days: number, now: Date = new Date()): { day: string; count: number }[] {
  const out: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) out.push({ day: southAfricaDate(new Date(now.getTime() - i * 86_400_000)), count: 0 });
  const index = new Map(out.map((o, i) => [o.day, i]));
  for (const value of timestamps) {
    let key: string;
    try {
      key = southAfricaDate(value);
    } catch {
      continue;
    }
    const i = index.get(key);
    if (i !== undefined) out[i].count++;
  }
  return out;
}

// Counts each answer option, in the order the options appear in the survey. Multiple-choice answers count once per option picked.
export function tally(values: (string | string[] | undefined)[], order: string[]): { option: string; count: number }[] {
  const counts = new Map(order.map((o) => [o, 0]));
  for (const v of values) {
    if (v === undefined) continue;
    for (const option of Array.isArray(v) ? v : [v]) if (counts.has(option)) counts.set(option, (counts.get(option) ?? 0) + 1);
  }
  return order.map((option) => ({ option, count: counts.get(option) ?? 0 }));
}
