/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { appUrl } from "@/lib/url";
import { readableOn } from "@/lib/color";

type Line = { description: string; quantity: number; unit_price_cents: number; line_total_cents: number };

export default async function PublicDocument({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_document", { p_token: token });
  if (!data) notFound();
  await supabase.rpc("record_document_event", { p_token: token, p_event: "viewed" });

  const { document: d, lines, business: b, client: c } = data as any;
  const isQuote = d.type === "quote";
  const color: string = /^#[0-9a-f]{6}$/i.test(b.brand_color) ? b.brand_color : "#0F8A5F";
  const fg = readableOn(color);
  const today = new Date().toISOString().slice(0, 10);
  const expired = isQuote && ["sent", "viewed"].includes(d.status) && d.expiry_date && d.expiry_date < today;
  const canAnswer = isQuote && ["sent", "viewed"].includes(d.status) && !expired;
  const unpaidInvoice = !isQuote && d.status !== "paid" && d.status !== "draft";
  const hasBank = b.bank_account_holder && b.bank_account_number && b.bank_branch_code;
  const showBank = hasBank && (!isQuote || d.status === "accepted");
  const pageUrl = `${appUrl()}/d/${token}`;
  const qr = await QRCode.toDataURL(pageUrl, { margin: 1, width: 240 });
  const label = isQuote ? "Quote" : b.vat_registered ? "Tax invoice" : "Invoice";
  const web = b.website ? (/^https?:/.test(b.website) ? b.website : `https://${b.website}`) : null;
  const plan = !isQuote ? `Please pay ${formatRand(d.total_cents)} by ${formatDate(d.due_date)}. Use ${d.number} as your payment reference.` : d.payment_plan === "full" ? "Payment in full is needed to confirm the booking."
    : d.payment_plan === "deposit"
      ? `A ${d.deposit_percent}% deposit (${formatRand(Math.round((d.total_cents * d.deposit_percent) / 100))}) confirms the booking. The balance is due ${d.payment_terms}.`
      : `No deposit needed. Full payment is due ${d.payment_terms}.`;

  async function answer(formData: FormData) {
    "use server";
    const ev = formData.get("event") === "accepted" ? "accepted" : "declined";
    const sb = await createClient();
    await sb.rpc("record_document_event", { p_token: token, p_event: ev });
    revalidatePath(`/d/${token}`);
  }

  const bar = "fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-black/10 bg-white/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 md:pb-0";
  const soft = { background: fg === "#ffffff" ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.55)" };
  const Row = ({ k, v }: { k: string; v: string }) => (<div className="flex justify-between gap-4 py-1.5"><dt className="text-ink/55">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>);

  return (
    <main className="min-h-dvh bg-paper pb-28 text-ink md:pb-12">
      {/* header: colours come from the business's logo */}
      <div className="px-5 pb-16 pt-6 md:pb-20" style={{ background: color, color: fg }}>
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white p-1.5 text-xl font-black" style={{ color }}>
                {b.logo_url ? <img src={b.logo_url} alt="" className="size-full object-contain" /> : String(b.name)[0]}
              </span>
              <div className="min-w-0"><p className="truncate text-lg font-black leading-tight">{b.name}</p><p className="text-xs opacity-80">{label} {d.number}</p></div>
            </div>
            <a href={`/d/${token}/pdf`} className="shrink-0 rounded-full px-3.5 py-2 text-xs font-bold" style={soft}>Download PDF</a>
          </div>
          <p className="mt-7 text-sm opacity-80">{label} for <b>{c.name}</b></p>
          <p className="mt-1 text-5xl font-black tracking-tight sm:text-6xl">{formatRand(d.total_cents)}</p>
          <p className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold" style={soft}>
            {isQuote ? `Valid until ${formatDate(d.expiry_date)}` : `Due ${formatDate(d.due_date)}`}
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-8 max-w-2xl px-4">
        <article className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-7">
          {d.status === "accepted" && <p className="mb-5 rounded-2xl bg-lime p-3 text-center font-black">Yebo! Quote accepted. Thank you.</p>}
          {d.status === "declined" && <p className="mb-5 rounded-2xl bg-ink/5 p-3 text-center font-bold">You declined this quote.</p>}
          {d.status === "paid" && <p className="mb-5 rounded-2xl bg-lime p-3 text-center font-black">Paid. Thank you!</p>}
          {expired && <p className="mb-5 rounded-2xl bg-orange/15 p-3 text-center text-sm font-bold">This quote has expired. Please contact {b.name} for an updated one.</p>}

          {(d.title || d.location || d.job_date || d.job_date_tbd) && (
            <section>
              {d.title && <h1 className="text-2xl font-black tracking-tight">{d.title}</h1>}
              <dl className="mt-2 text-sm">
                {d.location && <Row k="Where" v={d.location} />}
                {(d.job_date || d.job_date_tbd) && <Row k="When" v={d.job_date_tbd ? "To be agreed" : formatDate(d.job_date)} />}
              </dl>
            </section>
          )}
          {d.note && <p className="mt-4 border-l-4 pl-4 text-sm leading-relaxed text-ink/80" style={{ borderColor: color }}>{d.note}</p>}
          {d.description && (<section className="mt-5"><h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">What you will get</h2><p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{d.description}</p></section>)}
          {d.labour_only && <p className="mt-3 inline-block rounded-full bg-ink/5 px-3 py-1 text-xs font-bold">No materials needed for this job</p>}

          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">Price</h2>
            <ul className="mt-1 divide-y divide-ink/10">
              {(lines as Line[]).map((l, i) => (
                <li key={i} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span>{l.description}{Number(l.quantity) !== 1 && <span className="block text-xs text-ink/50">{Number(l.quantity)} x {formatRand(l.unit_price_cents)}</span>}</span>
                  <b className="shrink-0">{formatRand(l.line_total_cents)}</b>
                </li>
              ))}
            </ul>
            <div className="mt-1 border-t-2 border-ink/10 pt-2 text-sm">
              <div className="flex justify-between py-1 text-ink/60"><span>VAT</span><span>{b.vat_registered ? formatRand(d.vat_cents) : "Not applicable"}</span></div>
              <div className="flex justify-between py-1 text-lg font-black"><span>Total</span><span style={{ color }}>{formatRand(d.total_cents)}</span></div>
            </div>
          </section>

          <section className="mt-5 rounded-2xl p-4 text-sm" style={{ background: `${color}1A` }}>
            <b className="block">How payment works</b><span className="mt-0.5 block leading-relaxed">{plan}</span>
          </section>

          {showBank && (
            <section id="pay" className="mt-5 rounded-2xl border border-ink/10 p-4 text-sm">
              <b className="block">Pay by EFT</b>
              <dl className="mt-1">
                <Row k="Account holder" v={b.bank_account_holder} /><Row k="Bank" v={`${b.bank_name ?? ""} ${b.bank_account_type ?? ""}`.trim()} />
                <Row k="Account number" v={b.bank_account_number} /><Row k="Branch code" v={b.bank_branch_code} /><Row k="Reference" v={d.number} />
              </dl>
            </section>
          )}

          <section className="mt-6 border-t border-ink/10 pt-5 text-sm">
            <h2 className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">About {b.name}</h2>
            <p className="mt-2 text-ink/70">{b.address}</p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
              {b.phone && <a href={`tel:${String(b.phone).replace(/\s/g, "")}`} style={{ color }}>{b.phone}</a>}
              {b.email && <a href={`mailto:${b.email}`} style={{ color }}>{b.email}</a>}
              {web && <a href={web} style={{ color }}>{b.website}</a>}
            </p>
            <p className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-ink/5 px-3 py-1">{b.company_reg ? `Reg. ${b.company_reg}` : "Sole proprietor"}</span>
              <span className="rounded-full bg-ink/5 px-3 py-1">{b.vat_registered ? `VAT ${b.vat_number}` : "Not VAT registered"}</span>
              {b.guarantee_months && <span className="rounded-full bg-lime px-3 py-1">{b.guarantee_months}-month guarantee</span>}
            </p>
          </section>

          <section className="mt-6 hidden items-center gap-4 rounded-2xl border border-ink/10 p-4 md:flex">
            <img src={qr} alt="QR code for this page" className="size-24" />
            <p className="text-sm"><b className="block">Scan to open this on your phone</b><span className="text-ink/55">Reference {d.number}</span></p>
          </section>

          {canAnswer && (
            <form action={answer} className={bar}>
              <button name="event" value="accepted" className="min-h-12 flex-1 rounded-2xl px-4 text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Accept quote</button>
              <button name="event" value="declined" className="min-h-12 rounded-2xl border border-black/15 px-4 text-sm font-bold">Decline</button>
            </form>
          )}
          {unpaidInvoice && (
            <div className={bar}>
              {showBank && <a href="#pay" className="grid min-h-12 flex-1 place-items-center rounded-2xl px-4 text-base font-black" style={{ background: color, color: fg }}>Pay by EFT</a>}
              <a href={`/d/${token}/pdf`} className="grid min-h-12 flex-1 place-items-center rounded-2xl border border-black/15 px-4 text-sm font-bold">Download PDF</a>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
