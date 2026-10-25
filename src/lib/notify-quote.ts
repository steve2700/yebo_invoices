import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { waLink } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";

// Tells the business owner by email when a client accepts or declines a quote, so they are never left
// wondering. It runs on the server after the client taps the button, and it never throws: a failed email
// must never stop the client's answer from being saved.
export async function notifyQuoteAnswered(token: string, answer: "accepted" | "declined", reason?: string): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: document } = await admin
      .from("documents")
      .select("id,number,type,status,total_cents,business_id,client_id,payment_plan,deposit_percent")
      .eq("public_token", token)
      .maybeSingle();
    if (!document || document.type !== "quote" || document.status !== answer) return;

    // Only email for an answer that has just been recorded, so a repeat tap or an old quote never re-sends.
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("events")
      .select("id")
      .eq("document_id", document.id)
      .eq("type", answer)
      .gte("created_at", since)
      .limit(1);
    if (!recent?.length) return;

    const [{ data: business }, { data: client }] = await Promise.all([
      admin.from("businesses").select("name,email,brand_color,owner_id").eq("id", document.business_id).maybeSingle(),
      admin.from("clients").select("name,whatsapp_number").eq("id", document.client_id).maybeSingle(),
    ]);
    if (!business) return;

    // Send to the business email, or fall back to the email the owner signed up with.
    let ownerEmail: string | null = isEmail(business.email) ? business.email.trim() : null;
    if (!ownerEmail && business.owner_id) {
      const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
      ownerEmail = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
    }
    if (!ownerEmail) return;

    const base = appUrl();
    const clientName = client?.name ?? "Your client";
    const firstName = greetingName(client?.name);
    const total = formatRand(Number(document.total_cents));
    const documentLink = `${base}/app/documents/${document.id}`;

    const paymentSummary =
      document.payment_plan === "deposit" && document.deposit_percent
        ? `${document.deposit_percent}% deposit (${formatRand(Math.round((Number(document.total_cents) * document.deposit_percent) / 100))})`
        : document.payment_plan === "full"
          ? "Full payment upfront"
          : "Payment after the job";

    if (answer === "accepted") {
      await sendEmail({
        to: ownerEmail,
        fromName: "Yebo Invoices",
        idempotencyKey: `quote-accepted/${document.id}`,
        subject: `Quote accepted: ${clientName} said yes to ${document.number}`,
        html: renderEmail({
          brandColor: business.brand_color,
          heading: `${clientName} accepted your quote`,
          intro: `Great news. ${clientName} has accepted quote ${document.number}. You can invoice it whenever you are ready.`,
          rows: [
            ["Client", clientName],
            ["Quote", document.number],
            ["Total", total],
            ["Payment terms", paymentSummary],
          ],
          buttonLabel: "Create the invoice",
          buttonUrl: documentLink,
          secondaryButtonLabel: `Message ${firstName} on WhatsApp`,
          secondaryButtonUrl: waLink(
            client?.whatsapp_number ?? null,
            `Hi ${firstName}, thank you for accepting quote ${document.number}! I'll be in touch shortly about the next steps.`,
          ),
          footer: "Open the quote and tap \"Create invoice from this quote\" to send the invoice.",
        }),
      });
    } else {
      await sendEmail({
        to: ownerEmail,
        fromName: "Yebo Invoices",
        idempotencyKey: `quote-declined/${document.id}`,
        subject: `Quote declined: ${clientName} passed on ${document.number}`,
        html: renderEmail({
          brandColor: business.brand_color,
          heading: `${clientName} declined your quote`,
          intro: `${clientName} has declined quote ${document.number}. A friendly follow-up can sometimes turn a no into a yes, for example by offering a small change.`,
          rows: [
            ["Client", clientName],
            ["Quote", document.number],
            ["Total", total],
            ...(reason ? ([["Reason given", reason]] as [string, string][]) : []),
          ],
          buttonLabel: "View the quote",
          buttonUrl: documentLink,
          secondaryButtonLabel: `Ask ${firstName} what would help`,
          secondaryButtonUrl: waLink(
            client?.whatsapp_number ?? null,
            `Hi ${firstName}, thanks for looking at quote ${document.number}. If there is anything you would like changed, just let me know and I will gladly update it.`,
          ),
          footer: null,
        }),
      });
    }
  } catch (error) {
    console.error("[quote-answer] could not notify the owner:", error);
  }
}


// Tells the owner by email that the client says they have paid the deposit by EFT, so they can check their bank.
export async function notifyDepositClaimed(token: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: document } = await admin
      .from("documents")
      .select("id,number,type,status,total_cents,business_id,client_id,payment_plan,deposit_percent")
      .eq("public_token", token)
      .maybeSingle();
    if (!document || document.type !== "quote" || document.status !== "accepted") return;

    const [{ data: business }, { data: client }] = await Promise.all([
      admin.from("businesses").select("name,email,brand_color,owner_id").eq("id", document.business_id).maybeSingle(),
      admin.from("clients").select("name,whatsapp_number").eq("id", document.client_id).maybeSingle(),
    ]);
    if (!business) return;
    let ownerEmail: string | null = isEmail(business.email) ? business.email.trim() : null;
    if (!ownerEmail && business.owner_id) {
      const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
      ownerEmail = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
    }
    if (!ownerEmail) return;

    const deposit = document.payment_plan === "full"
      ? Number(document.total_cents)
      : Math.round((Number(document.total_cents) * Number(document.deposit_percent ?? 0)) / 100);
    const clientName = client?.name ?? "Your client";
    const firstName = greetingName(client?.name);
    await sendEmail({
      to: ownerEmail,
      fromName: "Yebo Invoices",
      idempotencyKey: `deposit-claimed/${document.id}/${new Date().toISOString().slice(0, 15)}`,
      subject: `${clientName} says they have paid the ${formatRand(deposit)} deposit`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: `${clientName} says the deposit is paid`,
        intro: `${clientName} tapped "I've paid the deposit" on quote ${document.number}. Please check your bank account before you confirm the booking.`,
        rows: [
          ["Client", clientName],
          ["Quote", document.number],
          ["Deposit", formatRand(deposit)],
          ["Payment reference", document.number],
        ],
        buttonLabel: "Open the quote and confirm",
        buttonUrl: `${appUrl()}/app/documents/${document.id}`,
        secondaryButtonLabel: `Message ${firstName} on WhatsApp`,
        secondaryButtonUrl: waLink(client?.whatsapp_number ?? null, `Hi ${firstName}, thank you! I'll check for the deposit for quote ${document.number} and confirm your booking shortly.`),
        footer: "Once the money has reached your account, open the quote and tap \"Deposit received\". Yebo never holds your money.",
      }),
    });
  } catch (error) {
    console.error("[deposit-claim] could not notify the owner:", error);
  }
}


// Tells the owner by email that the client says they have paid an invoice by EFT, so they can check their bank.
export async function notifyInvoiceClaimed(token: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: document } = await admin
      .from("documents")
      .select("id,number,type,status,total_cents,business_id,client_id")
      .eq("public_token", token)
      .maybeSingle();
    if (!document || document.type !== "invoice" || !["sent", "viewed", "partially_paid"].includes(document.status)) return;

    const [{ data: business }, { data: client }, { data: payments }] = await Promise.all([
      admin.from("businesses").select("name,email,brand_color,owner_id").eq("id", document.business_id).maybeSingle(),
      admin.from("clients").select("name,whatsapp_number").eq("id", document.client_id).maybeSingle(),
      admin.from("payments").select("amount_cents").eq("document_id", document.id),
    ]);
    if (!business) return;
    let ownerEmail: string | null = isEmail(business.email) ? business.email.trim() : null;
    if (!ownerEmail && business.owner_id) {
      const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
      ownerEmail = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
    }
    if (!ownerEmail) return;

    const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_cents), 0);
    const balance = Math.max(Number(document.total_cents) - paid, 0);
    const clientName = client?.name ?? "Your client";
    const firstName = greetingName(client?.name);
    await sendEmail({
      to: ownerEmail,
      fromName: "Yebo Invoices",
      idempotencyKey: `invoice-claimed/${document.id}/${new Date().toISOString().slice(0, 15)}`,
      subject: `${clientName} says they have paid ${formatRand(balance)}`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: `${clientName} says invoice ${document.number} is paid`,
        intro: `${clientName} tapped "I have paid by EFT" on invoice ${document.number}. Please check your bank account, then record the payment in Yebo.`,
        rows: [
          ["Client", clientName],
          ["Invoice", document.number],
          ["Amount outstanding", formatRand(balance)],
          ["Payment reference", document.number],
        ],
        buttonLabel: "Open the invoice and record payment",
        buttonUrl: `${appUrl()}/app/documents/${document.id}`,
        secondaryButtonLabel: `Message ${firstName} on WhatsApp`,
        secondaryButtonUrl: waLink(client?.whatsapp_number ?? null, `Hi ${firstName}, thank you! I'll check for your payment for invoice ${document.number} and confirm shortly.`),
        footer: "Bank transfers can take a day to show. Once the money is in your account, record it on the invoice. Yebo never holds your money.",
      }),
    });
  } catch (error) {
    console.error("[invoice-claim] could not notify the owner:", error);
  }
}
