import Link from "next/link";
import Logo from "@/components/Logo";

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-yebo-deep/10 bg-yebo-chalk/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-12">
        <Logo />
        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-semibold text-yebo-deep/65 md:flex">
          <Link className="transition-colors hover:text-yebo-deep" href="#workflow">How it works</Link>
          <Link className="transition-colors hover:text-yebo-deep" href="#features">For your business</Link>
          <Link className="transition-colors hover:text-yebo-deep" href="#voice-notes">Voice quotes</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link className="hidden rounded-full px-3 py-2 text-sm font-semibold text-yebo-deep transition-colors hover:bg-yebo-deep/5 sm:inline-flex" href="/login">Sign in</Link>
          <Link className="inline-flex min-h-11 items-center rounded-full bg-yebo-deep px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-yebo" href="/login">
            Get started <span aria-hidden="true" className="ml-2">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
