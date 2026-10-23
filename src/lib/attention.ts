import { createClient } from "@/lib/supabase/server";
import { southAfricaDate } from "@/lib/time";

// What needs the owner's attention right now. Used to play a short alert sound when the app is open.
export type Attention = { overdue: number; closingSoon: number; signature: string };

export async function loadAttention(): Promise<Attention | null> {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const now = new Date();
    const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const [inv, tnd] = await Promise.all([
      sb.from("documents").select("id", { count: "exact", head: true }).eq("type", "invoice").in("status", ["sent", "viewed", "partially_paid"]).lt("due_date", southAfricaDate()),
      sb.from("tenders").select("id", { count: "exact", head: true }).in("status", ["draft", "ready"]).gt("closing_at", now.toISOString()).lt("closing_at", soon.toISOString()),
    ]);
    const overdue = inv.count ?? 0;
    const closingSoon = tnd.count ?? 0;
    return { overdue, closingSoon, signature: `${overdue}-${closingSoon}-${southAfricaDate()}` };
  } catch {
    return null;
  }
}
