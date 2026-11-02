// What's new. Add the newest item at the top of NEWS and it shows at the top of every owner's dashboard until they tap "Got it"
// (or 30 days pass). Keep each one short and warm: what changed, why it helps them, one button.
export type NewsItem = { id: string; date: string; title: string; text: string; href: string; cta: string };

export const NEWS: NewsItem[] = [
  {
    id: "on-the-way-2026-11",
    date: "2026-11-02",
    title: "New: tell your client you are on the way",
    text: "Open a quote or invoice and tap one button. WhatsApp opens with your arrival time written, and your client's page shows you are coming.",
    href: "/app/documents",
    cta: "Open a job",
  },
  {
    id: "dashboard-2026-11",
    date: "2026-11-02",
    title: "Your dashboard now leads with what matters",
    text: "Good news and the one thing to do next now sit at the top. We also compare your month fairly, to the same point last month.",
    href: "/app/quotes/new",
    cta: "Quote a job",
  },
  {
    id: "instant-pay-2026-10",
    date: "2026-10-30",
    title: "Get paid in minutes, even on weekends",
    text: "Add your PayShap number once and it shows on your quotes, invoices and statements, so clients can pay instantly.",
    href: "/app/settings#banking",
    cta: "Add my number",
  },
  {
    id: "steps-2026-10",
    date: "2026-10-27",
    title: "Quotes now take three easy steps",
    text: "Who it is for, what the job is, then a quick look before you send. Your work saves itself as you go.",
    href: "/app/quotes/new",
    cta: "Try it",
  },
];

// Items still worth showing today (not in the future, not older than 30 days), newest first. today is "YYYY-MM-DD".
export function currentNews(today: string, max = 2): NewsItem[] {
  const now = Date.parse(today);
  return NEWS.filter((n) => {
    const age = (now - Date.parse(n.date)) / 86400000;
    return age >= 0 && age <= 30;
  }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, max);
}
