"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function createDocumentPdf(doc: any, lines: any[], client: any, business: any) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.05, 0.09, 0.16);
  const green = rgb(0.12, 0.48, 0.35);
  const money = (cents: number) => `R ${(Number(cents ?? 0) / 100).toFixed(2)}`;
  const kind = doc.type === "quote" ? "QUOTE" : "INVOICE";

  page.drawText(business?.name ?? "Yebo Invoices", { x: 48, y: 780, size: 20, font: bold, color: green });
  page.drawText(kind, { x: 430, y: 780, size: 18, font: bold, color: navy });
  page.drawText(doc.number, { x: 430, y: 758, size: 10, font, color: navy });
  page.drawText(`Prepared for ${client?.name ?? "Client"}`, { x: 48, y: 730, size: 11, font, color: navy });
  page.drawLine({ start: { x: 48, y: 710 }, end: { x: 547, y: 710 }, thickness: 1, color: rgb(0.85, 0.87, 0.9) });

  let y = 675;
  page.drawText("Description", { x: 48, y, size: 10, font: bold, color: navy });
  page.drawText("Amount", { x: 465, y, size: 10, font: bold, color: navy });
  y -= 24;
  for (const line of lines ?? []) {
    page.drawText(String(line.description ?? "Item").slice(0, 58), { x: 48, y, size: 10, font, color: navy });
    page.drawText(money(line.amount_cents ?? line.total_cents ?? 0), { x: 465, y, size: 10, font, color: navy });
    y -= 22;
  }
  y -= 12;
  page.drawLine({ start: { x: 350, y }, end: { x: 547, y }, thickness: 1, color: rgb(0.85, 0.87, 0.9) });
  y -= 24;
  page.drawText("Subtotal", { x: 350, y, size: 10, font, color: navy });
  page.drawText(money(doc.subtotal_cents), { x: 465, y, size: 10, font, color: navy });
  y -= 20;
  page.drawText(`VAT (${doc.vat_percent ?? 0}%)`, { x: 350, y, size: 10, font, color: navy });
  page.drawText(money(doc.vat_cents), { x: 465, y, size: 10, font, color: navy });
  y -= 26;
  page.drawText("Total due", { x: 350, y, size: 13, font: bold, color: navy });
  page.drawText(money(doc.total_cents), { x: 465, y, size: 13, font: bold, color: green });
  page.drawText("Thank you for your business.", { x: 48, y: 78, size: 10, font, color: rgb(0.35, 0.38, 0.43) });
  return pdf.save();
}

export async function emailDocument(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  const { data: doc } = await sb.from("documents").select("id,number,type,public_token,status,client_id,business_id,subtotal_cents,vat_cents,vat_percent,total_cents").eq("id", id).single();
  if (!doc) redirect(`/app/documents/${id}`);
  const [{ data: client }, { data: business }, { data: lines }] = await Promise.all([
    sb.from("clients").select("name,email").eq("id", doc.client_id).single(),
    sb.from("businesses").select("name").eq("id", doc.business_id).single(),
    sb.from("document_lines").select("description,amount_cents,total_cents").eq("document_id", id),
  ]);
  if (!client?.email) redirect(`/app/documents/${id}`);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://yebo-invoices.vercel.app";
  const link = `${base}/d/${doc.public_token}`;
  const kind = doc.type === "quote" ? "quote" : "invoice";
  const pdf = await createDocumentPdf(doc, lines ?? [], client, business);
  const fromDomain = process.env.RESEND_EMAIL_DOMAIN ?? "resend.dev";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `document-email/${id}` },
    body: JSON.stringify({
      from: `${business?.name ?? "Yebo Invoices"} <noreply@${fromDomain}>`,
      to: [client.email],
      subject: `Your ${kind} ${doc.number}`,
      html: `<p>Hi ${client.name.split(" ")[0]},</p><p>Your ${kind} from ${business?.name ?? "Yebo Invoices"} is ready.</p><p>We've attached a PDF copy for your records. You can also <a href="${link}">view it online</a>.</p>`,
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
