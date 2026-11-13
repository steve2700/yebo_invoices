"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import { NAV_LINKS } from "@/lib/nav-links";
import { InstallAppButton } from "@/app/app/InstallPrompt";

// overlay: sits on top of a photo hero (clear at the top, solid once you scroll or open the menu).
// Without it the header is the normal solid bar used on the other pages.
export default function LandingHeader({ overlay = false }: { overlay?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const clear = overlay && !scrolled && !menuOpen; // transparent, white text, over the photo

  return (
    <header
      className={`${overlay ? "fixed inset-x-0" : "sticky"} top-0 z-30 transition-[background-color,border-color,box-shadow] duration-300 ${
        clear ? "border-b border-transparent bg-transparent" : "border-b border-yebo-deep/15 bg-yebo-chalk/95 shadow-[0_1px_0_rgba(12,59,46,.04)] backdrop-blur-md"
      }`}
    >
      {clear && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-black/50 to-transparent" />}
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8 lg:px-12">
        <Logo light={clear} />
        <nav aria-label="Main navigation" className={`hidden items-center gap-1 text-sm font-semibold md:flex ${clear ? "text-white/90" : "text-yebo-deep/75"}`}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              className={`rounded-md px-3.5 py-2 transition-colors ${clear ? "hover:bg-white/15 hover:text-white" : "hover:bg-yebo-deep/5 hover:text-yebo-deep"}`}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden lg:inline-flex">
            <InstallAppButton className={`press rounded-md px-3 py-2 text-sm font-semibold transition ${clear ? "text-white hover:bg-white/15" : "text-yebo-deep hover:bg-yebo-deep/5"}`}>Install app</InstallAppButton>
          </span>
          <Link
            className={`hidden rounded-md px-3 py-2 text-sm font-semibold transition-colors sm:inline-flex ${clear ? "text-white hover:bg-white/15" : "text-yebo-deep hover:bg-yebo-deep/5"}`}
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className={`inline-flex min-h-11 items-center rounded-lg px-5 py-2.5 text-sm font-extrabold transition active:scale-[.98] ${
              clear ? "bg-yebo-sun text-yebo-deep shadow-[0_6px_20px_rgba(0,0,0,.25)] hover:brightness-95" : "bg-yebo-deep text-white hover:bg-yebo"
            }`}
            href="/login"
          >
            Get started
          </Link>
          <MobileNav light={clear} onOpenChange={setMenuOpen} />
        </div>
      </div>
    </header>
  );
}
