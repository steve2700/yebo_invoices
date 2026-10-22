import type { createClient } from "@/lib/supabase/server";
import { entitlement } from "@/lib/subscription";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The Tender Engine is part of The Industry King. Until billing is switched on, everyone can use it.
export async function tenderAccess(sb: Supabase): Promise<{ allowed: boolean; enforced: boolean }> {
  const ent = await entitlement(sb);
  return { allowed: !ent.enforced || (ent.allowed && ent.plan?.id === "king"), enforced: ent.enforced };
}

export const TENDER_BUCKET = "tender-files";
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
