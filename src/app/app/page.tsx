import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { formatDate } from "@/lib/dates";

type Doc = {
  id: string; type: string; number: string; status: string; total_cents: number; due_date: string | null;
  clients: { name: string } | { name: string }[] | null;
};
const OPEN = ["sent", "viewed", "partially_paid"];
const chip = { orange: "bg-orange text-white", lime: "bg-lime text-ink", ink: "bg-ink/5 text-ink/60" } as const;

export default async function Dashboard() {
  const sb = await createClient();
  const { data: business } = await sb.from("businesses").select("id,name").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb.from("documents")
    .select("id,type,number,status,total_cents,due_date,clients(name)")
    .in("status", ["sent", "viewed", "accepted", "partially_paid"]).order("created_at", { ascending: false }).limit(60);
  const docs = (data ?? []) as unknown as Doc[];
  const { data: conv } = await sb.from("documents").select("source_quote_id").not("source_quote_id", "is", null);
  const converted = new Set((conv ?? []).map((c) => c.source_quote_id));

  const open = docs.filter((d) => d.type === "invoice" && OPEN.includes(d.status));
  const late = open.filter((d) => d.due_date && d.due_date < today);
  const sum = (l: Doc[]) => l.reduce((a, d) => a + d.total_cents, 0);

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const { data: pays } = await sb.from("payments").select("amount_cents").gte("paid_at", monthStart.toISOString());
  const paid = (pays ?? []).reduce((a, p) => a + p.amount_cents, 0);

  const name = (d: Doc) => (Array.isArray(d.clients) ? d.clients[0] : d.clients)?.name ?? "Client";
  type Item = { d: Doc; p: number; tag: string; tone: keyof typeof chip };
  const rows: Item[] = docs.flatMap((d): Item[] => {
    if (d.type === "invoice" && OPEN.includes(d.status)) {
      const od = !!d.due_date && d.due_date < today;
      return [{ d, p: od ? 0 : 2, tag: od ? "Overdue" : `Due ${formatDate(d.due_date)}`, tone: od ? "orange" : "ink"}];
    }
    if (d.type === "quote" && d.status === "accepted" && !converted.has(d.id)) return [{ d, p: 1, tag: "Accepted: invoice it", tone: "lime"}];
    if (d.type === "quote" && (d.status === "sent" || d.status === "viewed"))
      return [{ d, p: 3, tag: d.status === "viewed" ? "Viewed, no reply" : "Waiting for reply", tone: "ink"}];
    return [];
  }).sort((a, b) => a.p - b.p).slice(0, 8);

  return (
    <main className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 overflow-y-auto px-4 pb-3 pt-3 sm:gap-4 sm:px-6 sm:pb-6 sm:pt-5 lg:grid lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-6 lg:overflow-hidden">
      <section className="flex shrink-0 flex-col gap-3 lg:justify-center lg:gap-4">
        <p className="text-sm text-ink/60">Sawubona, <b className="text-ink">{business.name}</b></p>
        <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-paper shadow-[0_20px_45px_-24px_rgba(17,45,35,.7)] sm:p-6">
          <div className="absolute -right-10 -top-12 size-36 rounded-full border-[20px] border-lime/15" />
          <p className="relative text-xs font-bold uppercase tracking-[.14em] text-lime">Collected this month</p>
          <p className="relative mt-1 text-4xl font-black tracking-tight sm:text-5xl">{formatRand(paid)}</p>
          <div className="relative mt-4 grid grid-cols-2 divide-x divide-paper/15 border-t border-paper/15 pt-3">
            <div><span className="text-xs text-paper/60">Outstanding</span><b className="block text-lg">{formatRand(sum(open))}</b><span className="text-xs text-paper/50">{open.length} open invoice{open.length === 1 ? "" : "s"}</span></div>
            <div className="pl-4"><span className="text-xs text-paper/60">Overdue</span><b className={`block text-lg ${late.length ? "text-orange" : ""}`}>{formatRand(sum(late))}</b><span className="text-xs text-paper/50">{late.length ? `${late.length} need chasing` : "All caught up"}</span></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/app/quotes/new" className="flex min-h-12 items-center justify-center rounded-2xl bg-lime px-4 font-black text-ink active:scale-[.98]">+ New quote</Link>
          <Link href="/app/quotes/new?type=invoice" className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-ink/15 bg-white px-4 font-bold text-ink active:scale-[.98]">+ New invoice</Link>
        </div>
      </section>

      <section className="flex min-h-48 flex-1 flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ink/10 sm:p-5 lg:min-h-0">
        <div className="flex items-baseline justify-between"><h1 className="text-lg font-black tracking-tight">Needs your attention</h1><span className="text-xs text-ink/45">{rows.length ? `${rows.length} item${rows.length === 1 ? "" : "s"}` : ""}</span></div>
        {rows.length ? (
          <ul className="mt-3 flex-1 space-y-2 overflow-y-auto">
            {rows.map(({ d, tag, tone }) => (
              <li key={d.id}>
                <Link href={`/app/documents/${d.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 p-3 active:bg-ink/5">
                  <span className="min-w-0"><b className="block truncate text-sm">{d.number}</b><span className="block truncate text-xs text-ink/55">{name(d)}</span></span>
                  <span className="shrink-0 text-right"><b className="block text-sm">{formatRand(d.total_cents)}</b><span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${chip[tone]}`}>{tag}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-lg font-black">All caught up.</p>
            <p className="max-w-[16rem] text-sm text-ink/55">Nothing is waiting on you. Send a quote to get the next job moving.</p>
            <Link href="/app/quotes/new" className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-lime">Create a quote</Link>
          </div>
        )}
      </section>
    </main>
  );
}
