"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { buildDocumentPdf } from "@/lib/pdf";
import { appUrl } from "@/lib/url";

const OPEN_STATUSES = ["sent", "viewed", "partially_paid"];

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const isEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(value.trim());

// Activity events must never break the main action, but a failure should be visible in the server logs.
async function logEvent(sb: SupabaseServerClient, documentId: string, type: "sent" | "paid" | "emailed") {
  const { error } = await sb.from("events").insert({ document_id: documentId, type });
  if (error) console.error(`[documents] could not record "${type}" event:`, error);
}

export async function emailDocument(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  const { data: doc } = await sb.from("documents").select("id,number,type,public_token,status,client_id,business_id,subtotal_cents,vat_cents,vat_percent,total_cents").eq("id", id).single();
  if (!doc) redirect(`/app/documents/${id}`);
  const [{ data: client }, { data: business }] = await Promise.all([
    sb.from("clients").select("name,email").eq("id", doc.client_id).single(),
    sb.from("businesses").select("name,email").eq("id", doc.business_id).single(),
  ]);
  if (!client?.email) redirect(`/app/documents/${id}?notice=email_missing`);
  const base = appUrl();
  const link = `${base}/d/${doc.public_token}`;
  const kind = doc.type === "quote" ? "quote" : "invoice";

  // The public document (used for the PDF) only exists once a draft is marked as sent.
  const { data: flipped } = await sb.from("documents").update({ status: "sent" }).eq("id", id).eq("status", "draft").select("id");
  const wasDraft = (flipped?.length ?? 0) > 0;
  const undoSend = async () => {
    if (wasDraft) await sb.from("documents").update({ status: "draft" }).eq("id", id).eq("status", "sent");
  };

  const { data: pub } = await sb.rpc("get_public_document", { p_token: doc.public_token });
  if (!pub) {
    await undoSend();
    redirect(`/app/documents/${id}?notice=email_failed`);
  }

  let sent = false;
  try {
    const pdf = await buildDocumentPdf(pub, link);
    const fromDomain = process.env.RESEND_EMAIL_DOMAIN ?? "resend.dev";
    const businessName = business?.name ?? "Yebo Invoices";
    // Replies go to the business owner, not to the noreply@ sender address.
    const replyTo = isEmail(business?.email) ? business.email.trim() : null;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        // Stops a double tap from sending twice, but still allows a deliberate resend a minute later.
        "Idempotency-Key": `document-email/${id}/${Math.floor(Date.now() / 60_000)}`,
      },
      body: JSON.stringify({
        from: `${businessName.replace(/[<>"]/g, "")} <noreply@${fromDomain}>`,
        to: [client.email],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: `Your ${kind} ${doc.number}`,
        html: `<p>Hi ${escapeHtml(greetingName(client.name))},</p><p>Your ${kind} from ${escapeHtml(businessName)} is ready.</p><p>We've attached a PDF copy for your records. You can also <a href="${link}">view it online</a>.</p>${replyTo ? `<p>Questions? Just reply to this email and it will reach ${escapeHtml(businessName)} directly.</p>` : ""}`,
        attachments: [{ filename: `${kind}-${doc.number}.pdf`, content: Buffer.from(pdf).toString("base64") }],
      }),
    });
    sent = response.ok;
    if (!response.ok) console.error("[documents] email failed:", response.status, await response.text());
  } catch (error) {
    console.error("[documents] email failed:", error);
  }

  if (!sent) {
    await undoSend();
    redirect(`/app/documents/${id}?notice=email_failed`);
  }

  if (wasDraft) await logEvent(sb, id, "sent");
  await logEvent(sb, id, "emailed");
  redirect(`/app/documents/${id}?notice=emailed`);
}

export async function sendDraft(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  const { data: flipped, error } = await sb.from("documents").update({ status: "sent" }).eq("id", id).eq("status", "draft").select("id");
  // Only record the event if this tap really changed the document (a double tap changes nothing the second time).
  if (!error && flipped?.length) await logEvent(sb, id, "sent");
  redirect(`/app/documents/${id}`);
}

export async function markPaid(fd: FormData) {
  const id = String(fd.get("id"));
  const method = fd.get("method") === "cash" ? "cash" : "eft";
  const sb = await createClient();
  const { data: doc } = await sb.from("documents").select("total_cents,type,status").eq("id", id).single();
  if (doc?.type === "invoice" && OPEN_STATUSES.includes(doc.status)) {
    const { data: pays } = await sb.from("payments").select("amount_cents").eq("document_id", id);
    const due = Number(doc.total_cents) - (pays ?? []).reduce((a, p) => a + Number(p.amount_cents), 0);
    if (due > 0) {
      const { error: payError } = await sb.from("payments").insert({ document_id: id, amount_cents: due, method });
      if (payError) {
        console.error("[documents] could not record payment:", payError);
        redirect(`/app/documents/${id}?notice=payment_failed`);
      }
      const { error: statusError } = await sb.from("documents").update({ status: "paid" }).eq("id", id);
      if (statusError) {
        console.error("[documents] payment saved but status update failed:", statusError);
        redirect(`/app/documents/${id}?notice=payment_failed`);
      }
      await logEvent(sb, id, "paid");
    }
  }
  redirect(`/app/documents/${id}`);
}

export async function convertToInvoice(fd: FormData) {
  const quoteId = String(fd.get("id"));
  const sb = await createClient();
  const { data: q } = await sb.from("documents").select("*").eq("id", quoteId).single();
  if (!q || q.type !== "quote" || q.status !== "accepted") redirect(`/app/documents/${quoteId}`);

  // A quote can only become one invoice. If it already has one, open that instead of creating a duplicate.
  const { data: existing } = await sb.from("documents").select("id").eq("source_quote_id", quoteId).limit(1);
  if (existing?.length) redirect(`/app/documents/${existing[0].id}`);

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
  const { error: lineError } = await sb.from("document_lines").insert((lines ?? []).map(({ id: _id, document_id: _d, ...l }) => ({ ...l, document_id: inv.id })));
  if (lineError) throw lineError;
  await logEvent(sb, inv.id, "sent");
  redirect(`/app/documents/${inv.id}`);
}

export async function duplicateDocument(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  const { data: d } = await sb.from("documents").select("*").eq("id", id).single();
  const { data: biz } = await sb.from("businesses").select("id,vat_registered,default_expiry_days").single();
  if (!d || !biz) redirect("/app/documents");
  const { data: src } = await sb.from("document_lines").select("description,quantity,unit_price_cents,line_total_cents,sort_order").eq("document_id", id).order("sort_order");
  const { data: n, error: nErr } = await sb.rpc("next_document_number", { p_business: biz.id, p_type: d.type });
  if (nErr) throw nErr;

  // Line totals are copied exactly (recalculating them from the unit price can lose a cent on
  // lines priced as a total). Only VAT is recalculated, so a copy follows the business's current VAT status.
  const rows = (src ?? []).map((l) => ({ ...l, line_total_cents: Number(l.line_total_cents) }));
  const subtotal = rows.reduce((a, l) => a + l.line_total_cents, 0);
  const vatPercent = biz.vat_registered ? 15 : 0;
  const vat = Math.round((subtotal * vatPercent) / 100);
  const termDays = /\d+/.test(d.payment_terms ?? "") ? parseInt(String(d.payment_terms).match(/\d+/)![0], 10) : 0;

  const { data: copy, error } = await sb.from("documents").insert({
    business_id: d.business_id, client_id: d.client_id, type: d.type, seq: n[0].doc_seq, number: n[0].doc_number, status: "draft",
    title: d.title, description: d.description, location: d.location, job_date: null, job_date_tbd: d.job_date_tbd, labour_only: d.labour_only,
    expiry_date: d.type === "quote" ? addDays(biz.default_expiry_days) : null,
    due_date: d.type === "invoice" ? addDays(termDays) : null,
    vat_percent: vatPercent, subtotal_cents: subtotal, vat_cents: vat, total_cents: subtotal + vat,
    payment_plan: d.payment_plan, deposit_percent: d.deposit_percent, payment_terms: d.payment_terms, note: d.note,
  }).select("id").single();
  if (error) throw error;
  const { error: lineError } = await sb.from("document_lines").insert(rows.map((l) => ({ ...l, document_id: copy.id })));
  if (lineError) throw lineError;
  redirect(`/app/documents/${copy.id}/edit`);
}

export async function deleteDraft(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  await sb.from("documents").delete().eq("id", id).eq("status", "draft"); // sent documents can never be deleted
  redirect("/app/documents");
}
