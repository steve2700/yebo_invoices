import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { formatDate, waLink } from "@/lib/dates";
import { appUrl } from "@/lib/url";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestUrl, shareText } from "@/lib/requests";
import { sourceLabel } from "@/lib/request-sources";
import { formatVisit, visitMessage } from "@/lib/visit";
import CopyLink from "./CopyLink";
import ShareTools from "./ShareTools";
import { dismissRequest, startQuoteFromRequest } from "./actions";
import { proposeVisit } from "./visit-actions";

type Row = { id: string; created_at: string; name: string; whatsapp: string | null; email: string | null; location: string | null; details: string; status: string; source: string | null; preferred_date: string | null; photos: string[] | null; visit_at: string | null; visit_status: string | null; visit_note: string | null; visit_token: string | null };
type Look = { path: string; url: string };

export default async function Requests({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const sb = await createClient();
  const { data: business } = await sb.from("businesses").select("name,request_token").maybeSingle();
  if (!business) redirect("/app/onboarding");
  const { data, error } = await sb.from("quote_requests").select("id,created_at,name,whatsapp,email,location,details,status,source,preferred_date,photos,visit_at,visit_status,visit_note,visit_token").neq("status", "dismissed").order("created_at", { ascending: false }).limit(50);
  const rows = (data ?? []) as Row[];

  // How many requests each place has brought (dismissed ones included), and short-lived links to the photos clients attached.
  const { data: all } = await sb.from("quote_requests").select("source").limit(1000);
  const counts: Record<string, number> = {};
  for (const r of all ?? []) { const k = (r as { source: string | null }).source || ""; counts[k] = (counts[k] ?? 0) + 1; }
  const places = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const paths = rows.filter((r) => r.status === "new").flatMap((r) => r.photos ?? []);
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data: urls } = await createAdminClient().storage.from("request-photos").createSignedUrls(paths, 3600);
    for (const u of (urls ?? []) as { path: string | null; signedUrl: string }[]) if (u.path) signed[u.path] = u.signedUrl;
  }
  const looks = (r: Row): Look[] => (r.photos ?? []).filter((p) => signed[p]).map((p) => ({ path: p, url: signed[p] }));
  const link = business.request_token ? requestUrl(appUrl(), business.request_token) : null;
  const fresh = rows.filter((r) => r.status === "new");
  const done = rows.filter((r) => r.status !== "new");
  const btn = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo";

  return (
    <main className="min-h-full bg-paper px-4 pb-10 pt-6 text-ink sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">Quote requests</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">Send your clients this link. They tell you about the job, you get a notification and turn it into a quote in one tap.</p>
        </header>

        {error && <p role="alert" className="rounded-2xl bg-orange/10 p-4 text-sm text-ink">Quote requests are not set up yet. Run the latest SQL (0028 and 0029) in Supabase, then refresh.</p>}
        {e === "visit" && <p role="alert" className="rounded-2xl bg-orange/10 p-4 text-sm text-ink">Pick a day and time from now onwards, then try again. (If it keeps failing, run the latest SQL, 0030, in Supabase.)</p>}
        {e === "visit-ok" && <p role="status" className="rounded-2xl bg-yebo-chalk p-4 text-sm font-bold text-yebo-deep">Visit proposed. Send the link to your client on WhatsApp below.</p>}
        {e === "client" && <p role="alert" className="rounded-2xl bg-orange/10 p-4 text-sm text-ink">Could not save that client. Please try again.</p>}

        {link && (
          <section aria-labelledby="link-h" className="rounded-3xl border border-ink/10 bg-white p-5 sm:p-6">
            <h2 id="link-h" className="text-lg font-extrabold">Your request link</h2>
            <p className="mt-2 break-all rounded-xl bg-yebo-chalk px-3 py-3 text-sm font-semibold text-yebo-deep">{link}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyLink text={link} />
              <a href={waLink(null, shareText(business.name, link))} target="_blank" rel="noreferrer" className={`${btn} bg-yebo text-white hover:bg-yebo-deep`}>Share on WhatsApp</a>
            </div>
            <p className="mt-3 text-xs leading-5 text-ink/50">Below you can make a QR code for your van or business card, and a separate link for each place you share it.</p>
          </section>
        )}

        {business.request_token && <ShareTools base={appUrl()} token={business.request_token} businessName={business.name} counts={counts} />}

        {places.length > 0 && (
          <section aria-labelledby="where-h" className="rounded-3xl border border-ink/10 bg-white p-5 sm:p-6">
            <h2 id="where-h" className="text-lg font-extrabold">Where requests came from</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {places.map(([k, n]) => (
                <li key={k || "direct"} className="flex items-center gap-3 text-sm">
                  <span className="w-44 shrink-0 truncate font-semibold">{sourceLabel(k)}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/5"><span className="block h-full rounded-full bg-yebo" style={{ width: `${Math.max(6, (n / places[0][1]) * 100)}%` }} /></span>
                  <span className="w-6 text-right font-bold">{n}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="new-h">
          <h2 id="new-h" className="text-lg font-extrabold">New ({fresh.length})</h2>
          {fresh.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink/60">No new requests. When someone fills in your link, it shows up here and you get an email.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {fresh.map((r) => (
                <li key={r.id} className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-base font-extrabold">{r.name}</p>
                    <p className="text-xs text-ink/50">{formatSouthAfricaDateTime(r.created_at)}</p>
                  </div>
                  {r.location && <p className="mt-1 text-xs font-semibold text-ink/55">{r.location}</p>}
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/80">{r.details}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    {r.preferred_date && <span className="rounded-full bg-orange/10 px-2.5 py-1 text-ink">Wants it done: {formatDate(r.preferred_date)}</span>}
                    <span className="rounded-full bg-yebo-chalk px-2.5 py-1 text-yebo-deep">From: {sourceLabel(r.source)}</span>
                  </div>
                  {looks(r).length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {looks(r).map((p) => (
                        <li key={p.path}>
                          <a href={p.url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt="Photo from the client" className="size-24 rounded-xl object-cover ring-1 ring-ink/10" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 rounded-2xl bg-paper p-3">
                    {r.visit_at && r.visit_token ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm">
                          <span className="font-extrabold">Site visit: <span className="capitalize">{formatVisit(r.visit_at)}</span></span>{" "}
                          {r.visit_status === "confirmed" ? <span className="rounded-full bg-yebo px-2 py-0.5 text-xs font-bold text-white">Confirmed</span>
                            : r.visit_status === "declined" ? <span className="rounded-full bg-orange/20 px-2 py-0.5 text-xs font-bold">Wants another day</span>
                            : <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold">Waiting for reply</span>}
                        </p>
                        {r.visit_status === "proposed" && r.whatsapp && (
                          <a className={`${btn} bg-yebo text-white hover:bg-yebo-deep`} target="_blank" rel="noreferrer" href={waLink(r.whatsapp, visitMessage(business.name, r.visit_at, `${appUrl()}/v/${r.visit_token}`))}>Send link on WhatsApp</a>
                        )}
                      </div>
                    ) : null}
                    {r.visit_status === "declined" && r.visit_note && <p className="mt-2 text-sm text-ink/70">They wrote: “{r.visit_note}”</p>}
                    {r.visit_status !== "confirmed" && (
                      <form action={proposeVisit} className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <label className="sr-only" htmlFor={`visit-${r.id}`}>Day and time of the site visit</label>
                        <input id={`visit-${r.id}`} name="visit_at" type="datetime-local" required className="min-h-11 rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none focus:border-yebo focus:ring-2 focus:ring-yebo/20" />
                        <button className={`${btn} border border-ink/15 bg-white hover:bg-yebo-chalk`}>{r.visit_at ? "Propose another time" : "Propose a site visit"}</button>
                      </form>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={startQuoteFromRequest}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className={`${btn} bg-yebo text-white hover:bg-yebo-deep`}>Make a quote</button>
                    </form>
                    {r.whatsapp && (
                      <a className={`${btn} border border-ink/15 bg-white hover:bg-yebo-chalk`} target="_blank" rel="noreferrer" href={waLink(r.whatsapp, `Hi ${r.name.split(" ")[0]}, thanks for your request. I have seen it and will send your quote shortly.`)}>WhatsApp</a>
                    )}
                    {r.email && <a className={`${btn} border border-ink/15 bg-white hover:bg-yebo-chalk`} href={`mailto:${r.email}`}>Email</a>}
                    <form action={dismissRequest}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className={`${btn} text-ink/55 hover:bg-ink/5`}>Dismiss</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {done.length > 0 && (
          <section aria-labelledby="done-h">
            <h2 id="done-h" className="text-lg font-extrabold">Already quoted ({done.length})</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {done.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm">
                  <span className="min-w-0 truncate"><b>{r.name}</b> <span className="text-ink/50">· {formatSouthAfricaDateTime(r.created_at)}</span></span>
                  <Link href="/app/documents" className="font-bold text-yebo">See documents</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
