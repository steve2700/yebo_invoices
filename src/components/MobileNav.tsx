"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/nav-links";
import { InstallAppButton } from "@/app/app/InstallPrompt";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-full border border-yebo-deep/10 bg-white text-yebo-deep transition hover:bg-yebo-chalk"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <span aria-hidden="true" className="relative block h-3 w-4">
          <span className={`absolute left-0 top-0 h-0.5 w-4 rounded-full bg-current transition ${open ? "translate-y-[5px] rotate-45" : ""}`} />
          <span className={`absolute left-0 top-[5px] h-0.5 w-4 rounded-full bg-current transition ${open ? "opacity-0" : ""}`} />
          <span className={`absolute left-0 top-[10px] h-0.5 w-4 rounded-full bg-current transition ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
        </span>
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile navigation" className="absolute inset-x-0 top-full border-b border-yebo-deep/10 bg-yebo-chalk px-5 pb-6 pt-2 shadow-[0_20px_40px_-20px_rgba(12,59,46,.35)]">
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="flex min-h-12 items-center justify-between border-b border-yebo-deep/10 text-base font-bold text-yebo-deep aria-[current=page]:text-yebo"
                >
                  {link.label}
                  <span aria-hidden="true" className="text-yebo-deep/30">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/login" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-yebo-deep/15 text-sm font-bold text-yebo-deep">
            Sign in
          </Link>
          <InstallAppButton className="press mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-yebo text-sm font-extrabold text-white">Install the app</InstallAppButton>
        </nav>
      )}
    </div>
  );
}
