"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/whats-new";

const KEY = "yebo:news-seen";

// New things at the very top of the dashboard, so nobody misses them. "Got it" hides one on this device.
export default function WhatsNew({ items }: { items: NewsItem[] }) {
  const [seen, setSeen] = useState<string[] | null>(null);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      setSeen(Array.isArray(raw) ? raw.map(String) : []);
    } catch { setSeen([]); }
  }, []);
  if (!seen) return null;
  const list = items.filter((i) => !seen.includes(i.id));
  if (!list.length) return null;

  function dismiss(id: string) {
    const next = [...(seen ?? []), id];
    setSeen(next);
    try { localStorage.setItem(KEY, JSON.stringify(next.slice(-50))); } catch { /* ignore */ }
  }

  return (
    <section aria-label="What's new" className="flex flex-col gap-2.5">
      {list.map((n) => (
        <div key={n.id} className="pop-in flex flex-col gap-3 rounded-2xl border border-orange/30 bg-orange/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-orange">
              <span className="rounded-full bg-orange px-2 py-0.5 text-white">New</span> What&apos;s new
            </p>
            <p className="mt-1.5 text-base font-extrabold tracking-tight text-ink">{n.title}</p>
            <p className="mt-1 text-sm leading-6 text-ink/70">{n.text}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={n.href} onClick={() => dismiss(n.id)} className="inline-flex min-h-11 items-center rounded-xl bg-ink px-4 text-sm font-extrabold text-lime hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange">
              {n.cta} <span className="ml-1" aria-hidden="true">→</span>
            </Link>
            <button type="button" onClick={() => dismiss(n.id)} className="min-h-11 rounded-xl px-3 text-sm font-bold text-ink/60 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange">Got it</button>
          </div>
        </div>
      ))}
    </section>
  );
}
