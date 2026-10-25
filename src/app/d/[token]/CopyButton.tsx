"use client";
import { useState } from "react";

// One tap copies a bank detail, so nobody retypes an account number on a phone.
export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older browsers: copy through a temporary text box.
      const box = document.createElement("textarea");
      box.value = value;
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      try { document.execCommand("copy"); } catch { return; }
      box.remove();
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  }
  return (
    <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="ml-2 inline-flex min-h-8 shrink-0 items-center rounded-full border border-ink/15 px-2.5 text-[11px] font-bold text-ink/70 active:scale-95">
      {done ? "Copied" : "Copy"}
    </button>
  );
}
