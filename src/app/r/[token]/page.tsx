import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import RequestForm from "./RequestForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ask for a quote", robots: { index: false, follow: false } };

export default async function RequestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-z0-9]{8,32}$/.test(token)) notFound();
  const { data: business } = await createAdminClient().from("businesses").select("name,logo_url,brand_color").eq("request_token", token).maybeSingle();
  if (!business) notFound();
  const color = /^#[0-9a-f]{6}$/i.test(business.brand_color ?? "") ? (business.brand_color as string) : "#0F8A5F";

  return (
    <main className="min-h-screen bg-paper px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg">
        <header className="mb-6 text-center">
          {business.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="" width={72} height={72} className="mx-auto mb-3 size-[72px] rounded-2xl object-contain" />
          )}
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color }}>Ask for a quote</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{business.name}</h1>
          <p className="mt-2 text-base leading-7 text-ink/65">Tell us about the job. We will send you a clear quote, usually the same day.</p>
        </header>
        <RequestForm token={token} businessName={business.name} color={color} />
        <p className="mt-6 text-center text-xs text-ink/40">Quotes by Yebo Invoices</p>
      </div>
    </main>
  );
}
