import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteForm from "./QuoteForm";

export default async function NewQuote() {
  const sb = await createClient();
  const { data: biz } = await sb.from("businesses").select("vat_registered").maybeSingle();
  if (!biz) redirect("/app/onboarding");
  const { data: clients } = await sb.from("clients").select("id,name,whatsapp_number,address,preferred_payment").order("name");
  const { data: items } = await sb.from("items").select("description,default_price_cents").order("times_used", { ascending: false });
  return <QuoteForm clients={clients ?? []} items={items ?? []} vatRegistered={biz.vat_registered} />;
}
