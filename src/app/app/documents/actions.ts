"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { buildDocumentPdf } from "@/lib/pdf";
import { appUrl } from "@/lib/url";

type Sb = Awaited<ReturnType<typeof createClient>>;

// followups_due() in 0002_followups.sql counts one event type for invoices and quotes alike,
// and the events insert policy only allows 'sent', 'reminder_sent', 'paid' (plus 'emailed' once
// you apply the policy fix). Any other event name is rejected by row level security.
const REMINDER_EVENT = "reminder_sent";

// Event rows are history, so a failed insert should never block the main action.
// It is logged instead of being swallowed silently, and the caller gets a boolean back.
async function logEvent(sb: Sb, documentId: string, type: string) {
  const { error } = await sb.from("events").insert({ document_id: documentId, type });
  if (error) console.error(`Could not record "${type}" event for document ${documentId}:`, error.message);
  return !error;
}

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
  if (response.ok) {
    // followups_due() times quote follow-ups from the 'sent' event, so an emailed draft needs one.
    if (doc.status === "draft") await logEvent(sb, id, "sent");
    await logEvent(sb, id, "emailed");
  } else console.error(`Resend rejected document ${id}:`, response.status, await response.text().catch(() => ""));
  redirect(`/app/documents/${id}`);
}

export async function sendDraft(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  // select() returns the rows that actually changed, so a double tap on an already sent
  // document does not log a second "sent" event.
  const { data: updated, error } = await sb
    .from("documents")
    .update({ status: "sent" })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error) console.error(`Could not mark document ${id} as sent:`, error.message);
  else if (updated?.length) await logEvent(sb, id, "sent");
  redirect(`/app/documents/${id}`);
}

export async function markPaid(fd: FormData) {
  const id = String(fd.get("id"));
  const method = fd.get("method") === "cash" ? "cash" : "eft";
  const sb = await createClient();
  const { data: doc } = await sb.from("documents").select("total_cents,type").eq("id", id).single();
  if (doc?.type === "invoice") {
    const { data: pays } = await sb.from("payments").select("amount_cents").eq("document_id", id);
    const due = doc.total_cents - (pays ?? []).reduce((a, p) => a + Number(p.amount_cents), 0);
    if (due > 0) {
      // The payment is the money record. If it fails we stop here and never flip the status,
      // otherwise the invoice would show as paid with no payment behind it.
      const { error: payError } = await sb.from("payments").insert({ document_id: id, amount_cents: due, method });
      if (payError) throw new Error(`Could not record the payment: ${payError.message}`);
      const { error: statusError } = await sb.from("documents").update({ status: "paid" }).eq("id", id);
      if (statusError) throw new Error(`Payment saved but the status update failed: ${statusError.message}`);
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
  const { error: linesError } = await sb.from("document_lines").insert((lines ?? []).map(({ id: _id, document_id: _d, ...l }) => ({ ...l, document_id: inv.id })));
  if (linesError) {
    // Do not leave a sent invoice with no line items behind.
    await sb.from("documents").delete().eq("id", inv.id);
    throw new Error(`Could not copy the quote lines: ${linesError.message}`);
  }
  await logEvent(sb, inv.id, "sent");
  redirect(`/app/documents/${inv.id}`);
}

export async function duplicateDocument(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  const { data: d } = await sb.from("documents").select("*").eq("id", id).single();
  const { data: biz } = await sb.from("businesses").select("id,vat_registered,default_expiry_days").single();
  if (!d || !biz) redirect("/app/documents");
  const { data: src } = await sb.from("document_lines").select("description,quantity,unit_price_cents,sort_order").eq("document_id", id).order("sort_order");
  const { data: n, error: nErr } = await sb.rpc("next_document_number", { p_business: biz.id, p_type: d.type });
  if (nErr) throw nErr;

  // totals are recalculated, so a copy always follows the business's current VAT status
  const rows = (src ?? []).map((l) => ({ ...l, line_total_cents: Math.round(Number(l.quantity) * l.unit_price_cents) }));
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
  const { error: linesError } = await sb.from("document_lines").insert(rows.map((l) => ({ ...l, document_id: copy.id })));
  if (linesError) {
    await sb.from("documents").delete().eq("id", copy.id).eq("status", "draft");
    throw new Error(`Could not copy the lines: ${linesError.message}`);
  }
  redirect(`/app/documents/${copy.id}/edit`);
}

export async function deleteDraft(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  await sb.from("documents").delete().eq("id", id).eq("status", "draft"); // sent documents can never be deleted
  redirect("/app/documents");
}

// Called by AiMessageComposer when the user taps "Open WhatsApp" or the standard message link.
// This is the step that starts the 3 day wait before the dashboard offers another nudge.
export async function recordReminderSent(
  documentId: string,
  kind: "reminder" | "quote_followup",
): Promise<{ ok: boolean }> {
  if (kind !== "reminder" && kind !== "quote_followup") return { ok: false };
  const sb = await createClient();
  const { data: doc } = await sb.from("documents").select("id,type,status").eq("id", documentId).maybeSingle();
  if (!doc) return { ok: false };

  const allowed =
    kind === "reminder"
      ? doc.type === "invoice" && ["sent", "viewed", "partially_paid"].includes(doc.status)
      : doc.type === "quote" && ["sent", "viewed"].includes(doc.status);
  if (!allowed) return { ok: false };

  // Every reminder counts toward the 3 reminder cap in followups_due(), so ignore a repeat tap
  // (for example the standard link and the AI dialog) within a minute of the last one.
  const { data: last } = await sb
    .from("events")
    .select("created_at")
    .eq("document_id", doc.id)
    .eq("type", REMINDER_EVENT)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 60_000) return { ok: true };

  const ok = await logEvent(sb, doc.id, REMINDER_EVENT);
  if (ok) {
    revalidatePath("/app");
    revalidatePath(`/app/documents/${doc.id}`);
  }
  return { ok };
}
