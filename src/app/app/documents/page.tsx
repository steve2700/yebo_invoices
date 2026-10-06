import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";

const statusStyles: Record<string, string> = { paid: "bg-lime text-ink", overdue: "bg-orange/15 text-orange", sent: "bg-ink/8 text-ink", viewed: "bg-ink/8 text-ink", draft: "bg-paper text-ink/55", partially_paid: "bg-lime/50 text-ink" };

export default async function Documents() {
  const sb = await createClient();
  const { data: docs } = await sb.from("documents").select("id,type,number,status,total_cents,due_date,clients(name)").order("created_at", { ascending: false });
  const today = new Date().toISOString().slice(0, 10);
  const invoiceCount = (docs ?? []).filter((d) => d.type === "invoice").length;
  const quoteCount = (docs ?? []).filter((d) => d.type === "quote").length;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Workspace</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Your documents</h1><p className="mt-2 text-sm text-ink/55">Quotes and invoices, all in one calm place.</p></div>
        <Link href="/app/quotes/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange/20 transition hover:-translate-y-0.5">New quote <span aria-hidden>→</span></Link>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-ink p-4 text-paper"><p className="text-xs text-paper/55">Total documents</p><p className="mt-2 text-2xl font-extrabold">{docs?.length ?? 0}</p></div><div className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="text-xs text-ink/50">Invoices</p><p className="mt-2 text-2xl font-extrabold text-ink">{invoiceCount}</p></div><div className="hidden rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:block"><p className="text-xs text-ink/50">Quotes</p><p className="mt-2 text-2xl font-extrabold text-ink">{quoteCount}</p></div></div>

      <div className="mt-8 flex items-center justify-between"><h2 className="text-lg font-extrabold text-ink">Recent activity</h2><span className="text-xs font-semibold text-ink/40">{docs?.length ? `${docs.length} records` : "Start fresh"}</span></div>
      <ul className="mt-3 flex flex-col gap-3">
        {(docs ?? []).map((d) => {
          const client = Array.isArray(d.clients) ? d.clients[0] : d.clients;
          const overdue = d.type === "invoice" && ["sent", "viewed", "partially_paid"].includes(d.status) && d.due_date && d.due_date < today;
          const status = overdue ? "overdue" : d.status;
          return <li key={d.id}><Link href={`/app/documents/${d.id}`} className="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"><div className={`grid size-11 shrink-0 place-items-center rounded-xl text-xs font-extrabold uppercase ${d.type === "invoice" ? "bg-lime text-ink" : "bg-orange/12 text-orange"}`}>{d.type === "invoice" ? "Inv" : "Qte"}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-bold text-ink">{d.number}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyles[status] ?? statusStyles.sent}`}>{status.replace("_", " ")}</span></div><div className="mt-1 truncate text-sm text-ink/50">{client?.name || "No client"}</div></div><div className="text-right"><div className="font-bold text-ink">{formatRand(d.total_cents)}</div><div className="mt-1 text-xs text-ink/40">{d.due_date ? `Due ${d.due_date}` : "No due date"}</div></div><span className="text-xl text-ink/25 transition group-hover:translate-x-1 group-hover:text-orange" aria-hidden>→</span></Link></li>;
        })}
        {!docs?.length && <li className="rounded-2xl border border-dashed border-ink/15 bg-white/60 px-6 py-12 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-lime text-lg font-extrabold text-ink">+</div><h2 className="mt-4 font-bold text-ink">Your first document is waiting</h2><p className="mx-auto mt-1 max-w-xs text-sm text-ink/50">Create a quote and turn your next conversation into momentum.</p><Link href="/app/quotes/new" className="mt-5 inline-block text-sm font-bold text-orange">Create a quote →</Link></li>}
      </ul>
      <Link href="/app" className="mt-7 inline-flex text-sm font-semibold text-ink/45 transition hover:text-orange">← Back to dashboard</Link>
    </main>
  );
}
