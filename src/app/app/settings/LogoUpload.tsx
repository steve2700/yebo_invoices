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
    <div>
      {current && <img src={current} alt="Your logo" className={compact ? "size-full object-contain" : "mb-2 h-14 object-contain"} />}
      <label className={compact ? "relative block size-full cursor-pointer" : "block text-sm font-semibold text-yebo-deep/70"}>
        {compact ? "Upload logo" : "Choose a logo file"}
        <input type="file" accept="image/*" onChange={upload} className={compact ? "absolute inset-0 size-full cursor-pointer opacity-0" : "mt-2 block w-full text-sm"} />
      </label>
      {msg && <p className="mt-1 text-sm text-neutral-600">{msg}</p>}
    </div>
  );
}
