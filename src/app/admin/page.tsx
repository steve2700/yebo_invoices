import Link from "next/link";
import { loadAdminData } from "@/lib/admin-data";
import { pct } from "@/lib/admin-stats";
import { card, link, PageHead, Section, Stat, td, th } from "./ui";

export default async function Overview() {
  const d = await loadAdminData();
  const peak = Math.max(1, ...d.signupDays.map((x) => x.count), ...d.docDays.map((x) => x.count));
  const docsRev = [...d.docDays].reverse();
  return (
    <>
      <PageHead title="What is happening in Yebo" note="The big picture. Use the menu on the left for the detail." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="People signed up" value={d.users.length} />
        <Stat label="Businesses set up" value={d.businesses.length} />
        <Stat label="Paid per month" value={"R" + d.mrr.toLocaleString("en-ZA")} hint={d.activeSubs.length + " paying"} />
        <Stat label="Open errors" value={d.errors ? d.errors.length : "-"} tone={d.errors && d.errors.length > 0 ? "warn" : undefined} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/admin/people"><Stat label="Stuck before onboarding" value={d.notOnboarded.length} hint="See who" /></Link>
        <Link href="/admin/people"><Stat label="No quote sent yet" value={d.noSentQuote.length} hint="See who" /></Link>
        <Link href="/admin/reminders"><Stat label="Reminder emails due" value={d.due.length} hint="Next daily run" /></Link>
        <Link href="/admin/growth"><Stat label="Visits, last 7 days" value={d.sources7.reduce((s, x) => s + x.count, 0)} hint="See sources" /></Link>
      </div>

      <Section title="From sign-up to paid">
        <div className={card}>
          <ol className="flex flex-col gap-3">
            {d.funnel.map((step, i) => (
              <li key={step.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-bold text-yebo-deep">{step.label}</span>
                  <span className="tabular-nums text-yebo-deep/70">
                    <b className="text-yebo-deep">{step.value}</b>
                    {i > 0 && <span> · {pct(step.value, d.funnel[i - 1].value)}% of the step before</span>}
                  </span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-yebo-deep/10">
                  <div className="h-full rounded-full bg-yebo" style={{ width: pct(step.value, d.funnel[0].value) + "%" }} />
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-5 text-yebo-deep/55">A person counts as signed up when they have an account. They finish onboarding when their business is created.</p>
        </div>
      </Section>

      <Section title="Last 14 days">
        <div className={card + " overflow-x-auto"}>
          <table className="w-full min-w-[460px] text-sm">
            <thead><tr><th className={th}>Day</th><th className={th}>New sign-ups</th><th className={th}>Quotes and invoices created</th></tr></thead>
            <tbody>
              {[...d.signupDays].reverse().map((x, i) => (
                <tr key={x.day} className="border-t border-yebo-deep/10">
                  <td className={td}>{x.day}</td>
                  <td className={td}><span className="inline-block h-2 rounded-full bg-yebo align-middle" style={{ width: Math.max(2, (x.count / peak) * 120) + "px" }} /> <b className="ml-2">{x.count}</b></td>
                  <td className={td}><span className="inline-block h-2 rounded-full bg-yebo-sun align-middle" style={{ width: Math.max(2, (docsRev[i].count / peak) * 120) + "px" }} /> <b className="ml-2">{docsRev[i].count}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm"><Link className={link} href="/admin/people">Who should I follow up with?</Link></p>
      </Section>
    </>
  );
}
