"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_STEP_IDS } from "@/lib/signin-events";

// Records one sign-in step. Anyone can call it, so only known steps and short text are accepted. It never throws.
export async function trackSignin(sessionId: string, step: string, detail?: string) {
  try {
    if (typeof sessionId !== "string" || sessionId.length < 8 || sessionId.length > 40) return;
    if (!ALL_STEP_IDS.includes(step)) return;
    await createAdminClient().from("signin_events").insert({
      session_id: sessionId,
      step,
      detail: typeof detail === "string" ? detail.slice(0, 160) : null,
    });
  } catch {
    /* tracking must never get in the way of signing in */
  }
}
