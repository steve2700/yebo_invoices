import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tenderAccess } from "@/lib/tender-access";
import { loadVault } from "@/lib/tender-data";
import { STATUS_LABEL, closingInfo, isCompliant, randWithCents, vaultChecks, type TenderStatus } from "@/lib/tenders";
import { formatSouthAfricaDateTime, southAfricaDate } from "@/lib/time";
import TenderUpgrade from "./TenderUpgrade";

type Row = {
  id: string; reference: string | null; title: string; client_name: string | null; category: string | null;
  closing_at: string | null; status: TenderStatus; total_cents: number;
};

const toneClass = { urgent: "bg-orange/15 text-orange", ok: "bg-lime/40 text-yebo-deep", closed: "bg-ink/10 text-ink/60", none: "bg-ink/5 text-ink/50" } as const;

function TenderCard({ t }: { t: Row }) {
  const closing = closingInfo(t.closing_at);
  const shownClosing = t.status === "submitted" || t.status === "won" || t.status === "lost" ? null : closing;
  return (
    <Link href={`/app/tenders/${t.id}`} className="block rounded-2xl border border-ink/10 bg-white p-4 shadow-sm transition hover:border-yebo/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold text-ink">{t.title}</p>
          <p className="mt-0.5 truncate text-sm text-ink/60">{[t.reference, t.client_name, t.category].filter(Boolean).join(" · ") || "No details yet"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-yebo-chalk px-2.5 py-1 text-[11px] font-bold text-yebo-deep">{STATUS_LABEL[t.status]}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {shownClosing ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${toneClass[shownClosing.tone]}`}>
            {shownClosing.label}{t.closing_at ? ` · ${formatSouthAfricaDateTime(t.closing_at)}` : ""}
          </span>
        ) : <span />}
        <span className="text-sm font-black tabular-nums text-ink">{t.total_cents > 0 ? randWithCents(t.total_cents) : "Not priced"}</span>
      </div>
    </Link>
  );
}

export default async function Tenders() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await sb.from("businesses").select("id").maybeSingle();
  if (!business) redirect("/app/onboarding");
  if (!(await tenderAccess(sb)).allowed) return <TenderUpgrade />;

  const [{ data }, vault] = await Promise.all([
    sb.from("tenders").select("id,reference,title,client_name,category,closing_at,status,total_cents").order("closing_at", { ascending: true, nullsFirst: false }).limit(300),
    loadVault(sb, business.id),
  ]);
  const rows = (data ?? []) as Row[];
  const open = rows.filter((t) => t.status === "draft" || t.status === "ready");
  const sent = rows.filter((t) => t.status === "submitted");
  const done = rows.filter((t) => t.status === "won" || t.status === "lost");
  const checks = vaultChecks(vault, southAfricaDate());
  const bad = checks.filter((c) => !c.ok);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight text-ink">Tenders</h1>
        <Link href="/app/tenders/new" className="inline-flex min-h-11 items-center rounded-full bg-yebo px-5 text-sm font-extrabold text-white hover:bg-yebo-deep">New tender</Link>
      </div>

      <Link href="/app/tenders/hub" className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-yebo/25 bg-white p-4 shadow-sm transition hover:border-yebo/50">
        <span>
          <span className="block text-xs font-extrabold uppercase tracking-[.14em] text-yebo">Tender hub</span>
          <span className="mt-1 block text-sm font-bold text-ink">Find live tenders that match your trades, and start a bid in one tap</span>
        </span>
        <span aria-hidden="true" className="text-xl text-yebo">→</span>
      </Link>

      <Link href="/app/tenders/vault" className={`mt-3 flex items-center justify-between gap-3 rounded-2xl border p-4 ${isCompliant(checks) ? "border-yebo/25 bg-lime/20" : "border-orange/40 bg-orange/10"}`}>
        <span>
          <span className="block text-xs font-extrabold uppercase tracking-[.14em] text-yebo-deep/70">Compliance vault</span>
          <span className="mt-1 block text-sm font-bold text-ink">
            {isCompliant(checks) ? "All documents are valid. You can submit bids." : `Needs attention: ${bad.map((c) => c.label).join(", ")}`}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl text-yebo">→</span>
      </Link>

      {rows.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-ink/20 bg-white p-8 text-center">
          <p className="text-lg font-black text-ink">No tenders yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/60">Add a tender, upload its BOQ, and Yebo turns it into a priced bid you can check and send.</p>
          <Link href="/app/tenders/new" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-yebo px-6 text-sm font-extrabold text-white hover:bg-yebo-deep">Add your first tender</Link>
        </div>
      )}

      {open.length > 0 && (<section className="mt-8"><h2 className="text-xs font-extrabold uppercase tracking-[.16em] text-ink/50">Open ({open.length})</h2><div className="mt-3 grid gap-3">{open.map((t) => <TenderCard key={t.id} t={t} />)}</div></section>)}
      {sent.length > 0 && (<section className="mt-8"><h2 className="text-xs font-extrabold uppercase tracking-[.16em] text-ink/50">Submitted ({sent.length})</h2><div className="mt-3 grid gap-3">{sent.map((t) => <TenderCard key={t.id} t={t} />)}</div></section>)}
      {done.length > 0 && (<section className="mt-8"><h2 className="text-xs font-extrabold uppercase tracking-[.16em] text-ink/50">Won and lost ({done.length})</h2><div className="mt-3 grid gap-3">{done.map((t) => <TenderCard key={t.id} t={t} />)}</div></section>)}
    </main>
  );
}
