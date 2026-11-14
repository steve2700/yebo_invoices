import Link from "next/link";
import Logo from "@/components/Logo";
import { FEATURE_GROUPS } from "@/lib/features";
import FeaturedOn from "@/components/FeaturedOn";

const link = "inline-flex min-h-10 items-center text-white/75 transition-colors hover:text-white hover:underline";
const head = "mb-1 text-xs font-extrabold uppercase tracking-[.14em] text-yebo-sun";

export default function LandingFooter() {
  return (
    <footer>
      <div className="border-t border-white/10 bg-[#082b21] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 text-sm sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-12">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-base leading-7 text-white/75">Quotes clients say yes to. Built by a working carpenter in Gauteng for South African small business.</p>
            <Link href="/login" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-yebo-sun px-5 text-sm font-extrabold text-yebo-deep transition hover:brightness-95">
              Send your first quote
            </Link>
          </div>
          <nav aria-label="Features" className="flex flex-col">
            <p className={head}>Features</p>
            {FEATURE_GROUPS.map((g) => (
              <Link key={g.slug} className={link} href={`/features/${g.slug}`}>{g.name}</Link>
            ))}
            <Link className={link} href="/tenders">Tenders</Link>
            <Link className={link} href="/jobs">Local carpenters</Link>
          </nav>
          <nav aria-label="Company" className="flex flex-col">
            <p className={head}>Yebo</p>
            <Link className={link} href="/how-it-works">How it works</Link>
            <Link className={link} href="/why-yebo">Why Yebo</Link>
            <Link className={link} href="/why-i-built-yebo-invoices">Our story</Link>
            <Link className={link} href="/pricing">Pricing</Link>
            <Link className={link} href="/which-plan">Which plan?</Link>
            <Link className={link} href="/faq">Questions</Link>
          </nav>
          <nav aria-label="Account and legal" className="flex flex-col">
            <p className={head}>Account</p>
            <Link className={link} href="/login">Sign in</Link>
            <Link className={link} href="/privacy">Privacy</Link>
            <Link className={link} href="/terms">Terms</Link>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-white/55 sm:px-8 lg:px-12">Made in South Africa for people who work with their hands.</p>
        </div>
      </div>
      <div className="bg-yebo-chalk">
        <FeaturedOn />
      </div>
    </footer>
  );
}
