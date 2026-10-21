"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setWorkPhotos } from "./actions";

const MAX_BYTES = 5 * 1024 * 1024;

// Photos of past work, shown to clients on the quote page. You can pick several at once.
// Photos save the moment they are chosen (same as the logo), so there is no Save button to press for them.
export default function WorkPhotos({ current, limit }: { current: string[]; limit: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const left = Math.max(0, limit - current.length);

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (left === 0) return setMsg(`Your plan allows ${limit} photo${limit === 1 ? "" : "s"}. Remove one first, or upgrade for more.`);

    const notes: string[] = [];
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length < files.length) notes.push("Some files were not photos and were skipped.");
    const small = images.filter((f) => f.size <= MAX_BYTES);
    if (small.length < images.length) notes.push("Photos over 5 MB were skipped.");
    const chosen = small.slice(0, left);
    if (small.length > left) notes.push(`Your plan allows ${limit} photo${limit === 1 ? "" : "s"}, so only the first ${left} ${left === 1 ? "was" : "were"} added.`);
    if (!chosen.length) return setMsg(notes.join(" ") || "No photos were added.");

    setBusy(true);
    setMsg("");
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(false); return setMsg("Please sign in again."); }

    const stamp = Date.now();
    const results = await Promise.all(chosen.map(async (file, i) => {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/work-${stamp}-${i}.${ext}`;
      const { error } = await sb.storage.from("logos").upload(path, file, { upsert: true });
      return error ? null : sb.storage.from("logos").getPublicUrl(path).data.publicUrl;
    }));
    const uploaded = results.filter((u): u is string => Boolean(u));
    if (uploaded.length < chosen.length) notes.push(`${chosen.length - uploaded.length} photo${chosen.length - uploaded.length === 1 ? "" : "s"} could not be uploaded.`);

    if (uploaded.length) {
      const res = await setWorkPhotos([...current, ...uploaded]);
      if (!res.ok) { setBusy(false); return setMsg(res.error); }
      notes.unshift(`${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} added and saved.`);
    }
    setBusy(false);
    setMsg(notes.join(" "));
    router.refresh();
  }

  async function remove(url: string) {
    setBusy(true);
    const res = await setWorkPhotos(current.filter((u) => u !== url));
    setBusy(false);
    setMsg(res.ok ? "Photo removed and saved." : res.error);
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
      {left > 0 && (
        <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-yebo/30 bg-white px-4 text-sm font-bold text-yebo">
          {busy ? "Uploading..." : current.length ? `Add more photos (${left} left)` : left > 1 ? `Choose up to ${left} photos` : "Choose a photo"}
          <input type="file" accept="image/*" multiple={left > 1} onChange={add} disabled={busy} className="sr-only" aria-label="Add photos of past work" />
        </label>
      )}
      <p className="mt-2 text-xs text-yebo-deep/50">
        {current.length} of {limit} photo{limit === 1 ? "" : "s"} used. Photos save automatically, so you do not need to press Save for them.
      </p>
      {limit < 6 && (
        <p className="mt-1 text-xs text-yebo-deep/50">The Side-Hustler shows 1 photo, The Real Business 3 and The Industry King 6.</p>
      )}
      {msg && <p role="status" className="mt-2 text-xs font-medium text-yebo-deep">{msg}</p>}
    </div>
  );
}
