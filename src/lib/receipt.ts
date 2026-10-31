import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { greetingName } from "@/lib/names";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { formatDate } from "@/lib/dates";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";

const METHODS: Record<string, string> = { eft: "EFT", cash: "Cash", payfast: "Online payment" };

// Emails the client a receipt when the owner records a payment, so nobody has to ask "did you get my money?".
// It never throws: a failed email must never undo or block recording the payment.
export async function sendPaymentReceipt(documentId: string, amountCents: number, method: string, paymentKey: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: doc } = await admin
      .from("documents")
      .select("id,number,type,total_cents,public_token,business_id,client_id,job_date,job_date_tbd")
      .eq("id", documentId)
      .maybeSingle();
    if (!doc) return;
    const [{ data: business }, { data: client }, { data: pays }] = await Promise.all([
      admin.from("businesses").select("name,email,brand_color,google_reviews_url").eq("id", doc.business_id).maybeSingle(),
      admin.from("clients").select("name,email").eq("id", doc.client_id).maybeSingle(),
      admin.from("payments").select("amount_cents").eq("document_id", doc.id),
    ]);
    if (!business || !isEmail(client?.email)) return;
    const paid = (pays ?? []).reduce((sum, p) => sum + Number(p.amount_cents), 0);
    const isQuote = doc.type === "quote";
    const remaining = Math.max(Number(doc.total_cents) - paid, 0);
    const businessName = business.name ?? "Your service provider";
    const replyTo = isEmail(business.email) ? business.email.trim() : null;
    const rows: [string, string][] = [
      [isQuote ? "Quote" : "Invoice", doc.number],
      ["Amount received", formatRand(amountCents)],
      ["Paid by", METHODS[method] ?? "Payment"],
      ["Received on", formatSouthAfricaDateTime(new Date().toISOString())],
    ];
    if (!isQuote) rows.push(["Balance still due", remaining > 0 ? formatRand(remaining) : "Nothing. Paid in full"]);
    await sendEmail({
      to: client.email.trim(),
      fromName: businessName,
      replyTo,
      idempotencyKey: `receipt/${doc.id}/${paymentKey}`,
      subject: `Receipt: ${formatRand(amountCents)} received by ${businessName}`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: "Payment received. Thank you!",
        intro: `Hi ${greetingName(client?.name)}, ${businessName} has received your ${isQuote ? "deposit" : "payment"} for ${isQuote ? "quote" : "invoice"} ${doc.number}. Keep this email as your receipt.${isQuote ? ` What happens next: ${businessName} will contact you to agree the date${doc.job_date && !doc.job_date_tbd ? ` (pencilled in for ${formatDate(doc.job_date)})` : ""}, the job gets done, and then you receive the invoice${remaining > 0 ? ` for the balance of ${formatRand(remaining)}` : ""}.` : ""}`,
        rows,
        buttonLabel: "View it online",
        buttonUrl: `${appUrl()}/d/${doc.public_token}`,
        // A happy, fully paid customer is the best moment to ask for a Google review.
        ...(!isQuote && remaining <= 0 && /^https:\/\//.test(business.google_reviews_url ?? "")
          ? { secondaryButtonLabel: "Happy with our work? Leave a quick review", secondaryButtonUrl: business.google_reviews_url as string }
          : {}),
        footer: replyTo ? `Questions? Just reply to this email and it will reach ${businessName}.` : null,
      }),
    });
  } catch (error) {
    console.error("[receipt] could not send the receipt:", error);
  }
}
