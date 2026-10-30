"use server";

import { createClient } from "@/lib/supabase/server";
import { adminList, isAdminEmail } from "@/lib/admin-stats";

const allowedList = () => adminList();

// Sends a sign-in code, but only to the admin email. Any other address is refused and no email is sent.
export async function requestAdminCode(email: unknown): Promise<{ ok: boolean; message?: string }> {
  const address = typeof email === "string" ? email.trim() : "";
  if (!address || address.length > 200) return { ok: false, message: "Enter your email address." };
  if (!isAdminEmail(address, allowedList())) {
    await new Promise((resolve) => setTimeout(resolve, 800)); // slows down anyone guessing
    return { ok: false, message: "This email does not have admin access." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
  if (error) {
    const tooMany = /rate limit|too many|security purposes/i.test(error.message);
    return { ok: false, message: tooMany ? "Too many tries. Wait a minute and try again." : "Could not send the code. Please try again." };
  }
  return { ok: true };
}

// Checks the code, again only for an admin email. On success the session cookie is set and the page reloads into the dashboard.
export async function verifyAdminCode(email: unknown, code: unknown): Promise<{ ok: boolean }> {
  const address = typeof email === "string" ? email.trim() : "";
  const token = typeof code === "string" ? code.replace(/\s/g, "") : "";
  if (!address || !/^[0-9]{6,10}$/.test(token)) return { ok: false };
  if (!isAdminEmail(address, allowedList())) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: address, token, type: "email" });
  return { ok: !error };
}

// Marks an error as fixed. It comes back by itself if it happens again.
export async function resolveError(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email, allowedList())) return;
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient().from("error_log").update({ resolved: true }).eq("id", id);
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin", "layout");
}
