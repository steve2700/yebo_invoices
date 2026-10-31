"use client";

import { useRef, useState } from "react";

const field = "mt-2 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-yebo focus:ring-2 focus:ring-yebo/20";
const label = "mt-5 block text-sm font-bold text-ink";
const MAX_PHOTOS = 3;

// Shrinks a phone photo (often 4 to 8 MB) to about 1280 pixels wide so three of them upload fast on mobile data.
async function shrink(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.8));
    if (!blob) return null;
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    return null; // a format the browser cannot read: skipped, the request still goes
  }
}

export default function RequestForm({ token, businessName, color, source }: { token: string; businessName: string; color: string; source: string }) {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<"form" | "done">("form");
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [note, setNote] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

  if (state === "done") {
    return (
      <div role="status" className="rounded-3xl bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-4xl" aria-hidden="true">✓</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Request sent</h2>
        <p className="mt-2 text-base leading-7 text-ink/70">{businessName} has your details and will get back to you with a quote. You do not need to do anything else.</p>
      </div>
    );
  }

  async function addPhotos(list: FileList | null) {
    setNote("");
    if (!list?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const made: { file: File; url: string }[] = [];
    for (const f of Array.from(list).slice(0, Math.max(0, room))) {
      const small = await shrink(f);
      if (small) made.push({ file: small, url: URL.createObjectURL(small) });
      else setNote("One file could not be used. Please choose a normal photo.");
    }
    if (list.length > room) setNote(`You can add up to ${MAX_PHOTOS} photos.`);
    setPhotos((p) => [...p, ...made]);
    if (input.current) input.current.value = "";
  }

  async function send(form: HTMLFormElement) {
    setError("");
    setPending(true);
    try {
      const data = new FormData(form);
      data.delete("photos");
      photos.forEach((p, i) => data.append("photos", p.file, `photo-${i}.jpg`));
      const res = await fetch(`/api/request/${token}`, { method: "POST", body: data });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (json?.ok) setState("done");
      else setError(json?.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Could not send. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="rounded-3xl bg-white p-5 shadow-sm sm:p-8"
      onSubmit={(e) => { e.preventDefault(); if (!pending) void send(e.currentTarget); }}
    >
      <input type="hidden" name="source" value={source} />

      <label className={label + " mt-0"} htmlFor="name">Your name</label>
      <input id="name" name="name" required maxLength={80} autoComplete="name" className={field} />

      <label className={label} htmlFor="whatsapp">WhatsApp number</label>
      <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="082 123 4567" className={field} />

      <label className={label} htmlFor="email">Email <span className="font-normal text-ink/50">(optional)</span></label>
      <input id="email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={120} className={field} />

      <label className={label} htmlFor="location">Where is the job? <span className="font-normal text-ink/50">(suburb or town)</span></label>
      <input id="location" name="location" maxLength={100} className={field} />

      <label className={label} htmlFor="details">What do you need done?</label>
      <textarea id="details" name="details" required minLength={8} maxLength={1500} rows={5} placeholder="For example: replace a leaking geyser, about 150 litres, in the garage." className={field} />

      <label className={label} htmlFor="preferred_date">When would you like it done? <span className="font-normal text-ink/50">(optional)</span></label>
      <input id="preferred_date" name="preferred_date" type="date" min={today} className={field} />

      <p className={label}>Photos of the job <span className="font-normal text-ink/50">(optional, up to {MAX_PHOTOS})</span></p>
      <p className="mt-1 text-xs leading-5 text-ink/55">A photo helps us quote correctly without a visit.</p>
      {photos.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {photos.map((p, i) => (
            <li key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo ${i + 1}`} className="size-24 rounded-xl object-cover" />
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => { URL.revokeObjectURL(p.url); setPhotos((all) => all.filter((x) => x !== p)); }} className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-ink text-sm font-bold text-white">×</button>
            </li>
          ))}
        </ul>
      )}
      {photos.length < MAX_PHOTOS && (
        <>
          <input ref={input} id="photos" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void addPhotos(e.target.files)} />
          <label htmlFor="photos" className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink/25 px-4 text-sm font-bold text-ink/70 hover:bg-yebo-chalk">
            {photos.length ? "Add another photo" : "Add photos"}
          </label>
        </>
      )}
      {note && <p className="mt-2 text-xs text-ink/60">{note}</p>}

      {/* A hidden field only bots fill in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        style={{ backgroundColor: color }}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-extrabold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (photos.length ? "Sending photos…" : "Sending…") : "Ask for a quote"}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-ink/50">Your details go only to {businessName}.</p>
    </form>
  );
}
