"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { buildDocumentPdf } from "@/lib/pdf";
import { appUrl } from "@/lib/url";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";
import { checkDocumentAllowance } from "@/lib/subscription";
import { depositCents } from "@/lib/deposit";
import { sendPaymentReceipt } from "@/lib/receipt";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAY_MAX, DAY_MIN, firstRun } from "@/lib/recurring";
import { southAfricaDate } from "@/lib/time";
import { linesForChoice, lowestSubtotal, optionsPresent, subtotalFor, type OptionKey } from "@/lib/quote-options";

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

// What the "Email" card shows the user after they tap it.
export type EmailResult =
  | { ok: true; to: string; at: string; replyTo: string | null }
  | { ok: false; error: string };

// Emails a quote or invoice (with its PDF) to the client and tells the user exactly what happened.
// Replies go straight to the business's own email, not to the noreply sender address.
export async function sendDocumentEmail(documentId: string): Promise<EmailResult> {
  if (typeof documentId !== "string" || !/^[0-9a-f-]{36}$/i.test(documentId)) {
    return { ok: false, error: "We could not find that document." };
  }
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again to send this." };

  const { data: doc } = await sb
    .from("documents")
    .select("id,number,type,public_token,status,client_id,business_id")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "We could not find that document." };

  const [{ data: client }, { data: business }] = await Promise.all([
    sb.from("clients").select("name,email").eq("id", doc.client_id).maybeSingle(),
    sb.from("businesses").select("name,email,brand_color").eq("id", doc.business_id).maybeSingle(),
  ]);
  const kind = doc.type === "quote" ? "quote" : "invoice";
  if (!isEmail(client?.email)) {
    return { ok: false, error: `${client?.name ?? "This client"} has no email address saved. Send it on WhatsApp instead, or add an email address to the client.` };
  }
  const to = client.email.trim();
  const replyTo = isEmail(business?.email) ? business.email.trim() : null;
  const businessName = business?.name ?? "Yebo Invoices";
  const link = `${appUrl()}/d/${doc.public_token}`;

  // The public version of a document (used for the PDF) only exists once a draft is marked as sent.
  const { data: flipped } = await sb.from("documents").update({ status: "sent" }).eq("id", documentId).eq("status", "draft").select("id");
  const wasDraft = (flipped?.length ?? 0) > 0;
  const undoSend = async () => {
    if (wasDraft) await sb.from("documents").update({ status: "draft" }).eq("id", documentId).eq("status", "sent");
  };

  const { data: pub } = await sb.rpc("get_public_document", { p_token: doc.public_token });
  if (!pub) {
    await undoSend();
    return { ok: false, error: "We could not prepare the PDF. Please try again." };
  }

  let sent = false;
  try {
    const pdf = await buildDocumentPdf(pub, link);
    sent = await sendEmail({
      to,
      fromName: businessName,
      replyTo,
      // Stops a double tap sending twice, but still allows a deliberate resend a minute later.
      idempotencyKey: `document-email/${documentId}/${Math.floor(Date.now() / 60_000)}`,
      subject: `Your ${kind} ${doc.number} from ${businessName}`,
      html: renderEmail({
        brandColor: business?.brand_color,
        heading: `Your ${kind} is ready`,
        intro: `Hi ${greetingName(client.name)}, ${businessName} has sent you ${kind === "quote" ? "a quote" : "an invoice"}. A PDF copy is attached, and you can also view it online.`,
        rows: [[kind === "quote" ? "Quote" : "Invoice", doc.number]],
        buttonLabel: kind === "quote" ? "View and accept the quote" : "View and pay the invoice",
        buttonUrl: link,
        footer: replyTo ? `Questions? Just reply to this email and it will reach ${businessName} directly.` : null,
      }),
      attachments: [{ filename: `${kind}-${doc.number}.pdf`, content: Buffer.from(pdf).toString("base64") }],
    });
  } catch (error) {
    console.error(`Could not build or send the email for document ${documentId}:`, error);
  }

  if (!sent) {
    await undoSend();
    return { ok: false, error: "The email did not go through, so nothing was sent to your client. Please try again in a moment." };
  }

  // followups_due() times quote follow-ups from the 'sent' event, so an emailed draft needs one.
  if (wasDraft) await logEvent(sb, documentId, "sent");
  await logEvent(sb, documentId, "emailed");
  revalidatePath(`/app/documents/${documentId}`);
  revalidatePath("/app");
  return { ok: true, to, at: new Date().toISOString(), replyTo };
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
      const { data: payRow, error: payError } = await sb.from("payments").insert({ document_id: id, amount_cents: due, method }).select("id").single();
      if (payError) throw new Error(`Could not record the payment: ${payError.message}`);
      const { error: statusError } = await sb.from("documents").update({ status: "paid" }).eq("id", id);
      if (statusError) throw new Error(`Payment saved but the status update failed: ${statusError.message}`);
      await logEvent(sb, id, "paid");
      await sendPaymentReceipt(id, due, method, String(payRow?.id ?? Date.now()));
    }
  }
  redirect(`/app/documents/${id}`);
}

export async function convertToInvoice(fd: FormData) {
  const quoteId = String(fd.get("id"));
  const sb = await createClient();
  if (!(await checkDocumentAllowance(sb)).ok) redirect("/app/subscribe?reason=documents");
  const { data: q } = await sb.from("documents").select("*").eq("id", quoteId).single();
  if (!q || q.type !== "quote" || q.status !== "accepted") redirect(`/app/documents/${quoteId}`);
  // A quote becomes one invoice. If it already has one (for example from a double tap), open that instead.
  const { data: already } = await sb.from("documents").select("id").eq("source_quote_id", quoteId).limit(1);
  if (already?.length) redirect(`/app/documents/${already[0].id}`);
  const { data: allLines } = await sb.from("document_lines").select("*").eq("document_id", quoteId);
  // A quote with options becomes an invoice for the option the client chose (or the cheapest, if none was recorded).
  let chosen: string | null = q.chosen_option ?? null;
  if (q.has_options && !chosen) {
    const present = optionsPresent(allLines ?? []);
    chosen = present.length ? present.reduce((best: OptionKey, key: OptionKey) => (subtotalFor(allLines ?? [], key) < subtotalFor(allLines ?? [], best) ? key : best), present[0]) : null;
  }
  const lines = q.has_options ? linesForChoice(allLines ?? [], chosen) : allLines;
  const { data: quotePayments } = await sb.from("payments").select("id,amount_cents,method,paid_at,thanked_at").eq("document_id", quoteId);
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
  const { error: linesError } = await sb.from("document_lines").insert((lines ?? []).map(({ id: _id, document_id: _d, option_key: _o, ...l }) => ({ ...l, document_id: inv.id })));
  if (linesError) {
    // Do not leave a sent invoice with no line items behind.
    await sb.from("documents").delete().eq("id", inv.id);
    throw new Error(`Could not copy the quote lines: ${linesError.message}`);
  }
  await logEvent(sb, inv.id, "sent");

  // A deposit the client already paid on the quote is credited to the invoice, so they are never asked for it twice.
  if ((quotePayments ?? []).length) {
    const credit = (quotePayments ?? []).map((p) => ({
      document_id: inv.id, amount_cents: p.amount_cents, method: p.method, provider_reference: `from-quote:${p.id}`,
      paid_at: p.paid_at, thanked_at: p.thanked_at ?? new Date().toISOString(),
    }));
    const { error: creditError } = await sb.from("payments").insert(credit);
    if (creditError) {
      console.error("Could not credit the quote deposit to the invoice:", creditError.message);
    } else {
      const credited = credit.reduce((a, p) => a + Number(p.amount_cents), 0);
      await sb.from("documents").update({ status: credited >= Number(q.total_cents) ? "paid" : "partially_paid" }).eq("id", inv.id);
    }
  }
  redirect(`/app/documents/${inv.id}`);
}

// The owner confirms the deposit has reached their bank (or was paid in cash).
export async function markDepositReceived(fd: FormData) {
  const id = String(fd.get("id"));
  const method = fd.get("method") === "cash" ? "cash" : "eft";
  const sb = await createClient();
  const { data: doc } = await sb.from("documents").select("total_cents,type,status,payment_plan,deposit_percent").eq("id", id).single();
  if (doc?.type === "quote" && doc.status === "accepted") {
    const { data: pays } = await sb.from("payments").select("amount_cents").eq("document_id", id);
    const due = depositCents(doc) - (pays ?? []).reduce((a, p) => a + Number(p.amount_cents), 0);
    if (due > 0) {
      const { data: payRow, error } = await sb.from("payments").insert({ document_id: id, amount_cents: due, method }).select("id").single();
      if (error) throw new Error(`Could not record the deposit: ${error.message}`);
      await logEvent(sb, id, "paid");
      await sendPaymentReceipt(id, due, method, String(payRow?.id ?? Date.now()));
    }
  }
  revalidatePath(`/app/documents/${id}`);
  revalidatePath("/app");
  redirect(`/app/documents/${id}`);
}

export async function duplicateDocument(fd: FormData) {
  const id = String(fd.get("id"));
  const sb = await createClient();
  if (!(await checkDocumentAllowance(sb)).ok) redirect("/app/subscribe?reason=documents");
  const { data: d } = await sb.from("documents").select("*").eq("id", id).single();
  const { data: biz } = await sb.from("businesses").select("id,vat_registered,default_expiry_days").single();
  if (!d || !biz) redirect("/app/documents");
  const { data: src } = await sb.from("document_lines").select("description,quantity,unit_price_cents,line_total_cents,sort_order,option_key").eq("document_id", id).order("sort_order");
  const { data: n, error: nErr } = await sb.rpc("next_document_number", { p_business: biz.id, p_type: d.type });
  if (nErr) throw nErr;

  // Line totals are copied exactly (recalculating them can lose a cent). Only VAT is recalculated,
  // so a copy always follows the business's current VAT status.
  const rows = (src ?? []).map((l) => ({ ...l, line_total_cents: Number(l.line_total_cents), option_key: d.type === "quote" && d.has_options ? l.option_key : null }));
  const keepOptions = d.type === "quote" && Boolean(d.has_options);
  const subtotal = keepOptions ? lowestSubtotal(rows) : rows.reduce((a, l) => a + l.line_total_cents, 0);
  const vatPercent = biz.vat_registered ? 15 : 0;
  const vat = Math.round((subtotal * vatPercent) / 100);
  const termDays = /\d+/.test(d.payment_terms ?? "") ? parseInt(String(d.payment_terms).match(/\d+/)![0], 10) : 0;

  const { data: copy, error } = await sb.from("documents").insert({
    business_id: d.business_id, client_id: d.client_id, type: d.type, seq: n[0].doc_seq, number: n[0].doc_number, status: "draft",
    title: d.title, description: d.description, location: d.location, job_date: null, job_date_tbd: d.job_date_tbd, labour_only: d.labour_only,
    expiry_date: d.type === "quote" ? addDays(biz.default_expiry_days) : null,
    due_date: d.type === "invoice" ? addDays(termDays) : null,
    has_options: keepOptions,
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


// Puts a declined quote back to "sent" so the client can accept it again.
export async function reopenQuote(fd: FormData) {
  const id = String(fd.get("id"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const sb = await createClient();
  const { error } = await sb.rpc("owner_reopen_quote", { p_id: id });
  if (error) console.error("[reopen quote]", error.message);
  revalidatePath(`/app/documents/${id}`);
  revalidatePath("/app");
  redirect(`/app/documents/${id}`);
}


// Repeat an invoice on the same day every month. Each time, a draft copy is made and the owner is emailed to review it.
export async function startRecurring(fd: FormData) {
  const id = String(fd.get("id"));
  const day = Math.round(Number(fd.get("day")));
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(day) || day < DAY_MIN || day > DAY_MAX) redirect(`/app/documents/${id}`);
  const sb = await createClient();
  const { data: d } = await sb.from("documents").select("id,business_id,type,status").eq("id", id).maybeSingle();
  if (d?.type === "invoice" && d.status !== "draft") {
    const { data: existing } = await sb.from("recurring_invoices").select("id").eq("source_document_id", id).eq("active", true).maybeSingle();
    if (!existing) {
      const { error } = await sb.from("recurring_invoices").insert({ business_id: d.business_id, source_document_id: id, day_of_month: day, next_run: firstRun(southAfricaDate(), day) });
      if (error) console.error("[recurring] could not start:", error.message);
    }
  }
  revalidatePath(`/app/documents/${id}`);
  redirect(`/app/documents/${id}`);
}

export async function stopRecurring(fd: FormData) {
  const id = String(fd.get("id"));
  const docId = String(fd.get("document"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/app/documents");
  const sb = await createClient();
  await sb.from("recurring_invoices").update({ active: false }).eq("id", id);
  revalidatePath(`/app/documents/${docId}`);
  redirect(`/app/documents/${docId}`);
}

export async function deletePhoto(fd: FormData) {
  const id = String(fd.get("id"));
  const docId = String(fd.get("document"));
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(docId)) redirect("/app/documents");
  const sb = await createClient();
  const { data: row } = await sb.from("document_photos").select("path").eq("id", id).maybeSingle(); // only the owner sees it
  if (row) {
    await sb.from("document_photos").delete().eq("id", id);
    try { await createAdminClient().storage.from("quote-photos").remove([row.path]); } catch (e) { console.error("[photos] could not remove the file:", e); }
  }
  revalidatePath(`/app/documents/${docId}`);
  redirect(`/app/documents/${docId}#photos`);
}
