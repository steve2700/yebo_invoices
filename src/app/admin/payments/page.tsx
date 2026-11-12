import { createAdminClient } from "@/lib/supabase/admin";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { waLink } from "@/lib/dates";
import { PLANS, isPlanId } from "@/lib/plans";
import { card, link, Missing, PageHead, Section, td, th } from "../ui";
import { confirmEft, rejectEft } from "./actions";

type Biz = { id: string; name: string; email: string | null; phone: string | null; owner_id: string };
type SubRow = { business_id: string; status: string; plan: string; provider: string | null; current_period_end: string | null };

// Two lists for the days when a card does not work: EFT payments to confirm, and people who tried to pay and stopped.
export default async function Payments() {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [eftRes, startRes] = await Promise.all([
    admin.from("eft_payments").select("id,business_id,plan,reference,created_at").eq("status", "pending").order("created_at", { ascending: false }),
    admin.from("checkout_starts").select("business_id,plan,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
  ]);
  if (eftRes.error || startRes.error) return (<><PageHead title="Payments to sort" /><Missing what="The EFT and checkout tables" /></>);

  const efts = eftRes.data ?? [];
  const starts = startRes.data ?? [];
  const ids = [...new Set([...efts.map((e) => e.business_id), ...starts.map((s) => s.business_id)])];
  const [bizRes, subRes] = ids.length
    ? await Promise.all([
        admin.from("businesses").select("id,name,email,phone,owner_id").in("id", ids),
        admin.from("subscriptions").select("business_id,status,plan,provider,current_period_end").in("business_id", ids),
      ])
    : [{ data: [] as Biz[] }, { data: [] as SubRow[] }];
  const biz = new Map(((bizRes.data ?? []) as Biz[]).map((b) => [b.id, b]));
  const sub = new Map(((subRes.data ?? []) as SubRow[]).map((s) => [s.business_id, s]));

  const now = Date.now();
  const paid = (id: string) => {
    const s = sub.get(id);
    if (!s) return false;
    if (s.status === "comped") return true;
    return ["active", "past_due", "cancelled"].includes(s.status) && Boolean(s.current_period_end) && new Date(s.current_period_end as string).getTime() > now;
  };

  // Group the checkout starts by business and keep only people who are not paid up.
  const tried = new Map<string, { count: number; plan: string; last: string }>();
  for (const s of starts) {
    if (paid(s.business_id)) continue;
    const t = tried.get(s.business_id);
    if (t) t.count++; else tried.set(s.business_id, { count: 1, plan: s.plan, last: s.created_at });
  }

  const emailOf = async (b: Biz) => {
    if (b.email) return b.email;
    const { data } = await admin.auth.admin.getUserById(b.owner_id);
    return data?.user?.email ?? "";
  };
  const triedRows = await Promise.all([...tried.entries()].slice(0, 30).map(async ([id, t]) => {
    const b = biz.get(id);
    return b ? { b, t, email: await emailOf(b) } : null;
  }));

  return (
    <>
      <PageHead title="Payments to sort" note="EFT payments waiting for you to confirm, and people who started to pay and stopped. Contact them while they are still interested." />

      <Section title={"EFT payments to confirm (" + efts.length + ")"} note="Check your bank app for the reference. When you see the money, press Confirm and the customer is connected right away.">
        <div className={card + " overflow-x-auto"}>
          {efts.length === 0 ? <p className="text-sm text-yebo-deep/60">Nothing waiting.</p> : (
            <table className="w-full min-w-[720px]">
              <thead><tr><th className={th}>Business</th><th className={th}>Plan</th><th className={th}>Reference</th><th className={th}>Told us</th><th className={th}></th></tr></thead>
              <tbody>
                {efts.map((e) => {
                  const b = biz.get(e.business_id);
                  const s = sub.get(e.business_id);
                  const cardPlan = s && s.status === "active" && s.provider !== "eft";
                  return (
                    <tr key={e.id} className="border-t border-yebo-deep/10 align-top">
                      <td className={td + " font-bold"}>{b?.name ?? "Unknown"}<br /><span className="font-normal text-yebo-deep/60">{b?.email ?? ""}</span></td>
                      <td className={td}>{isPlanId(e.plan) ? PLANS[e.plan].name + " (R" + PLANS[e.plan].priceRand + ")" : e.plan}</td>
                      <td className={td + " font-bold tabular-nums"}>{e.reference}</td>
                      <td className={td}>{formatSouthAfricaDateTime(e.created_at)}</td>
                      <td className={td}>
                        {cardPlan ? (
                          <p className="max-w-[200px] text-xs font-semibold text-orange">Has a live card plan. Cancel that first, or they pay twice.</p>
                        ) : (
                          <div className="flex gap-3">
                            <form action={confirmEft}><input type="hidden" name="id" value={e.id} /><button className={link}>Confirm</button></form>
                            <form action={rejectEft}><input type="hidden" name="id" value={e.id} /><button className="font-bold text-yebo-deep/50 underline underline-offset-4">Not received</button></form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Section>

      <Section title={"Started to pay, did not finish (" + triedRows.filter(Boolean).length + ")"} note="Last 14 days, people who reached the payment page and have no active plan. Most are stuck on the bank approval step.">
        <div className={card + " overflow-x-auto"}>
          {triedRows.filter(Boolean).length === 0 ? <p className="text-sm text-yebo-deep/60">Nobody is stuck here.</p> : (
            <table className="w-full min-w-[720px]">
              <thead><tr><th className={th}>Business</th><th className={th}>Tried</th><th className={th}>Last try</th><th className={th}>WhatsApp</th><th className={th}>Email</th></tr></thead>
              <tbody>
                {triedRows.map((r) => {
                  if (!r) return null;
                  const planName = isPlanId(r.t.plan) ? PLANS[r.t.plan].name : r.t.plan;
                  const text = "Hi " + r.b.name + ", Steve from Yebo Invoices here. I saw you tried to start the " + planName + " plan. Did the payment go through? Your bank may ask you to approve it in your banking app, so keep that window open until it says done. If your card will not work, I can set you up to pay by EFT instead.";
                  return (
                    <tr key={r.b.id} className="border-t border-yebo-deep/10">
                      <td className={td + " font-bold"}>{r.b.name}</td>
                      <td className={td}>{planName}, {r.t.count} {r.t.count === 1 ? "time" : "times"}</td>
                      <td className={td}>{formatSouthAfricaDateTime(r.t.last)}</td>
                      <td className={td}>{r.b.phone ? <a className={link} target="_blank" rel="noreferrer" href={waLink(r.b.phone, text)}>WhatsApp</a> : "no phone"}</td>
                      <td className={td + " break-all"}>{r.email ? <a className={link} href={"mailto:" + r.email + "?subject=" + encodeURIComponent("Your Yebo plan") + "&body=" + encodeURIComponent(text)}>{r.email}</a> : "-"}</td>
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
