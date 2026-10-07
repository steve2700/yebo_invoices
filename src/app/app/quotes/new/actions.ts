"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";

export type NewQuote = {
  clientId: string;
  newClient: { name: string; whatsapp: string; email: string; address: string } | null;
  title: string; location: string; description: string; jobDate: string; jobDateTbd: boolean;
  laborOnly: boolean; plan: "after" | "deposit" | "full"; pct: number; terms: string; note: string;
  items: { description: string; quantity: number; price: number; pricingMode?: "unit" | "line_total" }[];
  send: boolean;
  docType?: "quote" | "invoice";
};

export async function createQuote(input: NewQuote): Promise<{ error: string } | void> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  let docId = "";
  try {
    const { data: biz } = await sb.from("businesses").select("*").single();
    if (!biz) return { error: "Set up your business first." };

    const docType = input.docType === "invoice" ? "invoice" : "quote";
    const termDays = /\d+/.test(input.terms) ? parseInt(input.terms.match(/\d+/)![0], 10) : 0; // "on completion" = due now

    let clientId = input.clientId;
    if (input.newClient) {
      const c = input.newClient;
      if (!c.name.trim()) return { error: "Enter the client's name." };
      const { data, error } = await sb.from("clients").insert({
        business_id: biz.id, name: c.name.trim(), whatsapp_number: c.whatsapp || null,
        email: c.email || null, address: c.address || null,
      }).select("id").single();
      if (error) throw error;
      clientId = data.id;
    }
    if (!clientId) return { error: "Choose a client." };

    const lines = input.items
      .filter((i) => i.description.trim() && Number.isFinite(i.quantity) && i.quantity >= 0.01 && i.quantity <= 100_000 && Number.isFinite(i.price) && i.price > 0)
      .map((i, idx) => {
        const amountCents = Math.round(i.price * 100);
        const quantity = Math.round(i.quantity * 100) / 100;
        const unit = i.pricingMode === "line_total" ? Math.round(amountCents / quantity) : amountCents;
        const lineTotal = i.pricingMode === "line_total" ? amountCents : Math.round(quantity * unit);
        return { description: i.description.trim(), quantity, unit_price_cents: unit,
          line_total_cents: lineTotal, sort_order: idx };
      });
    if (!lines.length) return { error: "Add at least one item with a price." };

    // Totals are always computed on the server, in cents. No VAT unless the business is VAT registered.
    const subtotal = lines.reduce((a, l) => a + l.line_total_cents, 0);
    const vatPercent = biz.vat_registered ? 15 : 0;
    const vat = Math.round((subtotal * vatPercent) / 100);

    const { data: n, error: nErr } = await sb.rpc("next_document_number", { p_business: biz.id, p_type: docType });
    if (nErr) throw nErr;

    const { data: doc, error } = await sb.from("documents").insert({
      business_id: biz.id, client_id: clientId, type: docType,
      seq: n[0].doc_seq, number: n[0].doc_number,
      status: input.send ? "sent" : "draft",
      title: input.title || null, description: input.description || null, location: input.location || null,
      job_date: input.jobDate || null, job_date_tbd: input.jobDateTbd, labour_only: input.laborOnly,
      expiry_date: docType === "quote" ? addDays(biz.default_expiry_days) : null,
      due_date: docType === "invoice" ? addDays(termDays) : null, vat_percent: vatPercent,
      subtotal_cents: subtotal, vat_cents: vat, total_cents: subtotal + vat,
      payment_plan: docType === "invoice" ? "after" : input.plan,
      deposit_percent: docType === "quote" && input.plan === "deposit" ? input.pct : null,
      payment_terms: docType === "quote" && input.plan === "full" ? null : input.terms, note: input.note || null,
    }).select("id").single();
    if (error) throw error;
    docId = doc.id;

    const { error: lErr } = await sb.from("document_lines").insert(lines.map((l) => ({ ...l, document_id: docId })));
    if (lErr) throw lErr;
    if (input.send) await sb.from("events").insert({ document_id: docId, type: "sent" });

    // grow the autocomplete library
    const { data: have } = await sb.from("items").select("description");
    const known = new Set((have ?? []).map((i) => i.description.toLowerCase()));
    const fresh = lines.filter((l) => !known.has(l.description.toLowerCase()));
    if (fresh.length) await sb.from("items").insert(fresh.map((l) => ({
      business_id: biz.id, description: l.description, default_price_cents: l.unit_price_cents })));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong. Please try again." };
  }
  redirect(`/app/documents/${docId}`);
}
