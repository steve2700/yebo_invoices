"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { classifySource } from "@/lib/traffic";

const recent: number[] = [];

// Records where a visit came from. Anyone can call it, so it is short-text only and rate limited. It never throws.
export async function trackVisit(sessionId: string, referrer: string, tag: string, path: string, ownHost: string) {
  try {
    if (typeof sessionId !== "string" || sessionId.length < 8 || sessionId.length > 40) return;
    const now = Date.now();
    while (recent.length && now - recent[0] > 60_000) recent.shift();
    if (recent.length >= 120) return;
    recent.push(now);
    const source = classifySource(String(referrer ?? "").slice(0, 300), String(tag ?? "").slice(0, 60), String(ownHost ?? "").slice(0, 100));
    await createAdminClient().from("visits").insert({ session_id: sessionId, source, path: String(path ?? "").slice(0, 120) });
  } catch {
    /* never get in the way of the page */
  }
}
