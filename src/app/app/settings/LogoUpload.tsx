"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dominantColor } from "@/lib/color";

export default function LogoUpload({ current, compact = false }: { current: string | null; compact?: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const path = `${user.id}/logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await sb.storage.from("logos").upload(path, file, { upsert: true });
    if (error) return setMsg(error.message);
    const { data } = sb.storage.from("logos").getPublicUrl(path);
    const colour = await dominantColor(file); // match the quote colour to the logo
    const { error: uErr } = await sb.from("businesses").update({ logo_url: data.publicUrl, ...(colour ? { brand_color: colour } : {}) }).eq("owner_id", user.id);
    setMsg(uErr ? uErr.message : "Logo saved." + (colour ? " We matched your quote colour to it. You can change it in Settings." : ""));
    router.refresh();
  }
  return (
    <div className={compact ? "relative flex size-full min-w-0 items-center justify-center rounded-xl" : "w-full"}>
      {current ? (
        <span className={compact ? "pointer-events-none absolute inset-2 flex items-center justify-center" : "mb-2 flex h-20 w-full items-center justify-start"}>
          <img src={current} alt="Your logo" className="block max-h-full max-w-full object-contain" />
        </span>
      ) : compact ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-yebo/65">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v4h16v-4" /></svg>
          <span className="text-[10px] font-semibold">Add a logo</span>
        </span>
      ) : null}
      <label className={compact ? "absolute inset-0 z-10 flex cursor-pointer items-end justify-center rounded-xl bg-gradient-to-t from-white/95 via-white/15 to-transparent p-2 text-center text-[11px] font-bold text-yebo-deep focus-within:ring-2 focus-within:ring-inset focus-within:ring-yebo" : "block text-sm font-semibold text-yebo-deep/70"}>
        {compact ? <span className="rounded-full bg-white/90 px-2 py-1 shadow-sm">{current ? "Change logo" : "Upload logo"}</span> : "Choose a logo file"}
        <input type="file" accept="image/*" aria-label={current ? "Replace business logo" : "Upload business logo"} onChange={upload} className={compact ? "absolute inset-0 size-full cursor-pointer opacity-0" : "mt-2 block w-full text-sm"} />
      </label>
      {msg && <p role={msg.startsWith("Logo saved") ? "status" : "alert"} className={compact ? "absolute left-0 top-full z-20 mt-2 w-56 rounded-xl bg-white px-3 py-2 text-xs font-medium text-yebo-deep shadow-lg" : "mt-2 text-sm text-neutral-600"}>{msg}</p>}
    </div>
  );
}
