import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { waLink } from "@/lib/dates";
import { appUrl } from "@/lib/url";
import { requestUrl, shareText } from "@/lib/requests";
import CopyLink from "./CopyLink";
import { dismissRequest, startQuoteFromRequest } from "./actions";

type Row = { id: string; created_at: string; name: string; whatsapp: string | null; email: string | null; location: string | null; details: string; status: string };

export default async function Requests({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const sb = await createClient();
  const { data: business } = await sb.from("businesses").select("name,request_token").maybeSingle();
  if (!business) redirect("/app/onboarding");
  const { data, error } = await sb.from("quote_requests").select("id,created_at,name,whatsapp,email,location,details,status").neq("status", "dismissed").order("created_at", { ascending: false }).limit(50);
  const rows = (data ?? []) as Row[];
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

        {error && <p role="alert" className="rounded-2xl bg-orange/10 p-4 text-sm text-ink">Quote requests are not set up yet. Run the latest SQL (0028) in Supabase, then refresh.</p>}
        {e === "client" && <p role="alert" className="rounded-2xl bg-orange/10 p-4 text-sm text-ink">Could not save that client. Please try again.</p>}

        {link && (
          <section aria-labelledby="link-h" className="rounded-3xl border border-ink/10 bg-white p-5 sm:p-6">
            <h2 id="link-h" className="text-lg font-extrabold">Your request link</h2>
            <p className="mt-2 break-all rounded-xl bg-yebo-chalk px-3 py-3 text-sm font-semibold text-yebo-deep">{link}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyLink text={link} />
              <a href={waLink(null, shareText(business.name, link))} target="_blank" rel="noreferrer" className={`${btn} bg-yebo text-white hover:bg-yebo-deep`}>Share on WhatsApp</a>
            </div>
            <p className="mt-3 text-xs leading-5 text-ink/50">Put it in your WhatsApp status, on your Facebook page, on a sticker on your van or at the bottom of your emails.</p>
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
                  <div className="mt-4 flex flex-wrap gap-2">
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
