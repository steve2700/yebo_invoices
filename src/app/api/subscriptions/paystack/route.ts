import { createAdminClient } from "@/lib/supabase/admin";
import { paystackConfig, signatureOk, verifyPaystack } from "@/lib/paystack";
import { recordPaystackCharge, recordPaystackSubscription } from "@/lib/paystack-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ok = () => new Response("OK", { status: 200 });
const reject = (reason: string) => { console.error(`[paystack] webhook rejected: ${reason}`); return new Response("Invalid request", { status: 400 }); };
const retryLater = (reason: string) => { console.error(`[paystack] webhook will be retried: ${reason}`); return new Response("Temporarily unavailable", { status: 503 }); };

// Paystack calls this for every payment and subscription event. Nothing is changed unless the signature is genuine,
// and a payment is only counted after we ask Paystack itself to confirm it.
export async function POST(request: Request) {
  const raw = await request.text();
  if (!raw || raw.length > 200_000) return reject("empty or oversized body");
  const cfg = paystackConfig();
  if (!cfg) return retryLater("Paystack is not set up on the server");
  if (!signatureOk(cfg, raw, request.headers.get("x-paystack-signature"))) return reject("signature does not match");

  let event: { event?: string; data?: Record<string, unknown> };
  try { event = JSON.parse(raw); } catch { return reject("not JSON"); }
  const d = (event.data ?? {}) as Record<string, any>;

  let admin: ReturnType<typeof createAdminClient>;
  try { admin = createAdminClient(); } catch { return retryLater("admin client unavailable"); }

  switch (event.event) {
    case "charge.success": {
      const tx = await verifyPaystack(cfg, String(d.reference ?? ""));
      if (!tx) return retryLater("could not confirm the payment with Paystack");
      const res = await recordPaystackCharge(admin, cfg, tx);
      if (res.ok) return ok();
      return res.retry ? retryLater(res.reason) : (console.error(`[paystack] charge ignored: ${res.reason}`), ok());
    }
    case "subscription.create": {
      const res = await recordPaystackSubscription(admin, cfg, d);
      if (res.ok) return ok();
      return res.retry ? retryLater(res.reason ?? "") : (console.error(`[paystack] subscription ignored: ${res.reason}`), ok());
    }
    case "invoice.payment_failed": {
      const customer = d.customer?.customer_code ?? d.subscription?.customer?.customer_code;
      if (customer) await admin.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("ps_customer_code", customer).eq("status", "active");
      return ok();
    }
    case "subscription.disable":
    case "subscription.not_renew": {
      const code = d.subscription_code;
      // Only the subscription we currently hold counts, so stopping an OLD plan after a switch never cancels the new one.
      if (code) await admin.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("ps_subscription_code", code).neq("status", "cancelled");
      return ok();
    }
    default:
      return ok();
  }
}
