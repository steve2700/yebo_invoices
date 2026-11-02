import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;
const DAY = 86400000;

// Drafts Yebo saved in the background (autosaved_at is set) and nobody touched for 14 days are removed, so the quotes list stays tidy.
// A draft the owner saved on purpose, or sent, has no stamp and is never removed.
export async function runDraftCleanup(admin: Admin, now: Date = new Date()): Promise<{ removed: number; error?: string }> {
  const cutoff = new Date(now.getTime() - 14 * DAY).toISOString();
  const { data, error } = await admin.from("documents").delete().eq("status", "draft").lt("autosaved_at", cutoff).select("id");
  if (error) return { removed: 0, error: error.message };
  return { removed: data?.length ?? 0 };
}
