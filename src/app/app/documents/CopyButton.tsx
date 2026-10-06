"use client";
import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="rounded-xl border-2 border-yebo px-4 py-2 font-bold text-yebo"
      onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? "Copied" : "Copy link"}
    </button>
  );
}
