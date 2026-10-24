"use client";
import { useEffect, useState } from "react";

// A short welcome when Yebo opens: the logo spins in, a lime dot circles it, then the screen fades away.
// It shows once per visit (the server only renders it when the "yebo_splash" cookie is missing), so it never gets in the way.
export default function Splash() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    document.cookie = "yebo_splash=1; path=/; SameSite=Lax";
    const t = setTimeout(() => setGone(true), 1700);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div aria-hidden="true" className="splash-overlay pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-yebo-chalk">
      <div className="flex flex-col items-center">
        <div className="relative grid size-28 place-items-center">
          <span className="splash-orbit absolute inset-0"><span className="absolute left-1/2 top-0 size-3 -translate-x-1/2 rounded-full bg-lime shadow-[0_0_14px_rgba(217,243,106,.9)]" /></span>
          <svg viewBox="0 0 40 40" className="splash-logo size-20 drop-shadow-lg">
            <rect width="40" height="40" rx="12" fill="#0F8A5F" />
            <path d="M10.5 11.5 20 22l9.5-10.5M20 22v8" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
            <circle cx="29.5" cy="11.5" r="3" fill="#d9f36a" />
          </svg>
        </div>
        <p className="fade-up mt-5 text-2xl font-extrabold tracking-tight text-yebo-deep" style={{ "--d": ".4s" } as React.CSSProperties}>Yebo</p>
        <p className="fade-up mt-1 text-xs font-semibold text-yebo-deep/55" style={{ "--d": ".55s" } as React.CSSProperties}>Quotes and invoices, sorted.</p>
      </div>
    </div>
  );
}
