import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import InstallPrompt from "./InstallPrompt";
import BottomNav from "./BottomNav";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/login");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
      <div className="pb-[var(--tab-h)]">{children}</div>
      <BottomNav />
    </>
  );
}
