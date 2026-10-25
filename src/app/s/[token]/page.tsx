/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { readableOn } from "@/lib/color";
import CopyButton from "@/app/d/[token]/CopyButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Statement", robots: { index: false, follow: false } };

type Inv = { number: string; token: string; issue_date: string; due_date: string | null; total_cents: number; balance_cents: number };

// Everything one client still owes one business, on a single private page.
export default async function Statement({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9]{16,80}$/.test(token)) notFound();
  const sb = await createClient();
  const { data } = await sb.rpc("get_client_statement", { p_token: token });
  if (!data) notFound();
  const { client, business: b, invoices } = data as { client: { name: string }; business: any; invoices: Inv[] };
  const color: string = /^#[0-9a-f]{6}$/i.test(b.brand_color) ? b.brand_color : "#0F8A5F";
  const fg = readableOn(color);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const total = invoices.reduce((sum, i) => sum + Number(i.balance_cents), 0);
  const overdue = invoices.filter((i) => i.due_date && i.due_date < today);
  const overdueTotal = overdue.reduce((sum, i) => sum + Number(i.balance_cents), 0);
  const hasBank = b.bank_account_holder && b.bank_account_number && b.bank_branch_code;
  const Row = ({ k, v, copy }: { k: string; v: string; copy?: string }) => (
    <div className="flex items-center justify-between gap-4 py-1.5"><dt className="text-ink/55">{k}</dt><dd className="flex items-center text-right font-semibold">{v}{copy && <CopyButton value={copy} label={k.toLowerCase()} />}</dd></div>
  );

  return (
    <main className="min-h-dvh bg-paper pb-12 text-ink">
      <div className="px-5 pb-16 pt-6" style={{ background: color, color: fg }}>
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-2 text-xl font-black shadow-sm" style={{ color }}>
              {b.logo_url ? <img src={b.logo_url} alt="" className="block max-h-full max-w-full object-contain" /> : String(b.name)[0]}
            </span>
            <div className="min-w-0"><p className="truncate text-lg font-black leading-tight">{b.name}</p><p className="text-xs opacity-80">Statement for {client.name}</p></div>
          </div>
          <div className="mt-7 border-t border-current/20 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-75">{total > 0 ? "Total outstanding" : "Nothing outstanding"}</p>
            <p className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{formatRand(total)}</p>
            {overdueTotal > 0 && <p className="mt-3 inline-block rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: fg === "#ffffff" ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.55)" }}>{formatRand(overdueTotal)} is overdue</p>}
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-8 max-w-2xl px-4">
        <article className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-7">
          {invoices.length === 0 ? (
            <p className="rounded-2xl bg-lime p-4 text-center font-black">You are all paid up. Thank you!</p>
          ) : (
            <>
              <h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">Open invoices</h2>
              <ul className="mt-2 divide-y divide-ink/10">
                {invoices.map((i) => {
                  const late = Boolean(i.due_date && i.due_date < today);
                  return (
                    <li key={i.token} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-bold">{i.number}</p>
                          <p className={`mt-0.5 text-xs ${late ? "font-bold text-orange" : "text-ink/55"}`}>{i.due_date ? `${late ? "Was due" : "Due"} ${formatDate(i.due_date)}` : "No due date"}</p>
                        </div>
                        <p className="shrink-0 text-lg font-black">{formatRand(Number(i.balance_cents))}</p>
                      </div>
                      <a href={`/d/${i.token}`} className="mt-3 grid min-h-11 place-items-center rounded-xl text-sm font-black" style={{ background: color, color: fg }}>
                        {b.online_payments ? "View and pay" : "View invoice"}
                      </a>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex justify-between rounded-xl px-3 py-3 text-lg font-black" style={{ background: `${color}12` }}><span>Total</span><span style={{ color }}>{formatRand(total)}</span></div>
            </>
          )}

          {invoices.length > 0 && hasBank && (
            <section className="mt-6 rounded-2xl border border-ink/10 p-4 text-sm">
              <b className="block">Pay everything by EFT</b>
              <p className="mt-1 text-xs text-ink/55">Use the invoice number as your reference. If you pay several together, put all the numbers in the reference.</p>
              <dl className="mt-1">
                <Row k="Amount" v={formatRand(total)} copy={(total / 100).toFixed(2)} />
                <Row k="Account holder" v={b.bank_account_holder} />
                <Row k="Bank" v={`${b.bank_name ?? ""} ${b.bank_account_type ?? ""}`.trim()} />
                <Row k="Account number" v={b.bank_account_number} copy={String(b.bank_account_number)} />
                <Row k="Branch code" v={b.bank_branch_code} copy={String(b.bank_branch_code)} />
                <Row k="Reference" v={invoices.map((i) => i.number).join(", ").slice(0, 60)} copy={invoices.map((i) => i.number).join(" ").slice(0, 60)} />
              </dl>
            </section>
          )}

          <section className="mt-6 border-t border-ink/10 pt-5 text-sm">
            <p className="font-bold">Questions about this statement?</p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
              {b.phone && <a href={`tel:${String(b.phone).replace(/\s/g, "")}`} style={{ color }}>{b.phone}</a>}
              {b.email && <a href={`mailto:${b.email}`} style={{ color }}>{b.email}</a>}
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
