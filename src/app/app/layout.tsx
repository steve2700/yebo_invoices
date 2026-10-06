import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
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
      <header className="sticky top-0 z-10 border-b border-yebo-deep/10 bg-yebo-chalk/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-5 py-3">
          <Logo href="/app" />
          <nav className="flex items-center gap-1">
            <Link href="/app/documents" className={link}>Documents</Link>
            <Link href="/app/settings" className={link}>Settings</Link>
            <Link href="/app/quotes/new" className="ml-1 rounded-full bg-yebo px-4 py-1.5 text-sm font-bold text-white hover:bg-yebo-deep">New quote</Link>
            <form action={signOut}><button className={link}>Sign out</button></form>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
