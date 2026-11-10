import { createAdminClient } from "@/lib/supabase/admin";
import { yeboPayfast } from "@/lib/billing-config";
import { cancelPayfastSubscription } from "@/lib/payfast";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";
import { PLANS } from "@/lib/plans";
import { disablePaystackSubscription, paystackConfig, planIdFromCode, verifyPaystack, type PaystackConfig, type PaystackTx } from "@/lib/paystack";

type Admin = ReturnType<typeof createAdminClient>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ChargeResult = { ok: true; repeat: boolean; businessId: string } | { ok: false; reason: string; retry: boolean };

async function businessFor(admin: Admin, tx: { metadata: Record<string, unknown>; customerCode: string | null }): Promise<string | null> {
  const fromMeta = tx.metadata.business_id;
  if (typeof fromMeta === "string" && UUID.test(fromMeta)) return fromMeta;
  if (tx.customerCode) {
    const { data } = await admin.from("subscriptions").select("business_id").eq("ps_customer_code", tx.customerCode).maybeSingle();
    if (data?.business_id) return data.business_id as string;
  }
  return null;
}

// A verified, successful Paystack payment (the first one, or a monthly renewal). Safe to call twice for the same payment.
export async function recordPaystackCharge(admin: Admin, cfg: PaystackConfig, tx: PaystackTx): Promise<ChargeResult> {
  if (tx.status !== "success") return { ok: false, reason: `payment status is ${tx.status}`, retry: false };
  const planId = planIdFromCode(cfg, tx.planCode);
  if (!planId) return { ok: false, reason: `payment is not for one of our plans (${tx.planCode})`, retry: false };
  const plan = PLANS[planId];
  if (tx.amountCents !== plan.priceRand * 100) return { ok: false, reason: `amount mismatch (got ${tx.amountCents}, expected ${plan.priceRand * 100} cents)`, retry: false };

  const businessId = await businessFor(admin, tx);
  if (!businessId) return { ok: false, reason: "could not tell which business this payment is for", retry: true };
  const { data: business } = await admin.from("businesses").select("id,name,email,brand_color,owner_id").eq("id", businessId).maybeSingle();
  if (!business) return { ok: false, reason: "unknown business", retry: false };
  const { data: existing } = await admin.from("subscriptions").select("status,plan,provider,pf_token,started_at").eq("business_id", businessId).maybeSingle();

  const { error: insertError } = await admin.from("subscription_payments").insert({ business_id: businessId, pf_payment_id: `ps_${tx.reference}`, plan: planId, amount_cents: tx.amountCents });
  const repeat = insertError?.code === "23505";
  if (insertError && !repeat) { console.error("[paystack] could not record payment:", insertError); return { ok: false, reason: "could not record payment", retry: true }; }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(periodEnd.getDate() + 3); // one month plus 3 spare days in case a renewal is a little late
  const { error: updateError } = await admin.from("subscriptions").upsert({
    business_id: businessId, status: "active", plan: planId, provider: "paystack",
    ps_customer_code: tx.customerCode, started_at: existing?.started_at ?? now.toISOString(),
    current_period_end: periodEnd.toISOString(), cancelled_at: null, updated_at: now.toISOString(),
  }, { onConflict: "business_id" });
  if (updateError) { console.error("[paystack] could not switch the plan on:", updateError); return { ok: false, reason: "could not switch the plan on", retry: true }; }

  // Moving from PayFast to Paystack: stop the old PayFast charge so nobody pays twice.
  if (existing?.pf_token && existing.provider !== "paystack") {
    const pf = yeboPayfast();
    const stopped = pf ? await cancelPayfastSubscription(existing.pf_token, pf) : false;
    if (!stopped) console.error(`[paystack] business ${businessId} moved to Paystack but the PayFast subscription ${existing.pf_token} could not be cancelled automatically. Cancel it in PayFast.`);
  }

  const isNewPlan = !repeat && (!existing || existing.status !== "active" || existing.plan !== planId || existing.provider !== "paystack");
  if (isNewPlan) {
    let to: string | null = isEmail(business.email) ? business.email.trim() : null;
    if (!to && business.owner_id) {
      const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
      to = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
    }
    if (to) {
      await sendEmail({
        to, fromName: "Yebo Invoices", idempotencyKey: `subscription-welcome/ps_${tx.reference}`, subject: `You are on ${plan.name}`,
        html: renderEmail({
          brandColor: business.brand_color, heading: `Welcome to ${plan.name}`,
          intro: "Thank you. We have received your first payment, and your plan is switched on. You can cancel at any time in Settings, and you keep access until the end of the month you have paid for.",
          rows: [["Plan", plan.name], ["Price", `${formatRand(plan.priceRand * 100)} per month`]],
          buttonLabel: "Make a quote", buttonUrl: `${appUrl()}/app/quotes/new`, footer: null,
        }),
      });
    }
  }
  return { ok: true, repeat, businessId };
}

// Paystack's "subscription.create": we now know the subscription code and the token needed to cancel it later.
export async function recordPaystackSubscription(admin: Admin, cfg: PaystackConfig, d: { subscription_code?: string; email_token?: string; customer?: { customer_code?: string } }): Promise<{ ok: boolean; retry: boolean; reason?: string }> {
  const code = d.subscription_code, token = d.email_token, customer = d.customer?.customer_code;
  if (!code || !token || !customer) return { ok: false, retry: false, reason: "missing subscription details" };
  const { data: row } = await admin.from("subscriptions").select("business_id,ps_subscription_code,ps_email_token").eq("ps_customer_code", customer).maybeSingle();
  if (!row) return { ok: false, retry: true, reason: "no business for this customer yet" }; // the payment notice may arrive a moment later
  const oldCode = row.ps_subscription_code as string | null, oldToken = row.ps_email_token as string | null;
  if (oldCode === code) return { ok: true, retry: false };
  const { error } = await admin.from("subscriptions").update({ ps_subscription_code: code, ps_email_token: token, updated_at: new Date().toISOString() }).eq("business_id", row.business_id);
  if (error) { console.error("[paystack] could not save the subscription code:", error); return { ok: false, retry: true, reason: "could not save" }; }
  // Changing plan starts a new subscription, so stop the old one to avoid being charged twice.
  if (oldCode && oldToken) {
    const stopped = await disablePaystackSubscription(cfg, oldCode, oldToken);
    if (!stopped) console.error(`[paystack] business ${row.business_id} changed plan but the old subscription ${oldCode} could not be cancelled automatically. Cancel it in Paystack.`);
  }
  return { ok: true, retry: false };
}

// The owner comes back from Paystack. Confirm the payment with Paystack right away, so the plan switches on even if the notice is slow.
// Returns whether this signup was part of onboarding. Never throws.
export async function confirmPaystackReturn(reference: string, businessId: string): Promise<{ onboarding: boolean }> {
  try {
    const cfg = paystackConfig();
    if (!cfg) return { onboarding: false };
    const tx = await verifyPaystack(cfg, reference);
    if (!tx || tx.metadata.business_id !== businessId) return { onboarding: false };
    const res = await recordPaystackCharge(createAdminClient(), cfg, tx);
    if (!res.ok) console.error("[paystack] return confirmation:", res.reason);
    return { onboarding: tx.metadata.onboarding === "1" };
  } catch (error) {
    console.error("[paystack] return confirmation failed:", error);
    return { onboarding: false };
  }
}
