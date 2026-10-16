"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { yeboPayfast } from "@/lib/billing-config";
import { cancelPayfastSubscription } from "@/lib/payfast";
import { loadSubscription } from "@/lib/subscription";
import { formatSouthAfricaDateTime } from "@/lib/time";

export type CancelResult = { ok: true; until: string | null } | { ok: false; error: string };

// Cancels the owner's plan. They keep access until the end of the month they have paid for.
export async function cancelSubscription(): Promise<CancelResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { data: business } = await supabase.from("businesses").select("id").maybeSingle();
  if (!business) return { ok: false, error: "We could not find your business." };

  const sub = await loadSubscription(supabase);
  if (!sub || (sub.status !== "active" && sub.status !== "past_due")) return { ok: false, error: "There is no active plan to cancel." };

  // Stop the monthly charge at PayFast first. If that fails, do NOT pretend it worked.
  if (sub.pf_token) {
    const creds = yeboPayfast();
    const stopped = creds ? await cancelPayfastSubscription(sub.pf_token, creds) : false;
    if (!stopped) {
      return { ok: false, error: "We could not cancel with PayFast automatically, so nothing has changed and you have not been charged anything extra. Please cancel under Subscriptions in your PayFast account, or email us and we will do it for you." };
    }
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "We could not save the cancellation. Please try again." };
  }
  const { error } = await admin.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("business_id", business.id);
  if (error) {
    console.error("[billing] cancelled at PayFast but could not save it:", error);
    return { ok: false, error: "Your plan was stopped at PayFast but we could not save that here. Please refresh, or email us." };
  }
  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { ok: true, until: sub.current_period_end ? formatSouthAfricaDateTime(sub.current_period_end).split(",").slice(0, 2).join(",") : null };
}
