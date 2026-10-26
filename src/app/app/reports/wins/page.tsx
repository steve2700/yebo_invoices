import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { southAfricaDate } from "@/lib/time";
import { insight, summarise, type QuoteRow } from "@/lib/winloss";

const RANGES: Record<string, { label: string; days: number | null }> = {
  "30": { label: "30 days", days: 30 },
  "90": { label: "90 days", days: 90 },
  "365": { label: "12 months", days: 365 },
  all: { label: "All time", days: null },
};

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/50">{label}</p>
      <p className={`mt-2 truncate text-2xl font-extrabold tabular-nums tracking-tight ${tone === "good" ? "text-yebo" : tone === "bad" ? "text-orange" : "text-ink"}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-ink/55">{note}</p>}
    </div>
  );
}

export default async function WinLoss({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rangeParam } = await searchParams;
  const range = rangeParam && RANGES[rangeParam] ? rangeParam : "90";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase.from("businesses").select("id").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const today = southAfricaDate();
  let query = supabase.from("documents").select("status,total_cents,issue_date,expiry_date,decline_reason").eq("type", "quote").neq("status", "draft").limit(5000);
  const days = RANGES[range].days;
  if (days) {
    const since = new Date(`${today}T00:00:00+02:00`);
    since.setDate(since.getDate() - days);
    query = query.gte("issue_date", southAfricaDate(since));
  }
  const { data, error } = await query;
  // If migration 0023 has not been run, decline_reason does not exist yet: fall back so the page still works.
  let rows = (data ?? []) as QuoteRow[];
  if (error) {
    let fallback = supabase.from("documents").select("status,total_cents,issue_date,expiry_date").eq("type", "quote").neq("status", "draft").limit(5000);
    if (days) { const since = new Date(`${today}T00:00:00+02:00`); since.setDate(since.getDate() - days); fallback = fallback.gte("issue_date", southAfricaDate(since)); }
    const { data: plain } = await fallback;
    rows = ((plain ?? []) as Omit<QuoteRow, "decline_reason">[]).map((row) => ({ ...row, decline_reason: null }));
  }
  const s = summarise(rows, today);
  const takeaway = insight(s);
  const maxReason = Math.max(1, ...s.reasons.map((reason) => reason.count));
  const tab = (active: boolean) => `inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold ${active ? "bg-ink text-lime" : "bg-white text-ink/60 ring-1 ring-ink/10"}`;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Reports</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Quote results</h1>
      <p className="mt-2 text-sm text-ink/60">How many quotes turn into jobs, and why the others do not.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Period">
        {Object.entries(RANGES).map(([key, r]) => <Link key={key} href={`/app/reports/wins?range=${key}`} className={tab(range === key)} aria-current={range === key ? "page" : undefined}>{r.label}</Link>)}
      </div>

      {s.sent === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-ink/15 bg-white/70 p-8 text-center">
          <p className="font-extrabold text-ink">No quotes sent in this period yet</p>
          <p className="mt-2 text-sm text-ink/60">Send a few quotes and this page will show your win rate and where you lose work.</p>
          <Link href="/app/quotes/new" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-orange px-5 text-sm font-extrabold text-white">New quote</Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Quotes sent" value={String(s.sent)} />
            <Stat label="Won" value={String(s.won)} note={formatRand(s.wonCents)} tone="good" />
            <Stat label="Lost" value={String(s.lost)} note={formatRand(s.lostCents)} tone={s.lost ? "bad" : undefined} />
            <Stat label="Win rate" value={s.winRate === null ? "-" : `${s.winRate}%`} note={s.winRate === null ? "Nothing decided yet" : "of quotes with an outcome"} />
          </div>

          {takeaway && <p role="note" className="mt-5 rounded-2xl bg-lime/30 p-4 text-sm font-semibold leading-6 text-ink">{takeaway}</p>}

          <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
            <h2 className="text-lg font-extrabold text-ink">Waiting on an answer</h2>
            <ul className="mt-3 divide-y divide-ink/10 text-sm">
              <li className="flex items-center justify-between py-2.5"><span>Still open (not expired yet)</span><b>{s.open} · {formatRand(s.openCents)}</b></li>
              <li className="flex items-center justify-between py-2.5"><span>Expired with no answer</span><b>{s.noReply} · {formatRand(s.noReplyCents)}</b></li>
            </ul>
            {(s.open > 0 || s.noReply > 0) && <p className="mt-2 text-xs text-ink/55">A short follow-up message on these is the quickest way to win more work.</p>}
          </section>

          <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
            <h2 className="text-lg font-extrabold text-ink">Why quotes were declined</h2>
            {s.lost === 0 ? <p className="mt-3 text-sm text-ink/60">No declined quotes in this period.</p> : (
              <ul className="mt-4 space-y-3">
                {s.reasons.map((reason) => (
                  <li key={reason.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-semibold">{reason.label}</span><span className="shrink-0 text-ink/60">{reason.count} · {formatRand(reason.cents)}</span></div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/8"><div className="h-full rounded-full bg-orange" style={{ width: `${Math.round((reason.count / maxReason) * 100)}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-ink/50">Reasons come from the choice your client makes when they decline on the quote page. Older declined quotes show as "No reason given".</p>
          </section>
        </>
      )}
      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-ink/50">
        <Link href="/app" className="hover:text-orange">← Dashboard</Link>
        <Link href="/app/reports/vat" className="hover:text-orange">VAT sales summary</Link>
      </div>
    </main>
  );
}
