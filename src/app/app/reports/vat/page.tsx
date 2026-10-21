import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { entitlement } from "@/lib/subscription";
import { formatRand } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { southAfricaDate } from "@/lib/time";
import { loadInvoiceBasis, loadPaymentsBasis } from "@/lib/vat-data";
import { isIsoDate, periodPresets, totalsOfInvoices, totalsOfPayments } from "@/lib/vat-report";

const PREVIEW_ROWS = 60;

function Stat({ label, value, note, delay }: { label: string; value: string; note?: string; delay: number }) {
  return (
    <div style={{ "--d": `${delay}s` } as React.CSSProperties} className="fade-up rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/50">{label}</p>
      <p className="mt-2 truncate text-2xl font-extrabold tabular-nums tracking-tight text-ink">{value}</p>
      {note && <p className="mt-1 text-xs text-ink/50">{note}</p>}
    </div>
  );
}

export default async function VatReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; basis?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase.from("businesses").select("name,vat_registered,vat_number").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const ent = await entitlement(supabase);
  const allowed = !ent.enforced || ent.plan?.id === "king";

  if (!allowed) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-3xl font-black tracking-tight text-ink">VAT sales summary</h1>
        <div className="fade-up mt-6 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-yebo">Part of The Industry King</p>
          <p className="mt-3 text-lg font-bold leading-7 text-ink">One click gives your accountant every invoice, the VAT on it, and the VAT on every payment you received, for any period.</p>
          <p className="mt-3 text-sm leading-6 text-ink/65">No more pulling invoices together at month end. Pick the period, download the file, and send it on.</p>
          <Link href="/app/subscribe?change=1" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-yebo px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep">See the plans</Link>
        </div>
      </main>
    );
  }

  const today = southAfricaDate();
  const presets = periodPresets(today);
  const fallback = presets[1]; // last month, the period most people are working on
  const from = isIsoDate(params.from) ? params.from : fallback.from;
  const to = isIsoDate(params.to) ? params.to : fallback.to;
  const valid = from <= to;
  const basis = params.basis === "payments" ? "payments" : "invoice";

  let error = "";
  let invoices: Awaited<ReturnType<typeof loadInvoiceBasis>> = [];
  let payments: Awaited<ReturnType<typeof loadPaymentsBasis>> = [];
  if (valid) {
    try {
      if (basis === "invoice") invoices = await loadInvoiceBasis(supabase, from, to);
      else payments = await loadPaymentsBasis(supabase, from, to);
    } catch (caught) {
      console.error("[vat-report] could not load the report:", caught);
      error = "We could not load your figures just now. Please try again.";
    }
  }

  const invoiceTotals = totalsOfInvoices(invoices);
  const paymentTotals = totalsOfPayments(payments);
  const count = basis === "invoice" ? invoiceTotals.count : paymentTotals.count;
  const query = (overrides: Record<string, string>) => new URLSearchParams({ from, to, basis, ...overrides }).toString();
  const exportHref = `/app/reports/vat/export?${query({})}`;
  const tab = (active: boolean) => `inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition ${active ? "bg-ink text-white" : "border border-ink/15 text-ink/70 hover:bg-paper"}`;

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-10">
      <Link href="/app" className="text-sm font-semibold text-ink/50 hover:text-ink">← Dashboard</Link>
      <p className="mt-4 text-xs font-extrabold uppercase tracking-[.18em] text-yebo">The Industry King</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">VAT sales summary</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">Every invoice and payment for a period, with the VAT on it, in a file your accountant can open in Excel.</p>

      <div role="note" className="mt-5 rounded-2xl border border-orange/30 bg-orange/10 p-4 text-sm leading-6 text-ink">
        <b>What this is, and is not.</b> This is your <b>sales side</b>: the VAT you charged (output tax). It does not include what you spent (input tax), and it is not a VAT201 return. Give it to your accountant, and check it with them before anything goes to SARS.
      </div>
      {!business.vat_registered && (
        <p role="note" className="mt-3 rounded-2xl bg-paper p-4 text-sm leading-6 text-ink/70">Your business is not set up as VAT registered, so the VAT columns will show R0.00. The file is still a handy register of everything you invoiced and were paid.</p>
      )}

      <form method="get" className="mt-6 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
        <input type="hidden" name="basis" value={basis} />
        <p className="text-xs font-extrabold uppercase tracking-[.14em] text-ink/50">Choose the period</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Link key={preset.id} href={`/app/reports/vat?${new URLSearchParams({ from: preset.from, to: preset.to, basis }).toString()}`} className={tab(from === preset.from && to === preset.to)}>{preset.label}</Link>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs font-bold uppercase tracking-[0.1em] text-ink/50">From<input type="date" name="from" defaultValue={from} className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-orange" /></label>
          <label className="text-xs font-bold uppercase tracking-[0.1em] text-ink/50">To<input type="date" name="to" defaultValue={to} className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-orange" /></label>
          <button className="min-h-11 rounded-xl bg-ink px-5 text-sm font-extrabold text-white transition hover:bg-ink/85">Show these dates</button>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="How to count it">
        <Link role="tab" aria-selected={basis === "invoice"} href={`/app/reports/vat?${query({ basis: "invoice" })}`} className={tab(basis === "invoice")}>By invoice date</Link>
        <Link role="tab" aria-selected={basis === "payments"} href={`/app/reports/vat?${query({ basis: "payments" })}`} className={tab(basis === "payments")}>By payment date</Link>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink/55">
        {basis === "invoice"
          ? "Counts every invoice dated in the period, whether or not it has been paid yet. This is how most VAT vendors report."
          : "Counts every payment you received in the period. Some small businesses report this way. Ask your accountant which one applies to you."}
      </p>

      {!valid && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">The start date must be before the end date.</p>}
      {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

      {valid && !error && (
        <>
          <h2 className="mt-8 text-lg font-extrabold text-ink">{formatDate(from)} to {formatDate(to)}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {basis === "invoice" ? (
              <>
                <Stat label="Invoices" value={String(invoiceTotals.count)} delay={0} />
                <Stat label="Sales excl VAT" value={formatRand(invoiceTotals.netCents)} delay={0.06} />
                <Stat label="VAT charged" value={formatRand(invoiceTotals.vatCents)} note="Output tax" delay={0.12} />
                <Stat label="Sales incl VAT" value={formatRand(invoiceTotals.grossCents)} delay={0.18} />
              </>
            ) : (
              <>
                <Stat label="Payments" value={String(paymentTotals.count)} delay={0} />
                <Stat label="Received incl VAT" value={formatRand(paymentTotals.grossCents)} delay={0.06} />
                <Stat label="VAT part" value={formatRand(paymentTotals.vatCents)} note="Output tax" delay={0.12} />
                <Stat label="Received excl VAT" value={formatRand(paymentTotals.netCents)} delay={0.18} />
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {count > 0 ? (
              <a href={exportHref} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-yebo px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-yebo-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo focus-visible:ring-offset-2">
                <span aria-hidden="true">⬇</span> Download for my accountant (CSV)
              </a>
            ) : (
              <p className="rounded-2xl bg-paper p-4 text-sm text-ink/65">Nothing to show for these dates yet. Try another period.</p>
            )}
            {count > 0 && <p className="text-xs text-ink/50">Opens in Excel and Google Sheets. It lists all {count} {basis === "invoice" ? "invoices" : "payments"} with a total row at the bottom.</p>}
          </div>

          {count > 0 && (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-ink/10 bg-paper text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink/50">
                  {basis === "invoice" ? (
                    <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Client</th><th className="px-4 py-3 text-right">Excl VAT</th><th className="px-4 py-3 text-right">VAT</th><th className="px-4 py-3 text-right">Incl VAT</th></tr>
                  ) : (
                    <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Client</th><th className="px-4 py-3 text-right">Excl VAT</th><th className="px-4 py-3 text-right">VAT</th><th className="px-4 py-3 text-right">Received</th></tr>
                  )}
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {basis === "invoice"
                    ? invoices.slice(0, PREVIEW_ROWS).map((item) => (
                        <tr key={item.number}><td className="px-4 py-3 font-bold">{item.number}</td><td className="px-4 py-3 text-ink/65">{formatDate(item.issueDate)}</td><td className="px-4 py-3">{item.clientName}</td><td className="px-4 py-3 text-right tabular-nums">{formatRand(item.subtotalCents)}</td><td className="px-4 py-3 text-right tabular-nums">{formatRand(item.vatCents)}</td><td className="px-4 py-3 text-right font-bold tabular-nums">{formatRand(item.totalCents)}</td></tr>
                      ))
                    : payments.slice(0, PREVIEW_ROWS).map((item, index) => (
                        <tr key={`${item.invoiceNumber}-${index}`}><td className="px-4 py-3 font-bold">{item.invoiceNumber}</td><td className="px-4 py-3 text-ink/65">{formatDate(item.paidDate)}</td><td className="px-4 py-3">{item.clientName}</td><td className="px-4 py-3 text-right tabular-nums">{formatRand(item.netCents)}</td><td className="px-4 py-3 text-right tabular-nums">{formatRand(item.vatCents)}</td><td className="px-4 py-3 text-right font-bold tabular-nums">{formatRand(item.amountCents)}</td></tr>
                      ))}
                </tbody>
              </table>
              {count > PREVIEW_ROWS && <p className="border-t border-ink/10 bg-paper px-4 py-3 text-xs text-ink/55">Showing the first {PREVIEW_ROWS} of {count}. The download has all {count}.</p>}
            </div>
          )}
        </>
      )}
    </main>
  );
}
