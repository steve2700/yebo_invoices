import { loadAdminData } from "@/lib/admin-data";
import { nudgesEnabled } from "@/lib/nudges";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { card, PageHead, Section } from "../ui";

export default async function Reminders() {
  const d = await loadAdminData();
  const on = nudgesEnabled();
  return (
    <>
      <PageHead title="Reminder emails" note="Friendly emails to people who signed up but stalled." />
      <div className={card}>
        <p className="text-sm text-yebo-deep">Status: <b>{on ? "ON" : "OFF"}</b>. {on ? "They go out once a day with the morning run." : "Nothing is sent. To turn on, add NUDGES_ENABLED=true in Vercel and redeploy."}</p>
        <p className="mt-2 text-sm text-yebo-deep/70">Due at the next daily run: <b>{d.due.length}</b> ({d.due.filter((x) => x.kind === "onboarding").length} to finish setup, {d.due.filter((x) => x.kind === "first_quote").length} to send a first quote). Rules: at most 2 of each kind, at least 3 days apart, stops after 30 days, with an unsubscribe link.</p>
      </div>
      {d.due.length > 0 && (
        <Section title="Who is due">
          <div className={card}>
            <ul className="flex flex-col gap-1 text-sm text-yebo-deep/80">
              {d.due.map((x) => <li key={x.userId} className="break-all">{x.email} · {x.kind === "onboarding" ? "finish setup" : "first quote"} · email number {x.sentBefore + 1}</li>)}
            </ul>
          </div>
        </Section>
      )}
      <Section title="Sent so far">
        <div className={card}>
          {!d.nudgeLog ? <p className="text-sm text-yebo-deep/60">Not set up yet. Run the tracking SQL.</p> : d.nudgeLog.length === 0 ? <p className="text-sm text-yebo-deep/60">Nothing sent yet.</p> : (
            <ul className="flex flex-col gap-1 text-sm text-yebo-deep/80">
              {d.nudgeLog.map((n, i) => <li key={i} className="break-all">{formatSouthAfricaDateTime(n.created_at)} · {n.kind === "onboarding" ? "finish setup" : "first quote"} · {n.email}</li>)}
            </ul>
          )}
        </div>
      </Section>
    </>
  );
}
