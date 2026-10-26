// Turns the list of quotes into "how many did I win, and why did I lose the others". Pure functions, easy to test.

export type QuoteRow = {
  status: string;
  total_cents: number | string;
  issue_date: string; // YYYY-MM-DD
  expiry_date: string | null;
  decline_reason: string | null;
};

export const LOSS_REASONS: Record<string, string> = {
  price: "The price was too high",
  other: "They went with someone else",
  changes: "They needed changes",
  later: "No longer needed",
  none: "No reason given",
};

export type Summary = {
  sent: number;
  won: number;
  lost: number;
  noReply: number;
  open: number;
  wonCents: number;
  lostCents: number;
  noReplyCents: number;
  openCents: number;
  winRate: number | null; // won out of everything that has an outcome, as a whole percent
  reasons: { key: string; label: string; count: number; cents: number }[];
};

export function summarise(rows: QuoteRow[], today: string): Summary {
  const s: Summary = { sent: 0, won: 0, lost: 0, noReply: 0, open: 0, wonCents: 0, lostCents: 0, noReplyCents: 0, openCents: 0, winRate: null, reasons: [] };
  const reasons = new Map<string, { count: number; cents: number }>();
  for (const row of rows) {
    if (row.status === "draft") continue;
    const cents = Number(row.total_cents) || 0;
    s.sent++;
    if (row.status === "accepted") { s.won++; s.wonCents += cents; continue; }
    if (row.status === "declined") {
      s.lost++; s.lostCents += cents;
      const key = row.decline_reason && LOSS_REASONS[row.decline_reason] ? row.decline_reason : "none";
      const entry = reasons.get(key) ?? { count: 0, cents: 0 };
      reasons.set(key, { count: entry.count + 1, cents: entry.cents + cents });
      continue;
    }
    const expired = row.status === "expired" || Boolean(row.expiry_date && row.expiry_date < today);
    if (expired) { s.noReply++; s.noReplyCents += cents; } else { s.open++; s.openCents += cents; }
  }
  const decided = s.won + s.lost + s.noReply;
  s.winRate = decided > 0 ? Math.round((s.won / decided) * 100) : null;
  s.reasons = [...reasons.entries()]
    .map(([key, v]) => ({ key, label: LOSS_REASONS[key], count: v.count, cents: v.cents }))
    .sort((a, b) => b.count - a.count || b.cents - a.cents);
  return s;
}

// One plain-words takeaway, or null when there is not enough to say anything honest yet.
export function insight(s: Summary): string | null {
  if (s.won + s.lost + s.noReply < 5) return null;
  const top = s.reasons.find((reason) => reason.key !== "none");
  if (top && s.lost >= 3 && top.count / s.lost >= 0.4) {
    if (top.key === "price") return `${top.count} of your ${s.lost} lost quotes said the price was too high. Try Good / Better / Best options so there is always a cheaper way to say yes.`;
    if (top.key === "changes") return `${top.count} of your ${s.lost} lost quotes needed changes. Check the "Not included" and "Assumptions" sections so the quote matches what they expected.`;
    if (top.key === "other") return `${top.count} of your ${s.lost} lost quotes went to someone else. Sending quicker, and following up after two days, usually helps most.`;
  }
  if (s.noReply > s.won) return `${s.noReply} quotes expired with no answer. A friendly follow-up a few days after sending is the cheapest way to win some of those back.`;
  return null;
}
