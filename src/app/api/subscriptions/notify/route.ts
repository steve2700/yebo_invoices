import { createAdminClient } from "@/lib/supabase/admin";
import { yeboPayfast } from "@/lib/billing-config";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";
import { PLANS, isPlanId } from "@/lib/plans";
import {
  amountToCents,
  cancelPayfastSubscription,
  checkPayfastIp,
  confirmWithPayfast,
  itnSignature,
  signaturesMatch,
} from "@/lib/payfast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ok = () => new Response("OK", { status: 200 });
const reject = (reason: string) => {
  // The reason goes to your logs, never back to whoever called.
  console.error(`[subscriptions] notification rejected: ${reason}`);
  return new Response("Invalid request", { status: 400 });
};

// PayFast calls this after every subscription payment (the first one, and each monthly renewal), and when a
// subscription is cancelled or a payment fails. Every check below must pass before anything is changed.
export async function POST(request: Request) {
  const raw = await request.text();
  if (!raw || raw.length > 10_000) return reject("empty or oversized body");
  const entries = Array.from(new URLSearchParams(raw).entries()) as [string, string][];
  const data = Object.fromEntries(entries) as Record<string, string>;

  const creds = yeboPayfast();
  if (!creds) {
    console.error("[subscriptions] Yebo's PayFast details are not set.");
    return new Response("Temporarily unavailable", { status: 503 });
  }

  // ---- security checks ----
  if (data.merchant_id !== creds.merchantId) return reject("merchant id does not match");
  if (!data.signature || !signaturesMatch(data.signature, itnSignature(entries, creds.passphrase))) return reject("signature does not match");

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip");
  const ipCheck = await checkPayfastIp(forwarded);
  if (ipCheck === "no") return reject(`request came from an address that is not PayFast's (${forwarded})`);
  if (ipCheck === "unknown") console.warn("[subscriptions] could not look up PayFast addresses; relying on the other checks.");

  if (!(await confirmWithPayfast(entries, creds.sandbox))) return reject("PayFast did not confirm this notification");

  // ---- who is this for? ----
  const match = /^sub_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(data.m_payment_id ?? "");
  if (!match) return reject("missing or invalid payment reference");
  const businessId = match[1];
  const planId = data.custom_str1;
  if (!isPlanId(planId)) return reject("unknown plan");
  const plan = PLANS[planId];

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[subscriptions] admin client unavailable:", error);
    return new Response("Temporarily unavailable", { status: 503 });
  }

  const { data: business } = await admin.from("businesses").select("id,name,email,brand_color,owner_id").eq("id", businessId).maybeSingle();
  if (!business) return reject("unknown business");
  const { data: existing } = await admin.from("subscriptions").select("status,plan,pf_token,started_at,current_period_end").eq("business_id", businessId).maybeSingle();

  const status = (data.payment_status ?? "").toUpperCase();
  const token = (data.token ?? "").trim() || null;

  // ---- a failed renewal or a cancellation ----
  if (status === "FAILED") {
    if (existing && existing.status === "active") await admin.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("business_id", businessId);
    return ok();
  }
  if (status === "CANCELLED") {
    if (existing && (!token || !existing.pf_token || existing.pf_token === token)) {
      await admin.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("business_id", businessId);
    }
    return ok();
  }
  if (status !== "COMPLETE") return ok(); // PENDING or anything else: wait for the final notification.

  // ---- a successful payment ----
  const paidCents = amountToCents(data.amount_gross);
  if (paidCents === null || paidCents !== plan.priceRand * 100) return reject(`amount mismatch (got ${data.amount_gross}, expected ${plan.priceRand * 100} cents)`);
  const pfPaymentId = (data.pf_payment_id ?? "").trim();
  if (!pfPaymentId) return reject("complete payment without a PayFast payment id");

  const { error: insertError } = await admin.from("subscription_payments").insert({ business_id: businessId, pf_payment_id: pfPaymentId, plan: planId, amount_cents: paidCents });
  const repeat = insertError?.code === "23505"; // a notification we have already handled
  if (insertError && !repeat) {
    console.error("[subscriptions] could not record payment:", insertError);
    return new Response("Temporarily unavailable", { status: 503 }); // PayFast will try again
  }

  // The plan is paid for one month, plus 3 spare days in case a renewal is a little late.
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(periodEnd.getDate() + 3);

  const { error: updateError } = await admin.from("subscriptions").upsert({
    business_id: businessId,
    status: "active",
    plan: planId,
    pf_token: token ?? existing?.pf_token ?? null,
    started_at: existing?.started_at ?? now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancelled_at: null,
    updated_at: now.toISOString(),
  }, { onConflict: "business_id" });
  if (updateError) {
    console.error("[subscriptions] could not switch the plan on:", updateError);
    return new Response("Temporarily unavailable", { status: 503 });
  }

  // Changing plan starts a new PayFast subscription, so stop the old one to avoid being charged twice.
  if (token && existing?.pf_token && existing.pf_token !== token) {
    const stopped = await cancelPayfastSubscription(existing.pf_token, creds);
    if (!stopped) console.error(`[subscriptions] business ${businessId} changed plan but the old subscription ${existing.pf_token} could not be cancelled automatically. Cancel it in PayFast.`);
  }

  // ---- a welcome email, once per payment ----
  const isNewPlan = !repeat && (!existing || existing.status !== "active" || existing.plan !== planId);
  if (isNewPlan) {
    let ownerEmail: string | null = isEmail(business.email) ? business.email.trim() : null;
    if (!ownerEmail && business.owner_id) {
      const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
      ownerEmail = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
    }
    if (ownerEmail) {
      await sendEmail({
        to: ownerEmail,
        fromName: "Yebo Invoices",
        idempotencyKey: `subscription-welcome/${pfPaymentId}`,
        subject: `You are on ${plan.name}`,
        html: renderEmail({
          brandColor: business.brand_color,
          heading: `Welcome to ${plan.name}`,
          intro: `Thank you. We have received your first payment, and your plan is switched on. You can cancel at any time in Settings, and you keep access until the end of the month you have paid for.`,
          rows: [["Plan", plan.name], ["Price", `${formatRand(plan.priceRand * 100)} per month`]],
          buttonLabel: "Make a quote",
          buttonUrl: `${appUrl()}/app/quotes/new`,
          footer: null,
        }),
      });
    }
  }
  return ok();
}
