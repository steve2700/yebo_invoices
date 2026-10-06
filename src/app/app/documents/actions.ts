"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { buildDocumentPdf } from "@/lib/pdf";
import { appUrl } from "@/lib/url";

export async function emailDocument(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  const { data: doc } = await sb.from("documents").select("id,number,type,public_token,status,client_id,business_id,subtotal_cents,vat_cents,vat_percent,total_cents").eq("id", id).single();
  if (!doc) redirect(`/app/documents/${id}`);
  const [{ data: client }, { data: business }] = await Promise.all([
    sb.from("clients").select("name,email").eq("id", doc.client_id).single(),
    sb.from("businesses").select("name").eq("id", doc.business_id).single(),
  ]);
  if (!client?.email) redirect(`/app/documents/${id}`);
  const base = appUrl();
  const link = `${base}/d/${doc.public_token}`;
  const kind = doc.type === "quote" ? "quote" : "invoice";
  await sb.from("documents").update({ status: "sent" }).eq("id", id).eq("status", "draft");
  const { data: pub } = await sb.rpc("get_public_document", { p_token: doc.public_token });
  if (!pub) redirect(`/app/documents/${id}`);
  const pdf = await buildDocumentPdf(pub, link);
  const fromDomain = process.env.RESEND_EMAIL_DOMAIN ?? "resend.dev";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `document-email/${id}` },
    body: JSON.stringify({
      from: `${business?.name ?? "Yebo Invoices"} <noreply@${fromDomain}>`,
      to: [client.email],
      subject: `Your ${kind} ${doc.number}`,
      html: `<p>Hi ${greetingName(client.name)},</p><p>Your ${kind} from ${business?.name ?? "Yebo Invoices"} is ready.</p><p>We've attached a PDF copy for your records. You can also <a href="${link}">view it online</a>.</p>`,
      attachments: [{ filename: `${kind}-${doc.number}.pdf`, content: Buffer.from(pdf).toString("base64") }],
    }),
  });
  if (response.ok) await sb.from("events").insert({ document_id: id, type: "emailed" });
  redirect(`/app/documents/${id}`);
}

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
