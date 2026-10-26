"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The "email me the list every morning" switch. Row level security means this only ever changes the signed-in owner's business.
export async function setMorningList(fd: FormData) {
  const on = fd.get("on") === "1";
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb.from("businesses").update({ morning_list: on }).eq("owner_id", user.id);
  if (error) console.error("[morning list] could not save:", error.message);
  revalidatePath("/app/reminders");
}
