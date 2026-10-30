import Link from "next/link";
import type { ComponentProps } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteForm from "./QuoteForm";
import { voiceQuotesLeft } from "@/lib/subscription";
import type { PastDoc } from "@/lib/similar";

export default async function NewDocument({ searchParams }: { searchParams: Promise<{ type?: string; request?: string }> }) {
  const { type, request } = await searchParams;
  const docType = type === "invoice" ? "invoice" : "quote";
  const sb = await createClient();
  const { data: biz } = await sb.from("businesses").select("vat_registered").maybeSingle();
  if (!biz) redirect("/app/onboarding");
  const { data: clients } = await sb.from("clients").select("id,name,email,whatsapp_number,address,preferred_payment").order("name");
  const { data: items } = await sb.from("items").select("description,default_price_cents").order("times_used", { ascending: false });

  const voiceLeft = await voiceQuotesLeft(sb);

  // Coming from a client's quote request: the client is already saved and the job description is filled in.
  let initial: ComponentProps<typeof QuoteForm>["initial"];
  if (request && docType === "quote" && /^[0-9a-f-]{36}$/i.test(request)) {
    const { data: req } = await sb.from("quote_requests").select("client_id,details,location").eq("id", request).maybeSingle();
    if (req?.client_id) {
      initial = {
        clientId: req.client_id,
        f: { title: "", location: req.location ?? "", description: req.details ?? "", jobDate: "", jobDateTbd: false, laborOnly: false, plan: "after", pct: 50, terms: "on completion", note: "", exclusions: "", assumptions: "", timeline: "" },
        lines: [{ description: "", quantity: 1, price: 0 }],
      };
    }
  }

  // The last documents of this type, so the form can offer "start from a similar one". Options (Good/Better/Best) quotes are skipped.
  const { data: pastRows } = await sb
    .from("documents")
    .select("id,client_id,title,description,exclusions,assumptions,timeline,status,total_cents,created_at,has_options,document_lines(description,quantity,unit_price_cents,sort_order,option_key)")
    .eq("type", docType)
    .order("created_at", { ascending: false })
    .limit(60);
  const past: PastDoc[] = (pastRows ?? [])
    .filter((row: any) => !row.has_options && !(row.document_lines ?? []).some((line: any) => line.option_key))
    .map((row: any) => ({
      id: row.id, clientId: row.client_id, title: row.title ?? "", description: row.description ?? "",
      exclusions: row.exclusions ?? "", assumptions: row.assumptions ?? "", timeline: row.timeline ?? "",
      status: row.status, totalCents: Number(row.total_cents), createdAt: String(row.created_at).slice(0, 10),
      lines: [...(row.document_lines ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((line: any) => ({ description: line.description, quantity: Number(line.quantity), unitPriceCents: Number(line.unit_price_cents) })),
    }));

  const tab = (active: boolean) => `rounded-full px-5 py-2 text-sm font-black transition ${active ? "bg-ink text-lime" : "bg-white text-ink/60 ring-1 ring-ink/10 hover:text-ink"}`;
  return (
    <>
      <div className="mx-auto flex max-w-2xl gap-2 px-4 pt-4 sm:px-6">
        <Link href="/app/quotes/new" className={tab(docType === "quote")}>Quote</Link>
        <Link href="/app/quotes/new?type=invoice" className={tab(docType === "invoice")}>Invoice</Link>
      </div>
      <QuoteForm key={docType + (initial ? ":" + request : "")} initial={initial} clients={clients ?? []} items={items ?? []} vatRegistered={biz.vat_registered} docType={docType} voiceLeft={voiceLeft} past={past} />
    </>
  );
}
