import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteForm from "@/app/app/quotes/new/QuoteForm";

export default async function EditDraft({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: d } = await sb.from("documents").select("*").eq("id", id).single();
  if (!d) notFound();
  if (d.status !== "draft") redirect(`/app/documents/${id}`); // sent documents are locked

  const [{ data: biz }, { data: lines }, { data: clients }, { data: items }] = await Promise.all([
    sb.from("businesses").select("vat_registered").single(),
    sb.from("document_lines").select("description,quantity,unit_price_cents").eq("document_id", id).order("sort_order"),
    sb.from("clients").select("id,name,whatsapp_number,address,preferred_payment").order("name"),
    sb.from("items").select("description,default_price_cents").order("times_used", { ascending: false }),
  ]);
  if (!biz) redirect("/app/onboarding");

  const plan = d.payment_plan === "deposit" || d.payment_plan === "full" ? d.payment_plan : "after";
  const initial = {
    clientId: d.client_id as string,
    f: {
      title: d.title ?? "", location: d.location ?? "", description: d.description ?? "", jobDate: d.job_date ?? "",
      jobDateTbd: !!d.job_date_tbd, laborOnly: !!d.labour_only, plan: plan as "after" | "deposit" | "full",
      pct: d.deposit_percent ?? 50, terms: d.payment_terms ?? (d.type === "invoice" ? "within 7 days" : "on completion"), note: d.note ?? "",
    },
    lines: (lines ?? []).map((l) => ({ description: l.description, quantity: Number(l.quantity), price: l.unit_price_cents / 100 })),
  };

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-6">
        <Link href={`/app/documents/${id}`} className="text-sm font-bold text-ink/60 hover:text-ink">← Cancel and go back to {d.number}</Link>
      </div>
      <QuoteForm clients={clients ?? []} items={items ?? []} vatRegistered={biz.vat_registered} docType={d.type} documentId={id} initial={initial} />
    </>
  );
}
