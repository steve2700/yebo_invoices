import Link from "next/link";
import { arrow, arrowMoney, type Verdict, type WeekData } from "@/lib/weekly";
import { formatRand } from "@/lib/money";

const tone = { up: "text-yebo", down: "text-orange", flat: "text-ink/50" } as const;

function Tile({ label, value, note }: { label: string; value: string; note: { text: string; tone: "up" | "down" | "flat" } }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper/60 p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/55">{label}</p>
      <p className="mt-1.5 truncate text-2xl font-extrabold tabular-nums tracking-tight text-ink">{value}</p>
      <p className={`mt-1 text-xs font-semibold ${tone[note.tone]}`}>
        <span aria-hidden="true">{note.tone === "up" ? "↑ " : note.tone === "down" ? "↓ " : ""}</span>{note.text}
      </p>
    </div>
  );
}

// The look of "Your week". No data loading in here, so it is easy to preview and to reuse.
export default function WeeklyCardView({ week, verdict, label, emailOn, toggle }: { week: WeekData; verdict: Verdict; label: string; emailOn: boolean | null; toggle?: (fd: FormData) => Promise<void> }) {
  return (
    <section aria-labelledby="week-heading" className="mb-6 rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-orange">Your week · {label}</p>
      <h2 id="week-heading" className="mt-1.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Here is how this week went</h2>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Quotes sent" value={String(week.sent)} note={arrow(week.sent, week.sentPrev)} />
        <Tile label="Opened" value={String(week.opened)} note={arrow(week.opened, week.openedPrev)} />
        <Tile label="Accepted" value={String(week.accepted)} note={arrow(week.accepted, week.acceptedPrev)} />
        <Tile label="Collected" value={formatRand(week.collectedCents)} note={arrowMoney(week.collectedCents, week.collectedPrevCents)} />
        <Tile label="Waiting to invoice" value={formatRand(week.readyCents)} note={{ text: week.readyToInvoice ? `${week.readyToInvoice} accepted quote${week.readyToInvoice === 1 ? "" : "s"}` : "Nothing waiting", tone: week.readyToInvoice ? "down" : "flat" }} />
      </div>

      <div className={`mt-4 rounded-2xl p-5 ${verdict.tone === "good" ? "bg-lime text-ink" : "bg-ink text-white"}`}>
        <p className={`text-[11px] font-extrabold uppercase tracking-[0.16em] ${verdict.tone === "good" ? "text-ink/60" : "text-lime"}`}>What we noticed</p>
        <p className="mt-1.5 text-xl font-extrabold tracking-tight">{verdict.headline}</p>
        <p className={`mt-2 text-sm leading-6 ${verdict.tone === "good" ? "text-ink/80" : "text-white/80"}`}>{verdict.detail}</p>
        {verdict.tips.length > 0 && (
          <ul className={`mt-3 space-y-1.5 text-sm leading-6 ${verdict.tone === "good" ? "text-ink/80" : "text-white/85"}`}>
            {verdict.tips.map((t) => (
              <li key={t} className="flex gap-2"><span aria-hidden="true" className="text-lime">•</span>{t}</li>
            ))}
          </ul>
        )}
        {verdict.also && <p className={`mt-3 text-sm ${verdict.tone === "good" ? "text-ink/70" : "text-white/70"}`}>Also: {verdict.also}</p>}
        <Link href={verdict.action.href} className={`mt-4 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-extrabold hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${verdict.tone === "good" ? "bg-ink text-lime" : "bg-lime text-ink"}`}>
          {verdict.action.label} <span className="ml-1" aria-hidden="true">→</span>
        </Link>
      </div>

      <p className="mt-3 text-xs text-ink/50">Compared with the same point last week, Monday to now.</p>
      {emailOn !== null && toggle && (
        <form action={toggle} className="mt-2 flex items-center justify-between gap-3 text-xs text-ink/60">
          <span>Email me this every Friday afternoon</span>
          <input type="hidden" name="on" value={emailOn ? "0" : "1"} />
          <button type="submit" aria-pressed={emailOn} className={`min-h-9 shrink-0 rounded-full px-4 text-xs font-extrabold ${emailOn ? "bg-lime text-ink" : "border-2 border-ink/15 text-ink"}`}>{emailOn ? "On" : "Off"}</button>
        </form>
      )}
    </section>
  );
}
