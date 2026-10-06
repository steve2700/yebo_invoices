"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";

export async function sendDraft(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  const { error } = await sb.from("documents").update({ status: "sent" }).eq("id", id).eq("status", "draft");
  if (!error) await sb.from("events").insert({ document_id: id, type: "sent" });
  redirect(`/app/documents/${id}`);
}

export async function markPaid(fd: FormData) {
  const id = String(fd.get("id"));
  const method = fd.get("method") === "cash" ? "cash" : "eft";
  const sb = await createClient();
  const { data: doc } = await sb.from("documents").select("total_cents,type").eq("id", id).single();
  if (doc?.type === "invoice") {
    const { data: pays } = await sb.from("payments").select("amount_cents").eq("document_id", id);
    const due = doc.total_cents - (pays ?? []).reduce((a, p) => a + p.amount_cents, 0);
    if (due > 0) {
      await sb.from("payments").insert({ document_id: id, amount_cents: due, method });
      await sb.from("documents").update({ status: "paid" }).eq("id", id);
      await sb.from("events").insert({ document_id: id, type: "paid" });
    }
  }
  redirect(`/app/documents/${id}`);
}

export async function convertToInvoice(fd: FormData) {
  const quoteId = String(fd.get("id"));
  const sb = await createClient();
  const { data: q } = await sb.from("documents").select("*").eq("id", quoteId).single();
  if (!q || q.type !== "quote" || q.status !== "accepted") redirect(`/app/documents/${quoteId}`);
  const { data: lines } = await sb.from("document_lines").select("*").eq("document_id", quoteId);
  const { data: n, error: nErr } = await sb.rpc("next_document_number", { p_business: q.business_id, p_type: "invoice" });
  if (nErr) throw nErr;
  const { data: inv, error } = await sb.from("documents").insert({
    business_id: q.business_id, client_id: q.client_id, type: "invoice", seq: n[0].doc_seq, number: n[0].doc_number,
    status: "sent", title: q.title, description: q.description, location: q.location, labour_only: q.labour_only,
    due_date: addDays(7), vat_percent: q.vat_percent, subtotal_cents: q.subtotal_cents, vat_cents: q.vat_cents,
    total_cents: q.total_cents, payment_plan: q.payment_plan, deposit_percent: q.deposit_percent,
    payment_terms: q.payment_terms, source_quote_id: q.id,
  }).select("id").single();
  if (error) throw error;
  await sb.from("document_lines").insert((lines ?? []).map(({ id: _id, document_id: _d, ...l }) => ({ ...l, document_id: inv.id })));
  await sb.from("events").insert({ document_id: inv.id, type: "sent" });
  redirect(`/app/documents/${inv.id}`);
}
