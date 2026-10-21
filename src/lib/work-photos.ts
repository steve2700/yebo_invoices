import { createClient } from "@/lib/supabase/server";
import { entitlement } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MOST = Math.max(...Object.values(PLANS).map((p) => p.workPhotos));

// How many photos of past work this owner may show on their quote link.
// Side-Hustler 1, Real Business 3, Industry King 6 (set in plans.ts). With billing switched off there is no limit beyond the maximum.
export async function workPhotoLimit(sb: Supabase): Promise<number> {
  const ent = await entitlement(sb);
  if (!ent.enforced) return MOST;
  return ent.plan ? ent.plan.workPhotos : PLANS.side.workPhotos;
}
