"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { workPhotoLimit } from "@/lib/work-photos";

// Saves the list of work photos. The plan limit is checked here on the server, so it cannot be skipped from the browser.
export async function setWorkPhotos(urls: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const list = Array.isArray(urls) ? urls.filter((u) => typeof u === "string") : [];
  const limit = await workPhotoLimit(sb);
  if (list.length > limit) {
    return { ok: false, error: `Your plan allows ${limit} photo${limit === 1 ? "" : "s"}. Remove one first, or upgrade for more.` };
  }
  // Only accept photos that were uploaded to this owner's own folder.
  const own = `/storage/v1/object/public/logos/${user.id}/`;
  if (!list.every((u) => u.includes(own))) return { ok: false, error: "One of those photos did not upload properly. Please try again." };

  const { error } = await sb.from("businesses").update({ work_photos: list }).eq("owner_id", user.id);
  if (error) return { ok: false, error: "We could not save your photos. Please try again." };
  revalidatePath("/app/settings");
  return { ok: true };
}
