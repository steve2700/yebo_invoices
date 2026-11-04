"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AREAS, TRADES } from "@/lib/opportunities";

export async function saveOpportunities(formData: FormData) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const trades = TRADES.map((t) => t.key as string).filter((k) => formData.getAll("trade").includes(k));
  const areas = AREAS.map((a) => a.key as string).filter((k) => formData.getAll("area").includes(k));
  const on = formData.get("enabled") === "on" && trades.length > 0 && areas.length > 0;
  const { error } = await sb.from("businesses").update({ opp_enabled: on, opp_trades: trades, opp_areas: areas }).eq("owner_id", user.id);
  if (error) { console.error("[opportunities] save failed:", error.message); redirect("/app/opportunities?e=save"); }
  revalidatePath("/app/opportunities");
  redirect(`/app/opportunities?e=${on ? "on" : formData.get("enabled") === "on" ? "pick" : "off"}`);
}

// "Did you get this job?" Only the owner's own Yebo job can be marked. Winning does not change the ranking, answering does.
export async function setOutcome(formData: FormData) {
  const id = formData.get("id");
  const outcome = formData.get("outcome");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || (outcome !== "won" && outcome !== "lost")) return;
  const sb = await createClient();
  await sb.from("quote_requests").update({ outcome, outcome_at: new Date().toISOString() }).eq("id", id).like("source", "yebo-%");
  revalidatePath("/app/opportunities");
}
