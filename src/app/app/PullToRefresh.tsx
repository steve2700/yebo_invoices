"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

const TRIGGER = 72;                                    // how far to pull (px) before it refreshes
const PAGES = ["/app", "/app/documents", "/app/tenders"]; // only the list pages, never forms

// Pull down from the top of the dashboard, documents or tenders to reload the latest data (installed apps on iPhone have no browser refresh).
export default function PullToRefresh() {
  const router = useRouter();
  const path = usePathname();
  const [pull, setPull] = useState(0);
  const [pending, startTransition] = useTransition();
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const enabled = PAGES.includes(path);

  useEffect(() => {
    if (!enabled) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const setP = (v: number) => { pullRef.current = v; setPull(v); };
    const onStart = (e: TouchEvent) => {
      const el = e.target as HTMLElement | null;
      if (window.scrollY > 0 || e.touches.length !== 1 || el?.closest("input,textarea,select,[role=dialog]")) { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) { if (pullRef.current) setP(0); return; }
      if (e.cancelable) e.preventDefault(); // stop the browser's own bounce so ours is smooth
      setP(Math.min(dy * 0.5, TRIGGER * 1.4));
    };
    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= TRIGGER) {
        setP(TRIGGER * 0.75);
        startTransition(() => router.refresh());
      } else setP(0);
    };
    document.documentElement.style.overscrollBehaviorY = "contain";
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    void reduce;
    return () => {
      document.documentElement.style.overscrollBehaviorY = "";
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, router]);

  // When the refresh finishes, tuck the indicator away.
  useEffect(() => { if (!pending && pullRef.current && startY.current === null) { pullRef.current = 0; setPull(0); } }, [pending]);

  if (!enabled || (!pull && !pending)) return null;
  const progress = Math.min(pull / TRIGGER, 1);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-14 z-10 flex justify-center sm:hidden" style={{ transform: `translateY(${Math.max(pull - 36, -8)}px)`, opacity: Math.max(progress, pending ? 1 : 0), transition: pull && !pending ? "none" : "transform .25s ease, opacity .25s ease" }}>
      <div className="grid size-10 place-items-center rounded-full bg-white shadow-lg ring-1 ring-ink/10">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0F8A5F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={pending ? "spin" : ""} style={pending ? undefined : { transform: `rotate(${progress * 270}deg)` }}>
          <path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" />
        </svg>
      </div>
    </div>
  );
}
