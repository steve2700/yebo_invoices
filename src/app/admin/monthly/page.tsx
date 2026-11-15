import { createAdminClient } from "@/lib/supabase/admin";
import { waLink } from "@/lib/dates";
import { formatRand } from "@/lib/money";
import { hasMonthActivity, loadMonth, monthWindows, winRate } from "@/lib/monthly";
import { card, link, PageHead, Section, td, th } from "../ui";

export const dynamic = "force-dynamic";
const LIMIT = 60;

export default async function Monthly() {
  const admin = createAdminClient();
  const w = monthWindows();
  let res = await admin.from("businesses").select("id,name,email,phone,owner_id,monthly_report_last").order("created_at", { ascending: false }).limit(LIMIT);
  if (res.error) res = (await admin.from("businesses").select("id,name,email,phone,owner_id").order("created_at", { ascending: false }).limit(LIMIT)) as typeof res;
  const list = (res.data ?? []) as { id: string; name: string | null; email: string | null; phone: string | null; monthly_report_last?: string | null }[];
  const rows = await Promise.all(list.map(async (b) => ({ b, m: await loadMonth(admin, b.id) })));
  const active = rows.filter((r) => r.m && hasMonthActivity(r.m.data));

  return (
    <>
      <PageHead title="Monthly reports" note={`${w.label} so far. The email goes out on the last day of the month at 15:00. If someone may not have seen it, one tap writes the WhatsApp message for you; you press send.`} />
      <Section title={`Businesses with activity this month (${active.length})`} note={`Newest ${LIMIT} businesses. Quiet ones are left out.`}>
        <div className={card + " overflow-x-auto"}>
          {active.length === 0 ? <p className="text-sm text-yebo-deep/60">Nothing to show yet this month.</p> : (
            <table className="w-full min-w-[760px]">
              <thead><tr><th className={th}>Business</th><th className={th}>Sent</th><th className={th}>Accepted</th><th className={th}>Collected</th><th className={th}>Overdue</th><th className={th}>Email</th><th className={th}>WhatsApp</th></tr></thead>
              <tbody>
                {active.map(({ b, m }) => {
                  const d = m!.data;
                  const rate = winRate(d);
                  const name = b.name ?? "there";
                  const msg = `Hi ${name}, Steve from Yebo Invoices. Your ${w.label} so far: ${d.sent} quotes sent, ${d.accepted} accepted${rate !== null ? ` (${rate}% said yes)` : ""}, ${formatRand(d.collectedCents)} collected${d.overdue ? `, ${d.overdue} overdue invoice${d.overdue === 1 ? "" : "s"} (${formatRand(d.overdueCents)})` : ""}. I emailed you the full report. Anything I can help with?`;
                  return (
                    <tr key={b.id} className="border-t border-yebo-deep/10">
                      <td className={td + " font-bold"}>{name}</td>
                      <td className={td}>{d.sent}</td>
                      <td className={td}>{d.accepted}</td>
                      <td className={td}>{formatRand(d.collectedCents)}</td>
                      <td className={td}>{d.overdue ? `${d.overdue} (${formatRand(d.overdueCents)})` : "-"}</td>
                      <td className={td}>{b.monthly_report_last === w.key ? "Sent" : "Not yet"}</td>
                      <td className={td}>{b.phone ? <a className={link} target="_blank" rel="noreferrer" href={waLink(b.phone, msg)}>WhatsApp</a> : "no phone"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </>
  );
}
