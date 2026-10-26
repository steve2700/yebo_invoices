import Link from "next/link";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import { NAV_LINKS } from "@/lib/nav-links";
import { InstallAppButton } from "@/app/app/InstallPrompt";

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-yebo-deep/15 bg-yebo-chalk/95 backdrop-blur-sm">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8 lg:px-12">
        <Logo />
        <nav aria-label="Main navigation" className="hidden items-center gap-1 text-sm font-semibold text-yebo-deep/75 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} className="rounded-md px-3.5 py-2 transition-colors hover:bg-yebo-deep/5 hover:text-yebo-deep" href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden lg:inline-flex"><InstallAppButton className="press rounded-md px-3 py-2 text-sm font-semibold text-yebo-deep transition hover:bg-yebo-deep/5">Install app</InstallAppButton></span>
          <Link className="hidden rounded-md px-3 py-2 text-sm font-semibold text-yebo-deep transition-colors hover:bg-yebo-deep/5 sm:inline-flex" href="/login">Sign in</Link>
          <Link className="inline-flex min-h-11 items-center rounded-md bg-yebo-deep px-5 py-2.5 text-sm font-bold text-white transition hover:bg-yebo" href="/login">
            Get started
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
