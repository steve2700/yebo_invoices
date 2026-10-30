"use client";
import { useState } from "react";

export default function CopyLink({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-yebo px-4 text-sm font-bold text-yebo hover:bg-yebo-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* clipboard can be blocked */ }
      }}
    >
      {done ? "Copied" : "Copy link"}
    </button>
  );
}
