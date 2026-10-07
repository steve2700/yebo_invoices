import Link from "next/link";
import Logo from "@/components/Logo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-yebo-deep/10 bg-yebo-chalk">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 text-sm text-yebo-deep/55 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <Logo />
        <p>Made in South Africa for small business.</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-5 font-semibold text-yebo-deep/70">
          <Link className="transition-colors hover:text-yebo" href="#workflow">How it works</Link>
          <Link className="transition-colors hover:text-yebo" href="#features">Features</Link>
          <Link className="transition-colors hover:text-yebo" href="/login">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
