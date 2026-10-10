/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { waLink } from "@/lib/dates";
import { appUrl } from "@/lib/url";
import { readableOn } from "@/lib/color";
import RefreshWhilePending from "./RefreshWhilePending";

export const dynamic = "force-dynamic";

// Where PayFast sends the client after they pay. This page never trusts the address or anything PayFast
// puts in it: it shows the invoice's real status from our database, which only changes when PayFast's
// verified notification reaches our server.
export default async function PaymentReturn({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_document", { p_token: token });
  if (!data) notFound();

  const { document: d, business: b } = data as any;
  const color: string = /^#[0-9a-f]{6}$/i.test(b.brand_color) ? b.brand_color : "#0F8A5F";
  const fg = readableOn(color);
  const paid = d.status === "paid";
  const shareMessage = `Payment received by ${b.name}: ${formatRand(d.total_cents)} for invoice ${d.number}. Receipt: ${appUrl()}/d/${token}`;

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-10 text-ink">
      <section className="w-full max-w-md overflow-hidden rounded-3xl bg-white text-center shadow-xl ring-1 ring-black/5">
        <div className="px-6 pb-8 pt-9" style={{ background: color, color: fg }}>
          <span className="mx-auto grid size-14 place-items-center overflow-hidden rounded-2xl bg-white p-2 text-xl font-black shadow-sm" style={{ color }}>
            {b.logo_url ? <img src={b.logo_url} alt="" className="block max-h-full max-w-full object-contain" /> : String(b.name)[0]}
          </span>
          <p className="mt-4 text-sm font-bold opacity-85">{b.name}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{paid ? "Payment received" : "Thank you"}</h1>
        </div>

        <div className="px-6 pb-8 pt-6">
          {paid ? (
            <>
              <p className="text-base leading-7 text-ink/80">
                Thank you! <b>{formatRand(d.total_cents)}</b> has been paid for invoice <b>{d.number}</b>.
              </p>
              <p className="mt-2 text-sm text-ink/55">{b.name} has been notified.</p>
            </>
          ) : (
            <>
              <p className="text-base leading-7 text-ink/80">
                We&apos;re confirming your payment for invoice <b>{d.number}</b> with PayFast.
              </p>
              <RefreshWhilePending />
            </>
          )}

          <div className="mt-7 flex flex-col gap-2.5">
            {paid && (
              <a href={`/d/${token}/pdf`} className="grid min-h-12 place-items-center rounded-2xl px-4 text-base font-black" style={{ background: color, color: fg }}>
                Download PDF
              </a>
            )}
            {paid && (
              <a href={waLink(null, shareMessage)} target="_blank" rel="noopener noreferrer" className="grid min-h-12 place-items-center rounded-2xl border border-black/15 px-4 text-sm font-bold">
                Share receipt on WhatsApp
              </a>
            )}
            <Link href={`/d/${token}`} className="grid min-h-12 place-items-center rounded-2xl border border-black/15 px-4 text-sm font-bold">
              Back to the invoice
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
