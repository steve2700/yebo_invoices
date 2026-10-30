import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminList, isAdminEmail } from "@/lib/admin-stats";
import AdminGate from "./AdminGate";
import AdminNav from "./AdminNav";

export const metadata: Metadata = { title: "Admin | Yebo Invoices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Every page under /admin goes through this check, so a new admin page can never be left open by mistake.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email, adminList())) return <AdminGate />;

  const { count } = await createAdminClient().from("error_log").select("id", { count: "exact", head: true }).eq("resolved", false);
  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/people", label: "People to follow up" },
    { href: "/admin/growth", label: "Growth" },
    { href: "/admin/revenue", label: "Revenue" },
    { href: "/admin/survey", label: "Survey" },
    { href: "/admin/errors", label: "Errors", badge: count ?? 0 },
    { href: "/admin/reminders", label: "Reminder emails" },
  ];

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="bg-yebo-deep p-4 text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:p-5">
        <div className="flex items-center justify-between gap-3 lg:block">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo-sun">Yebo admin</p>
            <p className="mt-1 hidden text-sm text-white/60 lg:block">Only you can see this.</p>
          </div>
          <Link href="/app" className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 lg:mt-4 lg:inline-block">Back to the app</Link>
        </div>
        <div className="mt-4 lg:mt-6"><AdminNav items={items} /></div>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
