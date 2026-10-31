import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { waLink } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { depositCents } from "@/lib/deposit";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";

type Admin = ReturnType<typeof createAdminClient>;
const DAY = 86400000;

// The two nudges are separate on purpose. "No payment recorded" does not mean "not paid": a client who paid by EFT and tapped
// "I have paid" is waiting for the OWNER to record it, so they are never nudged. Only a client with no payment and no claim is.

// Deposit not paid: the client gets a friendly email 2 days and 5 days after saying yes, then it stops.
export async function runDepositNudges(admin: Admin, now: Date = new Date()): Promise<{ sent: number }> {
  const { data: docs, error } = await admin.from("documents")
    .select("id,number,total_cents,payment_plan,deposit_percent,public_token,business_id,client_id,deposit_nudge_count,deposit_nudged_at")
    .eq("type", "quote").eq("status", "accepted").in("payment_plan", ["deposit", "full"]).lt("deposit_nudge_count", 2).limit(300);
  if (error || !docs?.length) return { sent: 0 };

  let sent = 0;
  for (const doc of docs) {
    if (sent >= 60) break;
    const due = depositCents(doc);
    if (due <= 0) continue;
    const [{ data: accepted }, { data: claim }, { data: pays }] = await Promise.all([
      admin.from("events").select("created_at").eq("document_id", doc.id).eq("type", "accepted").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("events").select("id").eq("document_id", doc.id).eq("type", "deposit_claimed").limit(1),
      admin.from("payments").select("amount_cents").eq("document_id", doc.id),
    ]);
    if (!accepted || claim?.length) continue;
    if ((pays ?? []).reduce((a, p) => a + Number(p.amount_cents), 0) >= due) continue;
    const days = (now.getTime() - new Date(accepted.created_at).getTime()) / DAY;
    const n = doc.deposit_nudge_count ?? 0;
    if (days > 30) continue;
    if (days < (n === 0 ? 2 : 5)) continue;
    if (doc.deposit_nudged_at && now.getTime() - new Date(doc.deposit_nudged_at).getTime() < 2 * DAY) continue;

    const [{ data: business }, { data: client }] = await Promise.all([
      admin.from("businesses").select("name,email,brand_color,bank_name,bank_account_holder,bank_account_number,bank_branch_code,bank_account_type").eq("id", doc.business_id).maybeSingle(),
      admin.from("clients").select("name,email").eq("id", doc.client_id).maybeSingle(),
    ]);
    if (!business || !isEmail(client?.email)) continue;
    const first = greetingName(client.name);
    const rows: [string, string][] = [["Quote", doc.number], ["Deposit due", formatRand(due)]];
    if (business.bank_account_holder && business.bank_account_number && business.bank_branch_code) {
      rows.push(["Account holder", business.bank_account_holder], ["Bank", `${business.bank_name ?? ""} ${business.bank_account_type ?? ""}`.trim() || "-"],
        ["Account number", business.bank_account_number], ["Branch code", business.bank_branch_code], ["Reference", doc.number]);
    }
    const ok = await sendEmail({
      to: client.email.trim(), fromName: business.name, replyTo: isEmail(business.email) ? business.email.trim() : null,
      idempotencyKey: `deposit-nudge/${doc.id}/${n + 1}`,
      subject: n === 0 ? `Your deposit for quote ${doc.number}` : `Still want to go ahead with quote ${doc.number}?`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: n === 0 ? "One more step to lock in your date" : "Your booking is not confirmed yet",
        intro: n === 0
          ? `Hi ${first}, thank you for accepting quote ${doc.number}. The deposit of ${formatRand(due)} confirms your booking with ${business.name}. You can pay online or by EFT.`
          : `Hi ${first}, ${business.name} is holding your spot, but the booking is only confirmed once the ${formatRand(due)} deposit is in. If something has changed, just reply to this email and we will sort it out.`,
        rows, buttonLabel: "Pay the deposit", buttonUrl: `${appUrl()}/d/${doc.public_token}`,
        footer: "Already paid by EFT? Open the quote and tap \"I have paid the deposit\" so we can confirm it.",
      }),
    });
    if (ok) {
      await admin.from("documents").update({ deposit_nudge_count: n + 1, deposit_nudged_at: now.toISOString() }).eq("id", doc.id);
      sent++;
    }
  }
  return { sent };
}

// Accepted but no invoice 3 days later: the owner gets one email. The deposit does not matter here, the job still needs invoicing.
export async function runInvoiceNudges(admin: Admin, now: Date = new Date()): Promise<{ sent: number }> {
  const { data: docs, error } = await admin.from("documents")
    .select("id,number,total_cents,business_id,client_id").eq("type", "quote").eq("status", "accepted").is("invoice_nudge_sent_at", null).limit(300);
  if (error || !docs?.length) return { sent: 0 };

  let sent = 0;
  for (const doc of docs) {
    if (sent >= 40) break;
    const { data: accepted } = await admin.from("events").select("created_at").eq("document_id", doc.id).eq("type", "accepted").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!accepted) continue;
    const days = Math.floor((now.getTime() - new Date(accepted.created_at).getTime()) / DAY);
    if (days < 3) continue;
    if (days > 60) { await admin.from("documents").update({ invoice_nudge_sent_at: now.toISOString() }).eq("id", doc.id); continue; }
    const { count } = await admin.from("documents").select("id", { count: "exact", head: true }).eq("source_quote_id", doc.id);
    if ((count ?? 0) > 0) { await admin.from("documents").update({ invoice_nudge_sent_at: now.toISOString() }).eq("id", doc.id); continue; }

    const [{ data: business }, { data: client }] = await Promise.all([
      admin.from("businesses").select("name,email,owner_id,brand_color").eq("id", doc.business_id).maybeSingle(),
      admin.from("clients").select("name,whatsapp_number").eq("id", doc.client_id).maybeSingle(),
    ]);
    if (!business) continue;
    let to = isEmail(business.email) ? business.email.trim() : "";
    if (!to && business.owner_id) { const { data: o } = await admin.auth.admin.getUserById(business.owner_id); to = o?.user?.email ?? ""; }
    if (!to) continue;
    const name = client?.name ?? "Your client";
    const first = greetingName(client?.name);
    const ok = await sendEmail({
      to, fromName: "Yebo Invoices", idempotencyKey: `invoice-nudge/${doc.id}`,
      subject: `${name} said yes ${days} days ago. Send the invoice`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: `${name} said yes ${days} days ago`,
        intro: `Quote ${doc.number} was accepted and has no invoice yet. Invoicing now keeps the job moving and the money coming.`,
        rows: [["Client", name], ["Quote", doc.number], ["Total", formatRand(Number(doc.total_cents))]],
        buttonLabel: "Create the invoice", buttonUrl: `${appUrl()}/app/documents/${doc.id}`,
        secondaryButtonLabel: `Message ${first} on WhatsApp`,
        secondaryButtonUrl: waLink(client?.whatsapp_number ?? null, `Hi ${first}, thanks again for accepting quote ${doc.number}. I am getting everything ready for you.`),
        footer: "You will only get this once for this quote.",
      }),
    });
    if (ok) { await admin.from("documents").update({ invoice_nudge_sent_at: now.toISOString() }).eq("id", doc.id); sent++; }
  }
  return { sent };
}
