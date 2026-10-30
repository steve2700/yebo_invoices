import Link from "next/link";
import { change, type Move } from "@/lib/insights";

export type ScoreboardData = {
  monthName: string;
  quotesSent: number;
  quotesSentLast: number;
  accepted: number;
  acceptedLast: number;
  winRate: number | null; // last 90 days
  sent90: number;
  move: Move;
  thought: string;
};

const toneClass = { up: "text-yebo", down: "text-orange", flat: "text-ink/55", new: "text-ink/55" } as const;
const arrow = { up: "↑ ", down: "↓ ", flat: "", new: "" } as const;

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "up" | "down" | "flat" | "new" }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/50">{label}</p>
      <p className="mt-2 text-3xl font-extrabold leading-none tracking-[-0.04em] tabular-nums text-ink">{value}</p>
      <p className={`mt-2 text-xs font-semibold leading-5 ${toneClass[tone]}`}>{arrow[tone]}{sub}</p>
    </div>
  );
}

export default function Scoreboard({ data }: { data: ScoreboardData }) {
  const sent = change(data.quotesSent, data.quotesSentLast);
  const won = change(data.accepted, data.acceptedLast);
  return (
    <section aria-labelledby="score-heading" className="fade-up">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-yebo">Measure it to improve it</p>
          <h2 id="score-heading" className="mt-1.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Your numbers</h2>
        </div>
        <Link href="/app/reports/wins" className="rounded-full px-3 py-2 text-xs font-bold text-yebo hover:bg-yebo-chalk">See what you win and lose <span aria-hidden="true">→</span></Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Tile label={`Quotes sent in ${data.monthName}`} value={String(data.quotesSent)} sub={sent.text} tone={sent.tone} />
        <Tile label="Quotes accepted" value={String(data.accepted)} sub={won.text} tone={won.tone} />
        <Tile
          label="Win rate, last 90 days"
          value={data.winRate === null ? "-" : data.winRate + "%"}
          sub={data.winRate === null ? "Send 3 quotes and this starts counting" : `Of ${data.sent90} quotes sent, ${data.winRate}% were accepted`}
          tone="flat"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-yebo-deep p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-yebo-sun">Do this next</p>
          <p className="mt-1.5 text-sm font-semibold leading-6 sm:text-base">{data.move.text}</p>
        </div>
        <Link href={data.move.href} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-lime px-5 text-sm font-extrabold text-ink hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          {data.move.label} <span className="ml-1" aria-hidden="true">→</span>
        </Link>
      </div>

      <p className="mt-4 text-center text-sm italic leading-6 text-ink/55">&ldquo;{data.thought}&rdquo;</p>
    </section>
  );
}
