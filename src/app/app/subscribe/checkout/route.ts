import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { yeboPayfast, addOneMonth } from "@/lib/billing-config";
import { paystackConfig, initializePaystack } from "@/lib/paystack";
import { buildPayfastSubscriptionCheckout } from "@/lib/payfast";
import { PLANS, isPlanId } from "@/lib/plans";
import { southAfricaDate } from "@/lib/time";
import { autoPostPage, messagePage } from "@/lib/html-pages";

export const dynamic = "force-dynamic";

// Called when the owner taps "Subscribe". It sends them to PayFast with a signed monthly-subscription form.
// The first payment is taken now. PayFast then charges the same amount once a month until the plan is cancelled.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const planId = String(form?.get("plan") ?? "");
  const onboarding = form?.get("onboarding") === "1";
  const back = `/app/subscribe${onboarding ? "?onboarding=1" : ""}`;

  if (!isPlanId(planId)) return messagePage("Choose a plan", "Please pick one of the plans and try again.", 400, back, "Back to the plans");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return messagePage("Please sign in", "Sign in again to choose your plan.", 401, "/login", "Sign in");
  const { data: business } = await supabase.from("businesses").select("id").maybeSingle();
  if (!business) return messagePage("Set up your business first", "We need your business details before you choose a plan.", 409, "/app/onboarding", "Set up my business");

  const ps = paystackConfig();
  if (ps) {
    const chosen = PLANS[planId];
    if (!user.email) return messagePage("We need your email", "Your account has no email address, so we cannot start the payment.", 409, back, "Back to the plans");
    const reference = `yebo_${business.id.replace(/-/g, "")}_${Date.now()}`;
    const url = await initializePaystack(ps, {
      email: user.email, planCode: ps.plans[planId], amountCents: chosen.priceRand * 100, reference,
      callbackUrl: `${appUrl()}/app/subscribe/done`,
      metadata: { business_id: business.id, plan: planId, onboarding: onboarding ? "1" : "0" },
    });
    if (!url) return messagePage("We could not start your payment", "Something went wrong on our side. Nothing was charged. Please try again in a minute.", 503, back, "Back to the plans");
    try { await createAdminClient().from("checkout_starts").insert({ business_id: business.id, plan: planId, provider: "paystack", reference }); } catch { /* the log must never stop a payment */ }
    return Response.redirect(url, 303);
  }

  const creds = yeboPayfast();
  if (!creds) {
    console.error("[billing] YEBO_PAYFAST_MERCHANT_ID or YEBO_PAYFAST_MERCHANT_KEY is not set.");
    return messagePage("Payments are not switched on yet", "We could not start your subscription. Please try again soon.", 503, back, "Back to the plans");
  }

  const plan = PLANS[planId];
  const base = appUrl();
  const checkout = buildPayfastSubscriptionCheckout({
    ...creds,
    returnUrl: `${base}/app/subscribe/done${onboarding ? "?onboarding=1" : ""}`,
    cancelUrl: `${base}${back}`,
    notifyUrl: `${base}/api/subscriptions/notify`,
    email: user.email ?? null,
    paymentId: `sub_${business.id}`, // lets the confirmation find the business again
    amountCents: plan.priceRand * 100,
    itemName: `Yebo ${plan.name}`,
    itemDescription: `Yebo Invoices ${plan.name}, billed monthly`,
    customStr1: plan.id,
    billingDate: addOneMonth(southAfricaDate()),
  });
  return autoPostPage(checkout.action, checkout.fields);
}
