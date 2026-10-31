import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { waLink } from "@/lib/dates";
import { appUrl } from "@/lib/url";
import { greetingName } from "@/lib/names";
import { depositCents } from "@/lib/deposit";

const DAY = 86400000;
type Item = { key: string; kind: "chase" | "check" | "invoice"; text: string; sub: string; href: string; external: boolean; label: string };

// Dashboard: the moment after "yes" is where money is won or lost. Shows deposits to chase (with a ready WhatsApp message),
// deposits the client says are paid (to check in the bank), and accepted quotes with no invoice yet.
// Any failure shows nothing, never a broken page.
export default async function MoneyReady() {
  try {
    const sb = await createClient();
    const { data: docs, error } = await sb.from("documents")
      .select("id,number,total_cents,payment_plan,deposit_percent,public_token,clients(name,whatsapp_number)")
      .eq("type", "quote").eq("status", "accepted").order("created_at", { ascending: false }).limit(30);
    if (error || !docs?.length) return null;
    const ids = docs.map((d) => d.id as string);
    const [{ data: events }, { data: pays }, { data: invs }] = await Promise.all([
      sb.from("events").select("document_id,type,created_at").in("document_id", ids).in("type", ["accepted", "deposit_claimed"]),
      sb.from("payments").select("document_id,amount_cents").in("document_id", ids),
      sb.from("documents").select("source_quote_id").in("source_quote_id", ids),
    ]);
    const invoiced = new Set((invs ?? []).map((i) => i.source_quote_id as string));
    const now = Date.now();
    const items: Item[] = [];
    for (const d of docs) {
      const ev = (events ?? []).filter((e) => e.document_id === d.id);
      const acceptedAt = ev.filter((e) => e.type === "accepted").map((e) => new Date(e.created_at as string).getTime()).sort((a, b) => b - a)[0];
      if (!acceptedAt) continue;
      const days = Math.floor((now - acceptedAt) / DAY);
      const c = (Array.isArray(d.clients) ? d.clients[0] : d.clients) as { name?: string; whatsapp_number?: string | null } | null;
      const name = c?.name ?? "Your client";
      const first = greetingName(c?.name);
      const due = depositCents(d);
      const paid = (pays ?? []).filter((p) => p.document_id === d.id).reduce((a, p) => a + Number(p.amount_cents), 0);
      const outstanding = Math.max(due - paid, 0);
      const claimed = ev.some((e) => e.type === "deposit_claimed");
      const when = days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
      if (outstanding > 0 && claimed) {
        items.push({ key: d.id + "c", kind: "check", text: `${name} says the ${formatRand(outstanding)} deposit is paid`, sub: "Check your bank, then tap Deposit received.", href: `/app/documents/${d.id}`, external: false, label: "Open the quote" });
      } else if (outstanding > 0 && days >= 1) {
        items.push({
          key: d.id + "d", kind: "chase", text: `${name} said yes ${when}. ${formatRand(outstanding)} deposit not paid`, sub: "A friendly nudge now keeps the date.",
          href: waLink(c?.whatsapp_number ?? null, `Hi ${first}, thanks for accepting quote ${d.number}. The deposit of ${formatRand(outstanding)} confirms your date. You can pay here: ${appUrl()}/d/${d.public_token}`), external: true, label: "Remind on WhatsApp",
        });
      } else if (outstanding <= 0 && !invoiced.has(d.id) && days >= 1) {
        items.push({ key: d.id + "i", kind: "invoice", text: `${name} said yes ${when}. No invoice yet`, sub: "Send the invoice while the job is fresh.", href: `/app/documents/${d.id}`, external: false, label: "Create the invoice" });
      }
    }
    if (!items.length) return null;
    const shown = items.slice(0, 5);
    return (
      <div className="bg-paper px-4 pt-4 sm:px-6 lg:px-8">
        <section aria-label="After the yes" className="mx-auto max-w-6xl rounded-2xl border border-orange/40 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/50">After the yes: money to move</p>
          <ul className="mt-2 divide-y divide-ink/10">
            {shown.map((i) => (
              <li key={i.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="text-sm font-bold">{i.text}</p>
                  <p className="text-xs text-ink/55">{i.sub}</p>
                </div>
                {i.external
                  ? <a href={i.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-yebo px-4 text-sm font-bold text-white hover:bg-yebo-deep">{i.label}</a>
                  : <Link href={i.href} className="inline-flex min-h-11 items-center rounded-xl border border-ink/15 px-4 text-sm font-bold hover:bg-yebo-chalk">{i.label}</Link>}
              </li>
            ))}
          </ul>
          {items.length > shown.length && <p className="mt-2 text-xs text-ink/50">And {items.length - shown.length} more in Quotes and invoices.</p>}
        </section>
      </div>
    );
  } catch {
    return null;
  }
}
