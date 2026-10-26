import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { entitlement } from "@/lib/subscription";
import { loadReminderItems, type FollowupRow } from "@/lib/reminders-load";
import type { ReminderItem } from "@/lib/reminder-queue";

// The reminders ready to send right now, worked out once per page load and shared by the bell and the dashboard card,
// so the number always matches the "Ready to send" screen. Any failure just means "none", never a broken page.
export const readyReminders = cache(async (): Promise<{ allowed: boolean; items: ReminderItem[] }> => {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { allowed: false, items: [] };
    const ent = await entitlement(sb);
    const allowed = !ent.enforced || Boolean(ent.plan?.reminders);
    if (!allowed) return { allowed, items: [] };
    const { data: rows, error } = await sb.rpc("followups_due");
    if (error) return { allowed, items: [] };
    return { allowed, items: await loadReminderItems(sb, (rows ?? []) as FollowupRow[]) };
  } catch (error) {
    console.error("[reminders] could not count:", error);
    return { allowed: false, items: [] };
  }
});
