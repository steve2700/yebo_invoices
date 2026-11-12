"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminList, isAdminEmail } from "@/lib/admin-stats";
import { PLANS, isPlanId } from "@/lib/plans";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/url";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user && isAdminEmail(user.email, adminList()));
}

// You saw the money in your bank app: switch the plan on for one month.
export async function confirmEft(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const id = String(formData.get("id") ?? "");
  const admin = createAdminClient();
  const { data: row } = await admin.from("eft_payments").select("id,business_id,plan,status").eq("id", id).maybeSingle();
  if (!row || row.status !== "pending" || !isPlanId(row.plan)) return;
  const plan = PLANS[row.plan];

  const { data: existing } = await admin.from("subscriptions").select("status,plan,provider,started_at,current_period_end").eq("business_id", row.business_id).maybeSingle();
  // A live card plan keeps charging every month. Cancel it first, or the customer would pay twice.
  if (existing && existing.status === "active" && existing.provider !== "eft") return;

  const now = new Date();
  const paidUntil = existing && ["active", "cancelled", "past_due"].includes(existing.status) && existing.current_period_end && new Date(existing.current_period_end) > now ? new Date(existing.current_period_end) : null;
  const end = new Date(paidUntil ?? now);
  end.setMonth(end.getMonth() + 1);
  if (!paidUntil) end.setDate(end.getDate() + 3); // one month plus 3 spare days

  const { error } = await admin.from("subscriptions").upsert({
    business_id: row.business_id, status: "active", plan: row.plan, provider: "eft",
    started_at: existing?.started_at ?? now.toISOString(), current_period_end: end.toISOString(), cancelled_at: null, updated_at: now.toISOString(),
  }, { onConflict: "business_id" });
  if (error) { console.error("[eft] could not switch the plan on:", error); return; }

  await admin.from("subscription_payments").insert({ business_id: row.business_id, pf_payment_id: `eft_${row.id}`, plan: row.plan, amount_cents: plan.priceRand * 100 });
  await admin.from("eft_payments").update({ status: "confirmed", decided_at: now.toISOString() }).eq("id", row.id);

  const { data: business } = await admin.from("businesses").select("name,email,brand_color,owner_id").eq("id", row.business_id).maybeSingle();
  let to: string | null = business && isEmail(business.email) ? business.email.trim() : null;
  if (!to && business?.owner_id) {
    const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
    to = isEmail(owner?.user?.email) ? (owner?.user?.email as string).trim() : null;
  }
  if (to) {
    await sendEmail({
      to, fromName: "Yebo Invoices", idempotencyKey: `eft-confirmed/${row.id}`, subject: `You are on ${plan.name}`,
      html: renderEmail({
        brandColor: business?.brand_color, heading: `Welcome to ${plan.name}`,
        intro: "Thank you. We have received your EFT payment and your plan is switched on. We will remind you before the month ends so you can pay again.",
        rows: [["Plan", plan.name], ["Price", `R${plan.priceRand} per month`]],
        buttonLabel: "Make a quote", buttonUrl: `${appUrl()}/app/quotes/new`, footer: null,
      }),
    });
  }
  revalidatePath("/admin/payments");
}

// The money did not arrive. Nothing is switched on.
export async function rejectEft(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const id = String(formData.get("id") ?? "");
  await createAdminClient().from("eft_payments").update({ status: "rejected", decided_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
  revalidatePath("/admin/payments");
}
