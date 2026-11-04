import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AREAS, TRADES } from "@/lib/opportunities";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { saveOpportunities } from "./actions";

export const dynamic = "force-dynamic";

const box = "flex min-h-11 items-center gap-3 rounded-2xl bg-white px-4 text-base font-bold shadow-sm";

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const sb = await createClient();
  const { data: business, error } = await sb.from("businesses").select("opp_enabled,opp_trades,opp_areas").maybeSingle();
  if (!business && !error) redirect("/app/onboarding");
  const { data: jobs } = await sb.from("quote_requests").select("id,created_at,name,location,source").like("source", "yebo-%").order("created_at", { ascending: false }).limit(10);
  const trades: string[] = business?.opp_trades ?? [];
  const areas: string[] = business?.opp_areas ?? [];

  return (
    <main className="min-h-full bg-paper px-4 pb-10 pt-6 text-ink sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">Opportunities</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">
            Homeowners ask for quotes on Yebo&apos;s local pages. Switch this on and jobs for your trade and areas land in your Quote requests, with an email, just like a request from your own link. Up to 3 businesses get each job, so reply fast.
          </p>
        </header>

        <p role="note" className="rounded-2xl bg-orange/10 p-4 text-sm leading-6"><b>New and still being rolled out.</b> We are testing this with a few businesses first, so expect changes and not many jobs at the start. Tell us what works and what does not.</p>

        {error && <p role="alert" className="rounded-2xl bg-orange/10 p-4 text-sm">Opportunities is not set up yet. Run the latest SQL (0038) in Supabase, then refresh.</p>}
        {e === "on" && <p role="status" className="rounded-2xl bg-yebo-chalk p-4 text-sm font-bold text-yebo-deep">You are on. New local jobs will show up in Quote requests.</p>}
        {e === "off" && <p role="status" className="rounded-2xl bg-yebo-chalk p-4 text-sm font-bold text-yebo-deep">Switched off. You will not get new local jobs.</p>}
        {e === "pick" && <p role="alert" className="rounded-2xl bg-orange/10 p-4 text-sm">Pick at least one trade and one area, then save.</p>}
        {e === "save" && <p role="alert" className="rounded-2xl bg-orange/10 p-4 text-sm">Could not save that. Please try again.</p>}

        <form action={saveOpportunities} className="flex flex-col gap-5 rounded-3xl bg-yebo-chalk p-5">
          <label className={box}><input type="checkbox" name="enabled" defaultChecked={business?.opp_enabled ?? false} className="size-5" /> Send me local jobs</label>
          <fieldset>
            <legend className="text-sm font-extrabold">My trade</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {TRADES.map((t) => <label key={t.key} className={box}><input type="checkbox" name="trade" value={t.key} defaultChecked={trades.includes(t.key)} className="size-5" /> {t.label}</label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-extrabold">Areas I work in</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {AREAS.map((a) => <label key={a.key} className={box}><input type="checkbox" name="area" value={a.key} defaultChecked={areas.includes(a.key)} className="size-5" /> {a.label}</label>)}
            </div>
          </fieldset>
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-yebo px-5 text-base font-extrabold text-white hover:brightness-95">Save</button>
        </form>

        <section>
          <h2 className="text-lg font-extrabold">Latest local jobs</h2>
          {jobs?.length ? (
            <ul className="mt-3 space-y-2">
              {jobs.map((j) => (
                <li key={j.id} className="rounded-2xl bg-white p-4 text-sm shadow-sm">
                  <b>{j.name}</b>{j.location ? `, ${j.location}` : ""}
                  <span className="block text-ink/55">{formatSouthAfricaDateTime(j.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink/60">None yet. They appear here and in Quote requests the moment they arrive.</p>
          )}
          <Link href="/app/requests" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-bold shadow-sm hover:underline">Open Quote requests</Link>
        </section>
      </div>
    </main>
  );
}
