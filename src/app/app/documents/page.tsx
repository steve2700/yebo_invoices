import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";

export default async function Documents() {
  const sb = await createClient();
  const { data: docs } = await sb.from("documents")
    .select("id,type,number,status,total_cents,due_date,clients(name)").order("created_at", { ascending: false });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Quotes and invoices</h1>
        <Link href="/app/quotes/new" className="rounded-xl bg-yebo px-4 py-2 font-bold text-white">+ New quote</Link>
      </div>
      <ul className="mt-5 space-y-2">
        {(docs ?? []).map((d) => {
          const client = Array.isArray(d.clients) ? d.clients[0] : d.clients;
          const overdue = d.type === "invoice" && ["sent", "viewed", "partially_paid"].includes(d.status) && d.due_date && d.due_date < today;
          return (
            <li key={d.id}>
              <Link href={`/app/documents/${d.id}`} className="flex items-center justify-between rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-4">
                <div><div className="font-bold">{d.number}</div><div className="text-sm text-neutral-500">{client?.name}</div></div>
                <div className="text-right"><div className="font-bold">{formatRand(d.total_cents)}</div>
                  <span className={`text-xs ${overdue ? "text-orange-700" : "text-neutral-500"}`}>{overdue ? "overdue" : d.status}</span></div>
              </Link>
            </li>
          );
        })}
        {!docs?.length && <p className="text-neutral-500">Nothing here yet. Create your first quote.</p>}
      </ul>
      <Link href="/app" className="mt-6 inline-block text-sm text-neutral-500">Back to dashboard</Link>
    </main>
  );
}
