import { createAdminClient } from "@/lib/supabase/admin";
import { waLink } from "@/lib/dates";
import { formatRand } from "@/lib/money";
import { loadWeek, verdictFor, weekWindows } from "@/lib/weekly";
import { card, link, PageHead, Section, td, th } from "../ui";

export const dynamic = "force-dynamic";
const LIMIT = 60;

type Biz = { id: string; name: string | null; phone: string | null; weekly_review?: boolean | null; weekly_review_last?: string | null };

export default async function WeeklyAdmin() {
  const admin = createAdminClient();
  const w = weekWindows();
  let res = await admin.from("businesses").select("id,name,phone,weekly_review,weekly_review_last").order("created_at", { ascending: false }).limit(LIMIT);
  if (res.error) res = (await admin.from("businesses").select("id,name,phone").order("created_at", { ascending: false }).limit(LIMIT)) as typeof res;
  const list = (res.data ?? []) as Biz[];
  const rows = (await Promise.all(list.map(async (b) => ({ b, r: await loadWeek(admin, b.id) })))).filter((x) => x.r && x.r.week.everSent && (x.r.week.sent > 0 || x.r.week.accepted > 0 || x.r.week.collectedCents > 0 || x.r.week.overdue > 0));

  return (
    <>
      <PageHead title="Weekly reviews" note={`${w.label}. The Friday email goes out at 15:00. From Friday afternoon, tap WhatsApp to send the same week in a short message (you press send). Quiet businesses are left out.`} />
      <Section title={`Businesses with activity this week (${rows.length})`} note={`Newest ${LIMIT} businesses.`}>
        <div className={card + " overflow-x-auto"}>
          {rows.length === 0 ? <p className="text-sm text-yebo-deep/60">Nothing to show yet this week.</p> : (
            <table className="w-full min-w-[820px]">
              <thead><tr><th className={th}>Business</th><th className={th}>Sent</th><th className={th}>Opened</th><th className={th}>Accepted</th><th className={th}>Collected</th><th className={th}>Overdue</th><th className={th}>Email</th><th className={th}>WhatsApp</th></tr></thead>
              <tbody>
                {rows.map(({ b, r }) => {
                  const d = r!.week;
                  const v = verdictFor(d);
                  const name = b.name ?? "there";
                  const emailed = b.weekly_review_last === w.mondayDate;
                  const msg = `Hi ${name}, Steve from Yebo Invoices. Your week so far: ${d.sent} quote${d.sent === 1 ? "" : "s"} sent, ${d.opened} opened, ${d.accepted} accepted, ${formatRand(d.collectedCents)} collected${d.overdue ? `, ${d.overdue} overdue invoice${d.overdue === 1 ? "" : "s"} (${formatRand(d.overdueCents)})` : ""}. ${v.headline}.${emailed ? " I emailed you the full review." : ""} Anything I can help with?`;
                  return (
                    <tr key={b.id} className="border-t border-yebo-deep/10">
                      <td className={td + " font-bold"}>{name}</td>
                      <td className={td}>{d.sent}</td>
                      <td className={td}>{d.opened}</td>
                      <td className={td}>{d.accepted}</td>
                      <td className={td}>{formatRand(d.collectedCents)}</td>
                      <td className={td}>{d.overdue ? `${d.overdue} (${formatRand(d.overdueCents)})` : "-"}</td>
                      <td className={td}>{b.weekly_review === false ? "Switched off" : emailed ? "Sent" : "Not yet"}</td>
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
