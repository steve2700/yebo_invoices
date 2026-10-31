import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatVisit, validVisitToken } from "@/lib/visit";
import VisitReply from "./VisitReply";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Site visit", robots: { index: false, follow: false } };

export default async function VisitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!validVisitToken(token)) notFound();
  const admin = createAdminClient();
  const { data: r } = await admin.from("quote_requests").select("name,location,visit_at,visit_status,business_id").eq("visit_token", token).maybeSingle();
  if (!r?.visit_at) notFound();
  const { data: b } = await admin.from("businesses").select("name,logo_url,brand_color,phone").eq("id", r.business_id).maybeSingle();
  if (!b) notFound();
  const color = /^#[0-9a-f]{6}$/i.test(b.brand_color ?? "") ? (b.brand_color as string) : "#0F8A5F";
  const first = r.name.split(" ")[0];

  return (
    <main className="min-h-screen bg-paper px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg">
        <header className="mb-6 text-center">
          {b.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt="" width={72} height={72} className="mx-auto mb-3 size-[72px] rounded-2xl object-contain" />
          )}
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color }}>Site visit</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{b.name}</h1>
        </header>
        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
          <p className="text-base text-ink/70">Hi {first}, we would like to look at the job before we send your quote.</p>
          <p className="mt-4 rounded-2xl bg-yebo-chalk p-4 text-xl font-extrabold capitalize text-yebo-deep">{formatVisit(r.visit_at)}</p>
          {r.location && <p className="mt-3 text-sm text-ink/60">At: {r.location}</p>}
          {r.visit_status === "confirmed" ? (
            <div className="mt-6 rounded-2xl bg-yebo-chalk p-4 text-center">
              <p className="text-lg font-extrabold text-yebo-deep">Confirmed. See you then.</p>
              <a href={`/v/${token}/ics`} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-yebo px-4 text-sm font-bold text-yebo">Add to my calendar</a>
            </div>
          ) : r.visit_status === "declined" ? (
            <p className="mt-6 rounded-2xl bg-yebo-chalk p-4 text-center font-bold text-yebo-deep">You asked for another day. {b.name} will be in touch.</p>
          ) : (
            <VisitReply token={token} color={color} />
          )}
          {b.phone && <p className="mt-6 text-center text-xs text-ink/50">Questions? Call {b.phone}</p>}
        </section>
        <p className="mt-6 text-center text-xs text-ink/40">Powered by Yebo Invoices</p>
      </div>
    </main>
  );
}
