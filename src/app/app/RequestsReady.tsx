import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Top of the dashboard: new quote requests waiting, or a quiet reminder that the request link exists.
// Any failure (for example the SQL has not been run yet) shows nothing, never a broken page.
export default async function RequestsReady() {
  try {
    const sb = await createClient();
    const { count, error } = await sb.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new");
    if (error) return null;
    const n = count ?? 0;
    if (n === 0) {
      return (
        <div className="bg-paper px-4 pt-4 sm:px-6 lg:px-8">
          <Link href="/app/requests" className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70 hover:bg-yebo-chalk/50">
            <span><b className="text-ink">Get quote requests from clients.</b> Share your request link and the job details arrive here.</span>
            <span className="shrink-0 font-bold text-yebo" aria-hidden="true">→</span>
          </Link>
        </div>
      );
    }
    return (
      <div className="bg-paper px-4 pt-4 sm:px-6 lg:px-8">
        <Link href="/app/requests" className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl bg-yebo px-5 py-4 text-white shadow-sm transition hover:bg-yebo-deep">
          <span>
            <span className="block text-base font-extrabold">{n} new quote request{n === 1 ? "" : "s"}</span>
            <span className="block text-sm text-white/80">A client is waiting for a price. Reply fast to win the job.</span>
          </span>
          <span className="shrink-0 rounded-xl bg-lime px-4 py-2 text-sm font-extrabold text-ink">Open</span>
        </Link>
      </div>
    );
  } catch {
    return null;
  }
}
