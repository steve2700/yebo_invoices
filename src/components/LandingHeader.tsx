import Link from "next/link";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import { NAV_LINKS } from "@/lib/nav-links";
import { InstallAppButton } from "@/app/app/InstallPrompt";

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-yebo-deep/10 bg-yebo-chalk/85 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3.5 sm:px-8 lg:px-12">
        <Logo />
        <nav aria-label="Main navigation" className="hidden items-center gap-1 rounded-full border border-yebo-deep/10 bg-white/60 p-1 text-sm font-semibold text-yebo-deep/65 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} className="rounded-full px-4 py-2 transition-colors hover:bg-yebo-chalk hover:text-yebo-deep" href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden lg:inline-flex"><InstallAppButton className="press rounded-full border border-yebo-deep/15 bg-white px-4 py-2 text-sm font-bold text-yebo-deep transition hover:border-yebo hover:bg-yebo-chalk">Install app</InstallAppButton></span>
          <Link className="hidden rounded-full px-3 py-2 text-sm font-semibold text-yebo-deep transition-colors hover:bg-yebo-deep/5 sm:inline-flex" href="/login">Sign in</Link>
          <Link className="inline-flex min-h-11 items-center rounded-full bg-yebo-deep px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-yebo" href="/login">
            Get started <span aria-hidden="true" className="ml-2">↗</span>
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
