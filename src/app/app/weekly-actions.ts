"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The "Email me this every Friday" switch. Row level security means this only ever changes the signed-in owner's business.
export async function setWeeklyEmail(fd: FormData) {
  const on = fd.get("on") === "1";
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb.from("businesses").update({ weekly_review: on }).eq("owner_id", user.id);
  if (error) console.error("[weekly] could not save:", error.message);
  revalidatePath("/app");
}
