import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";

function Metric({ label, value, note, tone = "default" }: { label: string; value: number; note: string; tone?: "default" | "warning" }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[1.35rem] border border-ink/10 bg-white p-4 shadow-[0_12px_30px_-24px_rgba(17,45,35,.45)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[.14em] text-ink/50">{label}</span>
        <span className={`size-2 rounded-full ${tone === "warning" ? "bg-orange" : "bg-lime"}`} />
      </div>
      <strong className={`text-[clamp(1.45rem,6vw,2rem)] leading-none tracking-[-.06em] ${tone === "warning" ? "text-orange" : "text-ink"}`}>{formatRand(value)}</strong>
      <span className="text-xs text-ink/50">{note}</span>
    </div>
  );
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("id,name").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const today = new Date().toISOString().slice(0, 10);
  const { data: open } = await supabase.from("documents").select("total_cents,due_date,status").eq("type", "invoice").in("status", ["sent", "viewed", "partially_paid"]);
  const unpaid = (open ?? []).reduce((total, document) => total + document.total_cents, 0);
  const overdue = (open ?? []).filter((document) => document.due_date && document.due_date < today).reduce((total, document) => total + document.total_cents, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: payments } = await supabase.from("payments").select("amount_cents").gte("paid_at", monthStart.toISOString());
  const paid = (payments ?? []).reduce((total, payment) => total + payment.amount_cents, 0);
  const invoiceCount = open?.length ?? 0;
  const overdueCount = open?.filter((document) => document.due_date && document.due_date < today).length ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-ink px-5 py-6 text-paper shadow-[0_20px_55px_-28px_rgba(17,45,35,.65)] sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-16 size-44 rounded-full border-[24px] border-lime/20" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-[.2em] text-lime">{business.name}</span>
            <h1 className="max-w-xl text-3xl font-black leading-[.95] tracking-[-.07em] sm:text-5xl">Keep your cash flow moving.</h1>
            <p className="max-w-md text-sm leading-6 text-paper/65">Your financial cockpit is ready. See what needs attention and send your next quote in seconds.</p>
          </div>
          <Link href="/app/quotes/new" className="inline-flex min-h-12 items-center justify-center rounded-full bg-lime px-5 text-sm font-black text-ink transition-transform hover:-translate-y-0.5">Create a quote <span className="ml-2 text-lg">↗</span></Link>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Metric label="Collected" value={paid} note="This month" />
        <Metric label="Outstanding" value={unpaid} note={`${invoiceCount} open invoice${invoiceCount === 1 ? "" : "s"}`} />
        <Metric label="Overdue" value={overdue} note={overdueCount ? `${overdueCount} need attention` : "You are all caught up"} tone={overdue ? "warning" : "default"} />
        <div className="col-span-2 flex flex-col justify-between gap-4 rounded-[1.35rem] border border-ink/10 bg-lime p-4 shadow-[0_12px_30px_-24px_rgba(17,45,35,.45)] sm:col-span-1 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-[.14em] text-ink/60">Quick start</span>
          <div className="flex items-end justify-between gap-3"><strong className="text-xl leading-none tracking-[-.05em]">Send an invoice</strong><Link aria-label="Send an invoice" href="/app/documents" className="flex size-9 items-center justify-center rounded-full bg-ink text-lg text-lime transition-transform hover:scale-105">→</Link></div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[1.75rem] border border-ink/10 bg-white p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-ink/45">Your workflow</p><h2 className="mt-2 text-2xl font-black tracking-[-.06em]">Make money, less admin.</h2></div><span className="hidden rounded-full bg-lime/40 px-3 py-1 text-xs font-bold text-ink sm:inline-flex">Simple by design</span></div>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/app/quotes/new" className="group flex items-center gap-4 rounded-2xl border border-ink/10 p-4 transition-colors hover:border-ink/30"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-lg text-lime">01</span><span className="flex min-w-0 flex-1 flex-col gap-1"><strong className="text-sm">Draft a quote</strong><span className="truncate text-xs text-ink/50">Win the work before you do the work.</span></span><span className="text-xl text-ink/30 transition-transform group-hover:translate-x-1">→</span></Link>
            <Link href="/app/documents" className="group flex items-center gap-4 rounded-2xl border border-ink/10 p-4 transition-colors hover:border-ink/30"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime text-sm font-black text-ink">02</span><span className="flex min-w-0 flex-1 flex-col gap-1"><strong className="text-sm">Track every document</strong><span className="truncate text-xs text-ink/50">Quotes, invoices and payments in one place.</span></span><span className="text-xl text-ink/30 transition-transform group-hover:translate-x-1">→</span></Link>
          </div>
        </div>
        <aside className="relative flex min-h-[18rem] flex-col justify-between gap-6 overflow-hidden rounded-[1.75rem] bg-orange p-5 text-ink sm:p-7"><div className="relative z-10"><p className="text-xs font-bold uppercase tracking-[.16em] text-ink/60">At a glance</p><h2 className="mt-2 max-w-[12rem] text-2xl font-black tracking-[-.06em]">Nothing hidden.</h2><p className="mt-3 max-w-xs text-sm leading-6 text-ink/75">Yebo keeps the important number close and the busywork out of your way.</p></div><Image src="/yebo-dashboard-art.png" alt="Abstract layered invoice artwork" width={240} height={300} className="pointer-events-none absolute -bottom-16 -right-10 w-44 rotate-6 opacity-80 mix-blend-multiply sm:w-52" /><Link href="/app/settings" className="relative z-10 w-fit rounded-full border-2 border-ink px-4 py-2 text-sm font-bold transition-colors hover:bg-ink hover:text-orange">Tune your setup →</Link></aside>
      </section>
    </main>
  );
}
 
