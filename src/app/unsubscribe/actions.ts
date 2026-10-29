"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { validUnsub } from "@/lib/unsub-token";

export async function unsubscribe(formData: FormData) {
  const email = String(formData.get("e") ?? "").trim().toLowerCase();
  const token = String(formData.get("t") ?? "");
  if (!validUnsub(email, token)) return { ok: false };
  const { error } = await createAdminClient().from("nudge_optout").upsert({ email });
  return { ok: !error };
}
