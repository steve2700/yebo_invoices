import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("id,name").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const today = new Date().toISOString().slice(0, 10);
  const { data: open } = await supabase
    .from("documents").select("total_cents,due_date")
    .eq("type", "invoice").in("status", ["sent", "viewed", "partially_paid"]);
  // v1 simplification: partial payments are not yet subtracted from "unpaid"
  const unpaid = (open ?? []).reduce((a, d) => a + d.total_cents, 0);
  const overdue = (open ?? []).filter((d) => d.due_date && d.due_date < today).reduce((a, d) => a + d.total_cents, 0);

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const { data: pays } = await supabase.from("payments").select("amount_cents").gte("paid_at", monthStart.toISOString());
  const paid = (pays ?? []).reduce((a, p) => a + p.amount_cents, 0);

  const Stat = ({ label, value, red }: { label: string; value: number; red?: boolean }) => (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-2xl font-extrabold ${red ? "text-orange-700" : ""}`}>{formatRand(value)}</div>
    </div>
  );

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-extrabold">Sawubona, {business.name}</h1>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Paid this month" value={paid} />
        <Stat label="Unpaid" value={unpaid} />
        <Stat label="Overdue" value={overdue} red />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app/quotes/new" className="rounded-xl bg-yebo px-5 py-3 font-bold text-white">+ New quote</Link>
        <Link href="/app/documents" className="rounded-xl border-2 border-yebo px-5 py-3 font-bold text-yebo">Quotes and invoices</Link>
        <Link href="/app/settings" className="rounded-xl border-2 border-neutral-300 px-5 py-3 font-bold">Settings</Link>
      </div>
    </main>
  );
}
