import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { appUrl } from "@/lib/url";

type Line = { description: string; quantity: number; line_total_cents: number };

export default async function PublicDocument({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_document", { p_token: token });
  if (!data) notFound();
  await supabase.rpc("record_document_event", { p_token: token, p_event: "viewed" });

  const { document: d, lines, business: b, client: c } = data;
  const isQuote = d.type === "quote";
  const canAnswer = isQuote && ["sent", "viewed"].includes(d.status);
  const color = b.brand_color;
  const url = `${appUrl()}/d/${token}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220 });
  const hasBank = b.bank_account_holder && b.bank_account_number && b.bank_branch_code;
  const plan = d.payment_plan === "full" ? "Payment in full is needed to confirm the booking."
    : d.payment_plan === "deposit"
      ? `A ${d.deposit_percent}% deposit (${formatRand(Math.round((d.total_cents * d.deposit_percent) / 100))}) confirms the booking. Balance due ${d.payment_terms}.`
      : `No deposit. Full payment due ${d.payment_terms}.`;

  async function answer(formData: FormData) {
    "use server";
    const ev = formData.get("event") === "accepted" ? "accepted" : "declined";
    const sb = await createClient();
    await sb.rpc("record_document_event", { p_token: token, p_event: ev });
    revalidatePath(`/d/${token}`);
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <article className="rounded-lg bg-white p-6 text-sm shadow" style={{ borderTop: `6px solid ${color}` }}>
        <header className="flex justify-between gap-4 border-b pb-3">
          <div>
            {b.logo_url && <img src={b.logo_url} alt="" className="mb-2 h-12 max-w-[160px] object-contain" />}
            <h1 className="text-lg font-extrabold">{b.name}</h1>
            <p className="text-xs leading-5 text-neutral-500">
              {b.address}<br />{[b.email, b.phone, b.website].filter(Boolean).join(" · ")}<br />
              {b.company_reg ? `Reg. no: ${b.company_reg}` : "Sole proprietor"}
              {b.vat_registered ? ` · VAT no: ${b.vat_number}` : " · Not VAT registered"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold" style={{ color }}>{isQuote ? "QUOTE" : b.vat_registered ? "TAX INVOICE" : "INVOICE"}</div>
            <div className="text-xs text-neutral-500">{d.number}<br />Date: {formatDate(d.issue_date)}<br />
              {isQuote ? `Valid until ${formatDate(d.expiry_date)}` : `Due: ${formatDate(d.due_date)}`}</div>
          </div>
        </header>

        <p className="mt-4">For <b>{c.name}</b>{d.title ? ` · ${d.title}` : ""}{d.location ? ` · ${d.location}` : ""}</p>
        {d.note && <p className="mt-3">{d.note}</p>}
        {d.description && <p className="mt-3 whitespace-pre-line text-neutral-700">{d.description}</p>}
        {d.labour_only && <p className="mt-3 rounded bg-neutral-50 p-2">No materials are required for this job.</p>}

        <table className="mt-4 w-full">
          <tbody>
            {(lines as Line[]).map((l, i) => (
              <tr key={i} className="border-t"><td className="py-2">{l.description} × {l.quantity}</td>
                <td className="py-2 text-right">{formatRand(l.line_total_cents)}</td></tr>
            ))}
            <tr className="border-t"><td className="py-2">VAT</td><td className="py-2 text-right">{b.vat_registered ? formatRand(d.vat_cents) : "Not applicable"}</td></tr>
            <tr className="border-t-2 font-extrabold" style={{ color }}><td className="py-2">Total</td><td className="py-2 text-right">{formatRand(d.total_cents)}</td></tr>
          </tbody>
        </table>

        <div className="mt-4 rounded border-l-4 bg-neutral-50 p-3" style={{ borderColor: color }}><b>Payment</b><br />{plan}</div>

        <div className="mt-4 flex items-center gap-4 rounded border-2 p-3" style={{ borderColor: color }}>
          <img src={qr} alt="QR code for this page" className="h-24 w-24" />
          <div><b>{isQuote ? "Scan to view and accept on your phone" : "Scan to open this invoice on your phone"}</b><br />
            <span className="text-xs text-neutral-500">Reference: {d.number}</span></div>
        </div>

        {hasBank && !isQuote && (
          <div className="mt-4 rounded bg-neutral-50 p-3"><b>Pay by EFT</b><br />
            {b.bank_account_holder} · {b.bank_name} · {b.bank_account_type}<br />
            Account: {b.bank_account_number} · Branch: {b.bank_branch_code}<br />Reference: {d.number}</div>
        )}
        {hasBank && isQuote && d.status === "accepted" && (
          <div className="mt-4 rounded bg-neutral-50 p-3"><b>Banking details</b><br />
            {b.bank_account_holder} · {b.bank_name} · Account: {b.bank_account_number} · Branch: {b.bank_branch_code}</div>
        )}
        {b.guarantee_months && <p className="mt-4 text-xs text-neutral-500">✔ {b.guarantee_months}-month workmanship guarantee on all work by {b.name}.</p>}

        {canAnswer && (
          <form action={answer} className="mt-6 flex gap-3">
            <button name="event" value="accepted" className="flex-1 rounded-xl px-4 py-3 font-bold text-white" style={{ background: color }}>Accept quote</button>
            <button name="event" value="declined" className="rounded-xl border px-4 py-3">Decline</button>
          </form>
        )}
        {isQuote && d.status === "accepted" && <p className="mt-6 rounded-xl bg-emerald-50 p-3 text-center font-bold text-emerald-800">Quote accepted. Thank you!</p>}
      <a href={`/d/${token}/pdf`} className="mt-6 block text-center text-sm font-bold underline" style={{ color }}>Download PDF</a>
      </article>
    </main>
  );
}
