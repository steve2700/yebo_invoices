"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eftReference } from "@/lib/eft";
import { PLANS, isPlanId } from "@/lib/plans";
import { renderEmail, sendEmail } from "@/lib/email";
import { SUPPORT } from "@/lib/support";
import { appUrl } from "@/lib/url";

// "I have paid by EFT." Records the notice and emails you. Nothing is switched on until you confirm the money arrived.
export async function requestEft(formData: FormData): Promise<void> {
  const plan = String(formData.get("plan") ?? "");
  if (!isPlanId(plan)) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: business } = await supabase.from("businesses").select("id,name").maybeSingle();
  if (!business) return;

  const admin = createAdminClient();
  const reference = eftReference(business.id);
  const { data: open } = await admin.from("eft_payments").select("id").eq("business_id", business.id).eq("status", "pending").limit(1);
  if (open && open.length > 0) {
    await admin.from("eft_payments").update({ plan }).eq("id", open[0].id); // already waiting: just update the plan they picked
  } else {
    const { error } = await admin.from("eft_payments").insert({ business_id: business.id, plan, reference });
    if (error) { console.error("[eft] could not save the notice:", error); return; }
    const chosen = PLANS[plan];
    await sendEmail({
      to: process.env.SURVEY_NOTIFY_EMAIL || SUPPORT.email,
      fromName: "Yebo alerts",
      idempotencyKey: `eft/${business.id}/${Date.now()}`,
      subject: `EFT payment notice: ${business.name} (${chosen.name})`,
      html: renderEmail({
        heading: "Someone says they paid by EFT",
        intro: "Check your bank app for the payment. When you see it, press Confirm in the admin page and they are connected right away.",
        rows: [["Business", business.name], ["Email", user.email ?? "-"], ["Plan", chosen.name], ["Amount", `R${chosen.priceRand}`], ["Reference", reference]],
        buttonLabel: "Open payments", buttonUrl: `${appUrl()}/admin/payments`,
      }),
    });
  }
  revalidatePath("/app/subscribe");
}
