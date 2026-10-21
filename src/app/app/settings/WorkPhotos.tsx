"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;

// Up to 6 photos of past work, shown to clients on the quote page. Each photo saves the moment it is
// chosen (same as the logo), so there is no extra Save button to forget.
export default function WorkPhotos({ current }: { current: string[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(next: string[]) {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return "Please sign in again.";
    const { error } = await sb.from("businesses").update({ work_photos: next }).eq("owner_id", user.id);
    return error ? error.message : "";
  }

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg("Please choose a photo (JPG or PNG).");
    if (file.size > MAX_BYTES) return setMsg("That photo is over 5 MB. Please choose a smaller one.");
    if (current.length >= MAX_PHOTOS) return setMsg(`You can add up to ${MAX_PHOTOS} photos. Remove one first.`);
    setBusy(true);
    setMsg("");
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(false); return setMsg("Please sign in again."); }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/work-${Date.now()}.${ext || "jpg"}`;
    const { error } = await sb.storage.from("logos").upload(path, file, { upsert: true });
    if (error) { setBusy(false); return setMsg(error.message); }
    const { data } = sb.storage.from("logos").getPublicUrl(path);
    const err = await save([...current, data.publicUrl]);
    setBusy(false);
    setMsg(err || "Photo added.");
    router.refresh();
  }

  async function remove(url: string) {
    setBusy(true);
    const err = await save(current.filter((u) => u !== url));
    setBusy(false);
    setMsg(err || "Photo removed.");
    router.refresh();
  }

  return (
    <div>
      {current.length > 0 && (
        <ul className="grid grid-cols-3 gap-3">
          {current.map((url) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-xl border border-yebo-deep/10 bg-yebo-chalk/40">
              <img src={url} alt="Past work" className="size-full object-cover" />
              <button type="button" disabled={busy} onClick={() => remove(url)} aria-label="Remove this photo"
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/90 text-sm font-black text-yebo-deep shadow-sm disabled:opacity-50">×</button>
            </li>
          ))}
        </ul>
      )}
      {current.length < MAX_PHOTOS && (
        <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-yebo/30 bg-white px-4 text-sm font-bold text-yebo">
          {busy ? "Uploading..." : current.length ? "Add another photo" : "Add a photo of your work"}
          <input type="file" accept="image/*" onChange={add} disabled={busy} className="sr-only" aria-label="Add a photo of past work" />
        </label>
      )}
      <p className="mt-2 text-xs text-yebo-deep/50">{current.length} of {MAX_PHOTOS} photos. Clients see these on the page where they accept your quote.</p>
      {msg && <p role="status" className="mt-2 text-xs font-medium text-yebo-deep">{msg}</p>}
    </div>
  );
}
