import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import InstallPrompt from "./InstallPrompt";
import BottomNav from "./BottomNav";
import { createClient } from "@/lib/supabase/server";
import { billingBanner } from "@/lib/subscription";

async function signOut() {
  "use server";
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const banner = await billingBanner();
  const link = "rounded-full px-3 py-1.5 text-sm font-semibold text-yebo-deep/70 hover:bg-yebo-deep/5 hover:text-yebo-deep";
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-yebo-deep/10 bg-yebo-chalk/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Logo href="/app" />
          <nav className="flex items-center gap-1">
            <InstallPrompt />
            <Link href="/app/documents" className={`${link} hidden sm:inline-flex`}>Documents</Link>
            <Link href="/app/settings" className={`${link} hidden sm:inline-flex`}>Settings</Link>
            <Link href="/app/quotes/new" className="ml-1 hidden rounded-full bg-yebo px-4 py-1.5 text-sm font-bold text-white hover:bg-yebo-deep sm:inline-flex">New quote</Link>
            <form action={signOut}><button className={`${link} text-xs sm:text-sm`}>Sign out</button></form>
          </nav>
        </div>
      </header>
      {banner && (
        <div role="status" className={`border-b px-4 py-2.5 text-center text-sm font-semibold ${banner.tone === "warn" ? "border-orange/30 bg-orange/10 text-yebo-deep" : "border-yebo/20 bg-lime/25 text-yebo-deep"}`}>
          {banner.text} <Link href="/app/settings#billing" className="underline underline-offset-2">Manage plan</Link>
        </div>
      )}
      <div className="pb-[var(--tab-h)]">{children}</div>
      <BottomNav />
    </>
  );
}
