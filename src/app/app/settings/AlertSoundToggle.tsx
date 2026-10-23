"use client";
import { useEffect, useState } from "react";
import { SOUND_KEY, playChime } from "../AttentionChime";

export default function AlertSoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => { try { setOn(localStorage.getItem(SOUND_KEY) !== "off"); } catch { /* ignore */ } }, []);
  const change = (v: boolean) => {
    setOn(v);
    try { localStorage.setItem(SOUND_KEY, v ? "on" : "off"); } catch { /* ignore */ }
    if (v) playChime();
  };
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-yebo-deep/10 bg-white px-6 py-5 text-sm shadow-[0_12px_40px_rgba(12,59,46,0.06)] sm:px-8">
      <input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-yebo" />
      <span>
        <b className="block text-yebo-deep">Alert sound</b>
        <span className="mt-0.5 block text-xs leading-5 text-yebo-deep/60">A soft chime when an invoice becomes overdue or a tender is closing within 3 days. Plays on this device, while Yebo is open.</span>
      </span>
    </label>
  );
}
