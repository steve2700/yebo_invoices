import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { formatDate, waLink } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";
import {
  amountToCents,
  checkPayfastIp,
  confirmWithPayfast,
  itnSignature,
  signaturesMatch,
} from "@/lib/payfast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof createAdminClient>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ok = () => new Response("OK", { status: 200 });
const reject = (reason: string, attemptId?: string) => {
  // The reason is logged for you, never sent back to whoever called.
  console.error(`[payfast] notification rejected: ${reason}${attemptId ? ` (attempt ${attemptId})` : ""}`);
  return new Response("Invalid request", { status: 400 });
};

// Makes sure only one request ever sends each notification, even if PayFast repeats itself.
async function claim(admin: Admin, attemptId: string, column: "client_notified_at" | "owner_notified_at") {
  const { data } = await admin
    .from("payment_attempts")
    .update({ [column]: new Date().toISOString() })
    .eq("id", attemptId)
    .is(column, null)
    .select("id");
  return Boolean(data?.length);
}
async function release(admin: Admin, attemptId: string, column: "client_notified_at" | "owner_notified_at") {
  await admin.from("payment_attempts").update({ [column]: null }).eq("id", attemptId);
}

export async function POST(request: Request) {
  // ---- 1. Read the notification exactly as PayFast sent it (the order matters for the signature) ----
  const raw = await request.text();
  if (!raw || raw.length > 10_000) return reject("empty or oversized body");
  const entries = Array.from(new URLSearchParams(raw).entries()) as [string, string][];
  const data = Object.fromEntries(entries) as Record<string, string>;

  const attemptId = data.m_payment_id ?? "";
  if (!UUID.test(attemptId)) return reject("missing or invalid payment reference");

  let admin: Admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    // Returning an error makes PayFast try again later, which is what we want if our setup is broken.
    console.error("[payfast] admin client unavailable:", error);
    return new Response("Temporarily unavailable", { status: 503 });
  }

  // ---- 2. Find the payment attempt, its invoice and the business's PayFast settings ----
  const { data: attempt } = await admin
    .from("payment_attempts")
    .select("id,document_id,amount_cents,status")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return reject("unknown payment attempt", attemptId);

  const { data: document } = await admin
    .from("documents")
    .select("id,number,type,status,total_cents,business_id,client_id,public_token")
    .eq("id", attempt.document_id)
    .maybeSingle();
  if (!document || document.type !== "invoice") return reject("attempt is not for an invoice", attemptId);

  const { data: settings } = await admin
    .from("payfast_settings")
    .select("merchant_id,passphrase,sandbox")
    .eq("business_id", document.business_id)
    .maybeSingle();
  if (!settings) return reject("business has no PayFast settings", attemptId);

  // ---- 3. The security checks. Every one must pass. ----
  if (data.merchant_id !== settings.merchant_id) return reject("merchant id does not match", attemptId);

  const expectedSignature = itnSignature(entries, settings.passphrase);
  if (!data.signature || !signaturesMatch(data.signature, expectedSignature)) {
    return reject("signature does not match", attemptId);
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip");
  const ipCheck = await checkPayfastIp(forwarded);
  if (ipCheck === "no") return reject(`request came from an address that is not PayFast's (${forwarded})`, attemptId);
  if (ipCheck === "unknown") console.warn("[payfast] could not look up PayFast addresses; relying on the other checks.");

  const paidCents = amountToCents(data.amount_gross);
  if (paidCents === null || paidCents !== Number(attempt.amount_cents)) {
    return reject(`amount mismatch (got ${data.amount_gross}, expected ${attempt.amount_cents} cents)`, attemptId);
  }

  if (!(await confirmWithPayfast(entries, settings.sandbox))) {
    return reject("PayFast did not confirm this notification", attemptId);
  }

  // ---- 4. The notification is genuine. Act on the payment status. ----
  const status = (data.payment_status ?? "").toUpperCase();

  if (status === "FAILED" || status === "CANCELLED") {
    await admin
      .from("payment_attempts")
      .update({ status: status === "FAILED" ? "failed" : "cancelled", pf_payment_id: data.pf_payment_id ?? null })
      .eq("id", attemptId)
      .eq("status", "pending");
    return ok();
  }
  if (status !== "COMPLETE") return ok(); // PENDING or anything else: wait for the final notification.

  const pfPaymentId = (data.pf_payment_id ?? "").trim();
  if (!pfPaymentId) return reject("complete payment without a PayFast payment id", attemptId);

  // ---- 5. Record the payment exactly once. payments has a unique rule on (method, provider_reference). ----
  const { error: insertError } = await admin.from("payments").insert({
    document_id: document.id,
    amount_cents: paidCents,
    method: "payfast",
    provider_reference: pfPaymentId,
  });
  const alreadyRecorded = insertError?.code === "23505"; // a repeat of a notification we already handled
  if (insertError && !alreadyRecorded) {
    console.error("[payfast] could not record payment:", insertError);
    return new Response("Temporarily unavailable", { status: 503 }); // PayFast will retry
  }

  // These steps are safe to repeat, so a retry also repairs a half-finished earlier attempt.
  await admin
    .from("payment_attempts")
    .update({ status: "complete", pf_payment_id: pfPaymentId, completed_at: new Date().toISOString() })
    .eq("id", attemptId)
    .neq("status", "complete");

  const { data: allPayments } = await admin.from("payments").select("amount_cents").eq("document_id", document.id);
  const totalPaid = (allPayments ?? []).reduce((sum, payment) => sum + Number(payment.amount_cents), 0);
  const fullyPaid = totalPaid >= Number(document.total_cents);
  const alreadyPaidBefore = totalPaid - paidCents >= Number(document.total_cents);
  const newStatus = fullyPaid ? "paid" : "partially_paid";
  if (document.status !== newStatus) {
    await admin.from("documents").update({ status: newStatus }).eq("id", document.id);
  }

  if (!alreadyRecorded) {
    const { error: eventError } = await admin.from("events").insert({ document_id: document.id, type: "paid" });
    if (eventError) console.error("[payfast] could not record paid event:", eventError);
  }

  // ---- 6. Tell the client and the business owner (each at most once). ----
  await notifyEveryone({ admin, attemptId, document, paidCents, fullyPaid, alreadyPaidBefore, data });
  return ok();
}

type NotifyInput = {
  admin: Admin;
  attemptId: string;
  document: { id: string; number: string; business_id: string; client_id: string; public_token: string };
  paidCents: number;
  fullyPaid: boolean;
  alreadyPaidBefore: boolean;
  data: Record<string, string>;
};

async function notifyEveryone({ admin, attemptId, document, paidCents, fullyPaid, alreadyPaidBefore, data }: NotifyInput) {
  const [{ data: business }, { data: client }] = await Promise.all([
    admin.from("businesses").select("name,email,brand_color,owner_id").eq("id", document.business_id).maybeSingle(),
    admin.from("clients").select("name,email,whatsapp_number").eq("id", document.client_id).maybeSingle(),
  ]);
  if (!business) return;

  const base = appUrl();
  const businessName = business.name ?? "Yebo Invoices";
  const amount = formatRand(paidCents);
  const today = formatDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date()));
  const replyTo = isEmail(business.email) ? business.email.trim() : null;

  // ---- The client's receipt ----
  if (isEmail(client?.email) && (await claim(admin, attemptId, "client_notified_at"))) {
    const sent = await sendEmail({
      to: client.email.trim(),
      fromName: businessName,
      replyTo,
      idempotencyKey: `payment-client/${attemptId}`,
      subject: `Payment received: invoice ${document.number}`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: "Thank you. Your payment has been received.",
        intro: `Hi ${greetingName(client.name)}, ${businessName} has received your payment. Here are the details for your records.`,
        rows: [
          ["Amount paid", amount],
          ["Invoice", document.number],
          ["Paid on", today],
          ["Paid with", "Online payment (PayFast)"],
          ["Status", fullyPaid ? "Paid in full" : "Part payment received"],
        ],
        buttonLabel: "View your receipt",
        buttonUrl: `${base}/d/${document.public_token}`,
        footer: replyTo ? `Questions? Just reply to this email and it will reach ${businessName}.` : null,
      }),
    });
    if (!sent) await release(admin, attemptId, "client_notified_at");
  }

  // ---- The business owner's alert ----
  let ownerEmail: string | null = isEmail(business.email) ? business.email.trim() : null;
  if (!ownerEmail && business.owner_id) {
    const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
    ownerEmail = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
  }
  if (ownerEmail && (await claim(admin, attemptId, "owner_notified_at"))) {
    const feeCents = amountToCents(data.amount_fee);
    const netCents = amountToCents(data.amount_net);
    const rows: [string, string][] = [
      ["Client", client?.name ?? "Your client"],
      ["Invoice", document.number],
      ["Amount paid", amount],
    ];
    if (feeCents !== null && netCents !== null) {
      rows.push(["PayFast fee", formatRand(Math.abs(feeCents))], ["Goes to your PayFast account", formatRand(netCents)]);
    }
    rows.push(["Invoice status", fullyPaid ? "Paid in full" : "Part payment received"]);

    const thanks = `Hi ${greetingName(client?.name)}, thank you for your payment of ${amount} for invoice ${document.number}. We've received it and really appreciate it! Your receipt: ${base}/d/${document.public_token}`;
    const sent = await sendEmail({
      to: ownerEmail,
      fromName: "Yebo Invoices",
      idempotencyKey: `payment-owner/${attemptId}`,
      subject: `You've been paid ${amount} by ${client?.name ?? "a client"}`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: `You've been paid ${amount}`,
        intro: `${client?.name ?? "Your client"} paid invoice ${document.number} online. The invoice has been updated automatically.`,
        rows,
        note: alreadyPaidBefore
          ? "Heads up: this invoice was already fully paid before this payment arrived, so the client may have paid twice. You may want to refund one payment in your PayFast account."
          : null,
        buttonLabel: "View invoice",
        buttonUrl: `${base}/app/documents/${document.id}`,
        secondaryButtonLabel: `Thank ${greetingName(client?.name)} on WhatsApp`,
        secondaryButtonUrl: waLink(client?.whatsapp_number ?? null, thanks),
        footer: "The money is paid out by PayFast to your PayFast account. Yebo never holds it.",
      }),
    });
    if (!sent) await release(admin, attemptId, "owner_notified_at");
  }
}
