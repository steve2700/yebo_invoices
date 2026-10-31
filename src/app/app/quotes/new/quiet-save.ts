"use server";

import { createClient } from "@/lib/supabase/server";
import { createQuote, updateDraft, type NewQuote } from "./actions";

export type SavedClient = { id: string; name: string; email: string | null; whatsapp_number: string | null; address: string | null; preferred_payment: string | null };
export type QuietResult = { ok: true; id: string; client: SavedClient | null } | { ok: false; error: string };

// Saves the form as a draft in the background, without leaving the page. It runs the same checks and the same saving code
// as the Save draft button (which finishes by redirecting), catches that redirect, and reports the draft's id instead.
export async function quietSaveDraft(input: NewQuote, existingId: string | null): Promise<QuietResult> {
  try {
    const result = existingId ? await updateDraft({ ...input, send: false, id: existingId }) : await createQuote({ ...input, send: false });
    const failed = result as { error?: string } | undefined;
    if (failed?.error) return { ok: false, error: failed.error };
    return { ok: false, error: "Could not save." };
  } catch (e) {
    const digest = String((e as { digest?: unknown })?.digest ?? "");
    const m = digest.match(/\/app\/documents\/([0-9a-f-]{36})/i);
    if (!m) {
      if (digest.startsWith("NEXT_REDIRECT")) return { ok: false, error: "Please sign in again." };
      return { ok: false, error: "Could not save." };
    }
    let client: SavedClient | null = null;
    if (input.newClient) {
      const sb = await createClient();
      const { data } = await sb.from("documents").select("clients(id,name,email,whatsapp_number,address,preferred_payment)").eq("id", m[1]).maybeSingle();
      const c = Array.isArray(data?.clients) ? data?.clients[0] : data?.clients;
      if (c) client = c as SavedClient;
    }
    return { ok: true, id: m[1], client };
  }
}
