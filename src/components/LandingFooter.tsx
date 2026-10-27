import Link from "next/link";
import Logo from "@/components/Logo";
import { FEATURE_GROUPS } from "@/lib/features";

const link = "inline-flex min-h-10 items-center transition-colors hover:text-yebo hover:underline";

export default function LandingFooter() {
  return (
    <footer className="border-t border-yebo-deep/15 bg-yebo-chalk">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 text-sm text-yebo-deep/75 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:px-12">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs">Quoting and invoicing for South African small business.</p>
        </div>
        <nav aria-label="Features" className="flex flex-col">
          <p className="font-bold text-yebo-deep">Features</p>
          {FEATURE_GROUPS.map((g) => (
            <Link key={g.slug} className={link} href={`/features/${g.slug}`}>{g.name}</Link>
          ))}
          <Link className={link} href="/tenders">Tenders</Link>
        </nav>
        <nav aria-label="Company" className="flex flex-col">
          <p className="font-bold text-yebo-deep">Yebo</p>
          <Link className={link} href="/how-it-works">How it works</Link>
          <Link className={link} href="/why-yebo">Why Yebo</Link>
          <Link className={link} href="/why-i-built-yebo-invoices">Our story</Link>
          <Link className={link} href="/pricing">Pricing</Link>
          <Link className={link} href="/faq">Questions</Link>
        </nav>
        <nav aria-label="Account and legal" className="flex flex-col">
          <p className="font-bold text-yebo-deep">Account</p>
          <Link className={link} href="/login">Sign in</Link>
          <Link className={link} href="/privacy">Privacy</Link>
          <Link className={link} href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
