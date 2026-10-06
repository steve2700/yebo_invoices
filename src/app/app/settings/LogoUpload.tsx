"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoUpload({ current }: { current: string | null }) {
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
    const { error: uErr } = await sb.from("businesses").update({ logo_url: data.publicUrl }).eq("owner_id", user.id);
    setMsg(uErr ? uErr.message : "Logo saved.");
    router.refresh();
  }
  return (
    <div>
      {current && <img src={current} alt="Your logo" className="mb-2 h-14 object-contain" />}
      <input type="file" accept="image/*" onChange={upload} />
      {msg && <p className="mt-1 text-sm text-neutral-600">{msg}</p>}
    </div>
  );
}
