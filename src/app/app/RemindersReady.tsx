import Link from "next/link";
import { readyReminders } from "@/lib/reminders-count";
import { formatRand } from "@/lib/money";

// A card at the top of the dashboard when there are clients to nudge. Says what it is worth, then one tap to start.
export default async function RemindersReady() {
  const { items } = await readyReminders();
  if (!items.length) return null;
  const owed = items.filter((item) => item.kind !== "quote_followup").reduce((sum, item) => sum + item.amountCents, 0);
  const n = items.length;
  return (
    <div className="bg-paper px-4 pt-4 sm:px-6 lg:px-8">
      <Link href="/app/reminders" className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl bg-lime px-5 py-4 text-ink shadow-sm transition hover:brightness-95">
        <span>
          <span className="block text-xs font-extrabold uppercase tracking-[0.14em]">Reminders ready</span>
          <span className="mt-0.5 block text-base font-black">{n} client{n === 1 ? "" : "s"} to nudge on WhatsApp{owed > 0 ? ` · ${formatRand(owed)} owed` : ""}</span>
          <span className="block text-xs text-ink/70">Messages are written. One tap each.</span>
        </span>
        <span aria-hidden="true" className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-black text-lime">Send now →</span>
      </Link>
    </div>
  );
}
