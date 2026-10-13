import { formatRand } from "@/lib/money";
import SubmitButton from "@/components/SubmitButton";
import { saveMonthlyTarget } from "./targets/actions";

export type MonthlyStats = {
  monthName: string;
  daysLeft: number;
  collectedCents: number;
  revenueTargetCents: number;
  quotesSent: number;
  quotesTarget: number;
  quotesAccepted: number;
  carriedOver: boolean; // true when this month has no target of its own yet and last month's is being used
};

const percent = (value: number, target: number) => (target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0);

function ProgressRow({ label, valueText, targetText, pct, done, delay }: { label: string; valueText: string; targetText: string; pct: number; done: boolean; delay: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="text-sm tabular-nums text-ink/60"><b className="text-ink">{valueText}</b> of {targetText}</p>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div
          style={{ width: `${Math.max(pct, 3)}%`, "--d": `${delay}s` } as React.CSSProperties}
          className={`bar-grow h-full rounded-full ${done ? "bg-lime" : "bg-yebo"}`}
        />
      </div>
      <p className="mt-1.5 text-xs font-semibold text-ink/55">{done ? "Target reached" : `${pct}% there`}</p>
    </div>
  );
}

export default function MonthlyTargets({ stats }: { stats: MonthlyStats }) {
  const hasRevenueTarget = stats.revenueTargetCents > 0;
  const hasQuoteTarget = stats.quotesTarget > 0;
  const hasAnyTarget = hasRevenueTarget || hasQuoteTarget;

  const revenueDone = hasRevenueTarget && stats.collectedCents >= stats.revenueTargetCents;
  const quotesDone = hasQuoteTarget && stats.quotesSent >= stats.quotesTarget;
  const remainingCents = Math.max(stats.revenueTargetCents - stats.collectedCents, 0);
  const quotesToGo = Math.max(stats.quotesTarget - stats.quotesSent, 0);

  // One short, encouraging line that says what to do next.
  let message = "";
  if (hasRevenueTarget && revenueDone && (!hasQuoteTarget || quotesDone)) message = `You have hit your ${stats.monthName} targets. Brilliant work. Why not raise the bar for next month?`;
  else if (hasRevenueTarget && !revenueDone && stats.daysLeft > 0) message = `${formatRand(remainingCents)} to go. That is about ${formatRand(Math.ceil(remainingCents / stats.daysLeft / 100) * 100)} a day for the next ${stats.daysLeft} day${stats.daysLeft === 1 ? "" : "s"}. Sending an invoice or a reminder today moves you closer.`;
  else if (hasRevenueTarget && !revenueDone) message = `Last day of the month: ${formatRand(remainingCents)} to go. A quick reminder to anyone who owes you could close the gap.`;
  else if (hasQuoteTarget && !quotesDone) message = `${quotesToGo} more quote${quotesToGo === 1 ? "" : "s"} to reach your goal. Every quote you send is a chance to win a job.`;
  else if (stats.quotesSent === 0 && stats.collectedCents === 0) message = "A fresh month. Your first quote of the month is the hardest one, so send it today.";

  return (
    <section aria-labelledby="targets-heading" className="fade-up rounded-3xl border border-ink/10 bg-white p-5 shadow-[0_12px_40px_-32px_rgba(17,45,35,.45)] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-yebo">Your month</p>
          <h2 id="targets-heading" className="mt-1.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{stats.monthName} so far</h2>
        </div>
        <p className="rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink/60">{stats.daysLeft === 0 ? "Last day of the month" : `${stats.daysLeft} day${stats.daysLeft === 1 ? "" : "s"} left`}</p>
      </div>

      {hasAnyTarget ? (
        <div className="mt-6 flex flex-col gap-6">
          {hasRevenueTarget && (
            <ProgressRow label="Money collected" valueText={formatRand(stats.collectedCents)} targetText={formatRand(stats.revenueTargetCents)} pct={percent(stats.collectedCents, stats.revenueTargetCents)} done={revenueDone} delay={0.1} />
          )}
          {hasQuoteTarget && (
            <ProgressRow label="Quotes sent" valueText={String(stats.quotesSent)} targetText={String(stats.quotesTarget)} pct={percent(stats.quotesSent, stats.quotesTarget)} done={quotesDone} delay={0.25} />
          )}
        </div>
      ) : (
        <p className="mt-4 max-w-xl text-sm leading-6 text-ink/65">A target turns &quot;busy&quot; into progress you can see. Pick a number for the money you want to collect, or the quotes you want to send, and Yebo tracks it for you all month.</p>
      )}

      {message && <p className="mt-5 rounded-2xl bg-lime/20 px-4 py-3 text-sm font-semibold leading-6 text-ink">{message}</p>}

      <dl className="mt-5 grid grid-cols-3 gap-2 text-center sm:gap-3">
        <div className="rounded-2xl bg-paper px-2 py-3"><dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/45">Collected</dt><dd className="mt-1 truncate text-sm font-extrabold tabular-nums text-ink sm:text-base">{formatRand(stats.collectedCents)}</dd></div>
        <div className="rounded-2xl bg-paper px-2 py-3"><dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/45">Quotes sent</dt><dd className="mt-1 text-sm font-extrabold tabular-nums text-ink sm:text-base">{stats.quotesSent}</dd></div>
        <div className="rounded-2xl bg-paper px-2 py-3"><dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/45">Quotes won</dt><dd className="mt-1 text-sm font-extrabold tabular-nums text-ink sm:text-base">{stats.quotesAccepted}</dd></div>
      </dl>

      <details className="group mt-5" open={!hasAnyTarget}>
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-xl border-2 border-ink/15 px-4 text-sm font-bold text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo">
          {hasAnyTarget ? "Change this month's targets" : "Set this month's targets"}
        </summary>
        <form action={saveMonthlyTarget} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink">Money to collect (rand)
            <input name="revenue" inputMode="numeric" placeholder="e.g. 30000" defaultValue={hasRevenueTarget ? stats.revenueTargetCents / 100 : ""} className="mt-2 w-full rounded-xl border border-ink/10 bg-paper/60 px-3.5 py-3 text-sm outline-none transition focus:border-orange focus:bg-white" />
          </label>
          <label className="text-sm font-semibold text-ink">Quotes to send
            <input name="quotes" inputMode="numeric" placeholder="e.g. 20" defaultValue={hasQuoteTarget ? stats.quotesTarget : ""} className="mt-2 w-full rounded-xl border border-ink/10 bg-paper/60 px-3.5 py-3 text-sm outline-none transition focus:border-orange focus:bg-white" />
          </label>
          <div className="sm:col-span-2">
            <SubmitButton pendingLabel="Saving your targets…" className="min-h-11 rounded-xl bg-yebo px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep">Save targets</SubmitButton>
            <p className="mt-2 text-xs text-ink/50">
              {stats.carriedOver ? "These are last month's targets, carried over. Change them any time. " : ""}
              Leave a box empty if you do not want a target for it. Your targets reset each month and start from last month's numbers.
            </p>
          </div>
        </form>
      </details>
    </section>
  );
}
