// Plain-English numbers for the dashboard. Pure logic, so it is easy to test.

export function change(current: number, previous: number, unit = ""): { text: string; tone: "up" | "down" | "flat" | "new" } {
  if (previous <= 0) return current > 0 ? { text: "First month to compare", tone: "new" } : { text: "Nothing yet", tone: "flat" };
  if (current === previous) return { text: "Same as last month", tone: "flat" };
  const pct = Math.round((Math.abs(current - previous) * 100) / previous);
  const word = current > previous ? "Up" : "Down";
  return { text: `${word} ${pct}%${unit} on last month`, tone: current > previous ? "up" : "down" };
}

// Share of quotes that were accepted. null until there are enough quotes for the number to mean anything.
export function winRate(accepted: number, sent: number): number | null {
  if (sent < 3) return null;
  return Math.max(0, Math.min(100, Math.round((accepted * 100) / sent)));
}

export type Move = { text: string; href: string; label: string };

// The one thing worth doing next, chosen from simple rules, most urgent first.
export function nextMove(input: {
  hasAnyDocs: boolean;
  quotesSentThisMonth: number;
  waiting: number;
  overdue: number;
  ready: number;
  winRate: number | null;
}): Move {
  if (!input.hasAnyDocs) return { text: "Send your first quote. It takes about two minutes.", href: "/app/quotes/new", label: "Create a quote" };
  if (input.overdue > 0) return { text: `${input.overdue} invoice${input.overdue === 1 ? " is" : "s are"} overdue. A friendly reminder today is the fastest way to get paid.`, href: "/app/reminders", label: "Send reminders" };
  if (input.ready > 0) return { text: `${input.ready} accepted quote${input.ready === 1 ? " is" : "s are"} waiting to become an invoice.`, href: "/app/documents", label: "Make the invoice" };
  if (input.waiting >= 3 && input.winRate !== null && input.winRate < 40) return { text: `${input.waiting} quotes are waiting for a reply and your win rate is ${input.winRate}%. Most quotes are lost in silence, so follow up.`, href: "/app/reminders", label: "Follow up" };
  if (input.waiting > 0) return { text: `${input.waiting} quote${input.waiting === 1 ? " is" : "s are"} waiting for a reply. A short follow-up often wins the job.`, href: "/app/reminders", label: "Follow up" };
  if (input.quotesSentThisMonth === 0) return { text: "No quotes sent this month yet. Every job starts with one.", href: "/app/quotes/new", label: "Create a quote" };
  return { text: "You are on top of things. Quote the next job while it is fresh.", href: "/app/quotes/new", label: "Create a quote" };
}

export const THOUGHTS = [
  "What you measure, you can improve.",
  "You can't fix a number you never look at.",
  "A quote nobody follows up is just a guess nobody answered.",
  "Money you've earned but not collected isn't yours yet.",
  "Look at your numbers on Monday, not at tax time.",
  "Win rate tells you more than being busy does.",
  "Simple enough to use every day beats powerful enough to ignore.",
  "Send it today. Tomorrow's quote competes with today's reply.",
  "Getting paid is part of the job, not an awkward extra.",
  "Small habits, counted every week, beat big plans nobody tracks.",
  "Every quote is a conversation. Keep it going.",
  "The client who got a clear price today rarely waits for a better one.",
  "If it is not written down and counted, it is only a feeling.",
  "Do the follow-up. It is the cheapest sale you will make.",
];

// The same line all day, a new one tomorrow. date is "YYYY-MM-DD".
export function thoughtFor(date: string): string {
  const n = Number(date.replace(/-/g, "")) || 0;
  return THOUGHTS[n % THOUGHTS.length];
}
