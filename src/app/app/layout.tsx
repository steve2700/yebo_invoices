import Link from "next/link";
import Logo from "@/components/Logo";
import InstallPrompt from "./InstallPrompt";
import BottomNav from "./BottomNav";
import { billingBanner } from "@/lib/subscription";
import Icon from "./icons";
import AttentionChime from "./AttentionChime";
import OwnerMark from "./OwnerMark";
import { loadAttention } from "@/lib/attention";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [banner, attention] = await Promise.all([billingBanner(), loadAttention()]);
  const link = "rounded-full px-3 py-1.5 text-sm font-semibold text-yebo-deep/70 hover:bg-yebo-deep/5 hover:text-yebo-deep";
  return (
    <>
      <OwnerMark />
      <header className="sticky top-0 z-20 border-b border-yebo-deep/10 bg-yebo-chalk/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="shrink-0"><Logo href="/app" /></div>
          <nav aria-label="Account" className="flex min-w-0 items-center gap-1">
            <InstallPrompt />
            <Link href="/app/documents" className={`${link} hidden sm:inline-flex`}>Documents</Link>
            <Link href="/app/tenders" className={`${link} hidden sm:inline-flex`}>Tenders</Link>
            <Link href="/app/reports/vat" className={`${link} hidden sm:inline-flex`}>Reports</Link>
            <Link href="/app/settings" className={`${link} hidden sm:inline-flex`}>Settings</Link>
            {/* Phones: Documents, Tenders and Reports live in the bottom bar, and Settings is this gear. */}
            <Link href="/app/settings" aria-label="Settings" className="inline-flex size-10 items-center justify-center rounded-full text-yebo-deep/70 hover:bg-yebo-deep/5 hover:text-yebo-deep sm:hidden">
              <Icon name="settings" size={22} />
            </Link>
            <Link href="/app/quotes/new" className="ml-1 hidden rounded-full bg-yebo px-4 py-1.5 text-sm font-bold text-white hover:bg-yebo-deep sm:inline-flex">New quote</Link>
          </nav>
        </div>
      </header>
      {banner && (
        <div role="status" className={`border-b px-4 py-2.5 text-center text-sm font-semibold ${banner.tone === "warn" ? "border-orange/30 bg-orange/10 text-yebo-deep" : "border-yebo/20 bg-lime/25 text-yebo-deep"}`}>
          {banner.text} <Link href="/app/settings#billing" className="underline underline-offset-2">Manage plan</Link>
        </div>
      )}
      <div className="min-w-0 pb-[var(--tab-h)]">{children}</div>
      <BottomNav />
      {attention && <AttentionChime signature={attention.signature} count={attention.overdue + attention.closingSoon} />}
    </>
  );
}
