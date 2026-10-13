"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { southAfricaMonth } from "@/lib/time";

const MAX_REVENUE_RAND = 100_000_000;
const MAX_QUOTES = 10_000;

// Saves this month's targets. Blank or invalid numbers become 0, which simply means "no target for that".
export async function saveMonthlyTarget(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase.from("businesses").select("id").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const number = (key: string) => {
    const value = Number(String(formData.get(key) ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  const revenueCents = Math.round(Math.min(number("revenue"), MAX_REVENUE_RAND) * 100);
  const quotes = Math.floor(Math.min(number("quotes"), MAX_QUOTES));

  const { error } = await supabase.from("monthly_targets").upsert(
    { business_id: business.id, month: southAfricaMonth().key, revenue_cents: revenueCents, quotes_count: quotes, updated_at: new Date().toISOString() },
    { onConflict: "business_id,month" },
  );
  if (error) console.error("[targets] could not save the monthly target:", error);

  revalidatePath("/app");
  redirect("/app");
}
