import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVisit, visitMessage } from "@/lib/visit";
import { waLink } from "@/lib/dates";

type Visit = { id: string; name: string; whatsapp: string | null; visit_at: string; visit_status: string; visit_token: string | null };

// Top of the dashboard: site visits coming up, new quote requests waiting, or a quiet reminder that the request link exists.
// Any failure (for example the SQL has not been run yet) shows nothing, never a broken page.
export default async function RequestsReady() {
  try {
    const sb = await createClient();
    const { count, error } = await sb.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new");
    if (error) return null;
    const n = count ?? 0;

    // Site visits in the next 7 days (and any from the last 3 hours), confirmed or still waiting for the client.
    let visits: Visit[] = [];
    let bizName = "";
    try {
      const from = new Date(Date.now() - 3 * 3600000).toISOString();
      const to = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data } = await sb.from("quote_requests").select("id,name,whatsapp,visit_at,visit_status,visit_token")
        .in("visit_status", ["confirmed", "proposed"]).neq("status", "dismissed").gte("visit_at", from).lte("visit_at", to).order("visit_at").limit(5);
      visits = (data ?? []) as Visit[];
      if (visits.length) { const { data: b } = await sb.from("businesses").select("name").maybeSingle(); bizName = b?.name ?? ""; }
    } catch { visits = []; }

    return (
      <>
        {visits.length > 0 && (
          <div className="bg-paper px-4 pt-4 sm:px-6 lg:px-8">
            <section aria-label="Upcoming site visits" className="mx-auto max-w-6xl rounded-2xl border border-ink/10 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/50">Site visits coming up</p>
              <ul className="mt-2 divide-y divide-ink/10">
                {visits.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <p className="min-w-0 text-sm">
                      <b className="capitalize">{formatVisit(v.visit_at)}</b> · {v.name}{" "}
                      {v.visit_status === "confirmed"
                        ? <span className="rounded-full bg-yebo px-2 py-0.5 text-xs font-bold text-white">Confirmed</span>
                        : <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold">Waiting for reply</span>}
                    </p>
                    {v.whatsapp && v.visit_token && (
                      <a target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-ink/15 px-3 text-sm font-bold hover:bg-yebo-chalk"
                        href={waLink(v.whatsapp, v.visit_status === "confirmed"
                          ? `Hi ${v.name.split(" ")[0]}, a quick reminder: ${bizName || "we"} will be at your place on ${formatVisit(v.visit_at)}. See you then.`
                          : visitMessage(bizName || "We", v.visit_at, `${process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || "https://www.yeboinvoices.com"}/v/${v.visit_token}`))}>
                        {v.visit_status === "confirmed" ? "Remind on WhatsApp" : "Nudge on WhatsApp"}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              <Link href="/app/requests" className="mt-2 inline-block text-sm font-bold text-yebo">All quote requests</Link>
            </section>
          </div>
        )}
        {n === 0 ? (
          <div className="bg-paper px-4 pt-4 sm:px-6 lg:px-8">
            <Link href="/app/requests" className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70 hover:bg-yebo-chalk/50">
              <span><b className="text-ink">Get quote requests from clients.</b> Share your request link and the job details arrive here.</span>
              <span className="shrink-0 font-bold text-yebo" aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <div className="bg-paper px-4 pt-4 sm:px-6 lg:px-8">
            <Link href="/app/requests" className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl bg-yebo px-5 py-4 text-white shadow-sm transition hover:bg-yebo-deep">
              <span>
                <span className="block text-base font-extrabold">{n} new quote request{n === 1 ? "" : "s"}</span>
                <span className="block text-sm text-white/80">A client is waiting for a price. Reply fast to win the job.</span>
              </span>
              <span className="shrink-0 rounded-xl bg-lime px-4 py-2 text-sm font-extrabold text-ink">Open</span>
            </Link>
          </div>
        )}
      </>
    );
  } catch {
    return null;
  }
}
