import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteForm from "./QuoteForm";

export default async function NewDocument({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const docType = type === "invoice" ? "invoice" : "quote";
  const sb = await createClient();
  const { data: biz } = await sb.from("businesses").select("vat_registered").maybeSingle();
  if (!biz) redirect("/app/onboarding");
  const { data: clients } = await sb.from("clients").select("id,name,whatsapp_number,address,preferred_payment").order("name");
  const { data: items } = await sb.from("items").select("description,default_price_cents").order("times_used", { ascending: false });

  const tab = (active: boolean) => `rounded-full px-5 py-2 text-sm font-black transition ${active ? "bg-ink text-lime" : "bg-white text-ink/60 ring-1 ring-ink/10 hover:text-ink"}`;
  return (
    <>
      <div className="mx-auto flex max-w-2xl gap-2 px-4 pt-4 sm:px-6">
        <Link href="/app/quotes/new" className={tab(docType === "quote")}>Quote</Link>
        <Link href="/app/quotes/new?type=invoice" className={tab(docType === "invoice")}>Invoice</Link>
      </div>
      <QuoteForm key={docType} clients={clients ?? []} items={items ?? []} vatRegistered={biz.vat_registered} docType={docType} />
    </>
  );
}
