"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Called when the owner taps "Thank on WhatsApp" or "Not needed" on the dashboard.
// Row level security means this can only ever change the signed-in owner's own payments.
export async function markPaymentThanked(paymentId: string): Promise<{ error?: string }> {
  if (typeof paymentId !== "string" || !/^[0-9a-f-]{36}$/i.test(paymentId)) {
    return { error: "That payment could not be found." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to continue." };

  const { error } = await supabase
    .from("payments")
    .update({ thanked_at: new Date().toISOString() })
    .eq("id", paymentId)
    .is("thanked_at", null);
  if (error) {
    console.error("[payments] could not mark payment as thanked:", error);
    return { error: "Could not update this payment. Please try again." };
  }
  revalidatePath("/app");
  return {};
}
