import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { buildPayfastCheckout, MIN_ONLINE_PAYMENT_CENTS } from "@/lib/payfast";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["sent", "viewed", "partially_paid"];
const MAX_ATTEMPTS_PER_10_MINUTES = 5;

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const pageStyle = "font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f8f6;color:#10241b;padding:24px;box-sizing:border-box";

function messagePage(title: string, message: string, status: number, backHref?: string) {
  const back = backHref
    ? `<p style="margin-top:20px"><a href="${escapeHtml(backHref)}" style="color:#0f8a5f;font-weight:700">Back to your invoice</a></p>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="${pageStyle}"><main style="max-width:420px;text-align:center"><h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(title)}</h1><p style="line-height:1.6;color:#44574e;margin:0">${escapeHtml(message)}</p>${back}</main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// Called when a client taps "Pay now" on the public invoice page. It sends them to PayFast with a signed form.
// It is a POST (not a link) so browsers and link scanners can never start a payment by just visiting the address.
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(token)) {
    return messagePage("Page not found", "We could not find that invoice.", 404);
  }
  const back = `/d/${token}`;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[payfast] admin client unavailable:", error);
    return messagePage("Online payment is unavailable", "Please use the bank details on the invoice, or contact the business.", 503, back);
  }

  const { data: document } = await admin
    .from("documents")
    .select("id,number,type,status,total_cents,business_id")
    .eq("public_token", token)
    .maybeSingle();
  if (!document || document.status === "draft") {
    return messagePage("Page not found", "We could not find that invoice.", 404);
  }
  if (document.type !== "invoice" || !OPEN_STATUSES.includes(document.status)) {
    return messagePage("Nothing to pay", "This invoice is not waiting for payment.", 409, back);
  }

  const { data: payments } = await admin.from("payments").select("amount_cents").eq("document_id", document.id);
  const paidCents = (payments ?? []).reduce((total, payment) => total + Number(payment.amount_cents), 0);
  const balanceCents = Math.max(Number(document.total_cents) - paidCents, 0);
  if (balanceCents <= 0) {
    return messagePage("Already paid", "This invoice has been paid in full. Thank you!", 409, back);
  }
  if (balanceCents < MIN_ONLINE_PAYMENT_CENTS) {
    return messagePage("Amount too small for online payment", "Please use the bank details on the invoice for this amount.", 409, back);
  }

  const [{ data: settings }, { data: business }] = await Promise.all([
    admin.from("payfast_settings").select("merchant_id,merchant_key,passphrase,sandbox,enabled").eq("business_id", document.business_id).maybeSingle(),
    admin.from("businesses").select("name").eq("id", document.business_id).maybeSingle(),
  ]);
  if (!settings || !settings.enabled) {
    return messagePage("Online payment is not available", "Please use the bank details on the invoice, or contact the business.", 409, back);
  }

  // A little protection against someone hammering the button.
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentAttempts } = await admin
    .from("payment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("document_id", document.id)
    .gte("created_at", tenMinutesAgo);
  if ((recentAttempts ?? 0) >= MAX_ATTEMPTS_PER_10_MINUTES) {
    return messagePage("Please wait a moment", "There have been a lot of payment attempts on this invoice. Please try again in a few minutes.", 429, back);
  }

  const { data: attempt, error: attemptError } = await admin
    .from("payment_attempts")
    .insert({ document_id: document.id, amount_cents: balanceCents })
    .select("id")
    .single();
  if (attemptError || !attempt) {
    console.error("[payfast] could not create payment attempt:", attemptError);
    return messagePage("Something went wrong", "We could not start your payment. Please try again.", 500, back);
  }

  const base = appUrl();
  const checkout = buildPayfastCheckout({
    merchantId: settings.merchant_id,
    merchantKey: settings.merchant_key,
    passphrase: settings.passphrase,
    sandbox: settings.sandbox,
    returnUrl: `${base}/d/${token}/paid`,
    cancelUrl: `${base}/d/${token}?payment=cancelled`,
    notifyUrl: `${base}/api/payfast/notify`,
    paymentId: attempt.id,
    amountCents: balanceCents,
    itemName: `Invoice ${document.number}`,
    itemDescription: `Payment to ${business?.name ?? "the business"}`,
  });

  const inputs = checkout.fields
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>Taking you to PayFast</title></head><body style="${pageStyle}"><form id="pf" method="post" action="${escapeHtml(checkout.action)}" style="max-width:420px;text-align:center"><p style="font-size:18px;font-weight:700;margin:0 0 8px">Taking you to PayFast to pay securely…</p><p style="color:#44574e;margin:0 0 16px">You will come straight back here when you are done.</p>${inputs}<button type="submit" style="min-height:44px;border:0;border-radius:12px;background:#0f8a5f;color:#fff;font-weight:700;padding:0 20px;font-size:16px;cursor:pointer">Continue to PayFast</button></form><script>document.getElementById("pf").submit();</script></body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
