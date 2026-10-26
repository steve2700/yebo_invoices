import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { entitlement } from "@/lib/subscription";
import { loadReminderItems, type FollowupRow } from "@/lib/reminders-load";
import ReminderQueue from "./ReminderQueue";
import { setMorningList } from "./actions";

export default async function Reminders() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await sb.from("businesses").select("id").maybeSingle();
  if (!business) redirect("/app/onboarding");

  const ent = await entitlement(sb);
  const allowed = !ent.enforced || Boolean(ent.plan?.reminders);

  const { data: rows } = allowed ? await sb.rpc("followups_due") : { data: [] };
  const items = allowed ? await loadReminderItems(sb, (rows ?? []) as FollowupRow[]) : [];

  // The switch needs migration 0024. Until it has been run, the page simply hides the switch.
  const { data: setting, error: settingError } = await sb.from("businesses").select("morning_list").maybeSingle();
  const morningOn = settingError ? null : Boolean((setting as { morning_list?: boolean } | null)?.morning_list ?? true);

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Reminders</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Ready to send</h1>
      <p className="mt-2 text-sm text-ink/60">Clients who owe you, or have not answered a quote. One tap each, from your own WhatsApp.</p>

      {!allowed ? (
        <div className="mt-6 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
          <p className="font-extrabold text-ink">Reminders are part of a paid plan</p>
          <p className="mt-2 text-sm text-ink/65">Upgrade to get your daily list of who to nudge, with the message already written.</p>
          <Link href="/app/subscribe?change=1" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-yebo px-6 text-sm font-extrabold text-white">See plans</Link>
        </div>
      ) : (
        <ReminderQueue items={items} />
      )}

      {allowed && morningOn !== null && (
        <form action={setMorningList} className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 text-sm shadow-sm">
          <span>
            <b className="block text-ink">Email me this list every morning</b>
            <span className="text-ink/60">Around 8am, only on days there is something to send.</span>
          </span>
          <input type="hidden" name="on" value={morningOn ? "0" : "1"} />
          <button type="submit" className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-extrabold ${morningOn ? "bg-lime text-ink" : "border-2 border-ink/15 text-ink"}`} aria-pressed={morningOn}>
            {morningOn ? "On" : "Off"}
          </button>
        </form>
      )}
      <Link href="/app" className="mt-8 inline-block text-sm font-semibold text-ink/50 hover:text-orange">← Dashboard</Link>
    </main>
  );
}
