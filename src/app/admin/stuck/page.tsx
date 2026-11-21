import { createAdminClient } from "@/lib/supabase/admin";
import { loadAdminData, DAY } from "@/lib/admin-data";
import { PLANS, isPlanId } from "@/lib/plans";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { waLink } from "@/lib/dates";
import { card, link, PageHead, Section, td, th } from "../ui";

type Start = { business_id: string; plan: string; created_at: string };
const PAID = new Set(["active", "comped", "cancelled", "past_due"]);

function message(name: string, tried: string | null) {
  const planName = tried && isPlanId(tried) ? PLANS[tried].name : null;
  const opener = `Hi ${name}, it is Yebo Invoices here. I saw you got to the last step of setting up but have not started yet.`;
  const offer = ` Our ${PLANS.side.name} plan is only R${PLANS.side.priceRand} a month, you can cancel or change plan any time, and the days you paid for carry over.`;
  const tail = planName && tried !== "side" ? ` You looked at ${planName}. Start on R${PLANS.side.priceRand} and move up when you are busier.` : "";
  return `${opener}${offer}${tail} Is something stopping you, like a card that will not go through or a question? Tell me and I will sort it out with you right now. You can also pay by EFT.`;
}

export default async function Stuck() {
  const d = await loadAdminData();
  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * DAY).toISOString();
  const { data, error } = await admin.from("checkout_starts").select("business_id,plan,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(5000);
  const starts = error ? [] : ((data ?? []) as Start[]);

  const paid = new Set(d.subs.filter((s) => PAID.has(s.status)).map((s) => s.business_id));
  const lastTry = new Map<string, Start & { tries: number }>();
  for (const s of starts) {
    const known = lastTry.get(s.business_id);
    if (!known) lastTry.set(s.business_id, { ...s, tries: 1 });
    else known.tries += 1;
  }
  const now = Date.now();
  const unpaid = d.businesses.filter((b) => !paid.has(b.id) && now - new Date(b.created_at).getTime() > 20 * 60_000);
  const tried = unpaid.filter((b) => lastTry.has(b.id)).sort((a, b) => lastTry.get(b.id)!.created_at.localeCompare(lastTry.get(a.id)!.created_at));
  const never = unpaid.filter((b) => !lastTry.has(b.id)).slice(0, 50);

  const row = (b: (typeof unpaid)[number], t: (Start & { tries: number }) | undefined) => {
    const mail = b.email || d.userEmail.get(b.owner_id);
    const text = message(b.name, t?.plan ?? null);
    return (
      <tr key={b.id} className="border-t border-yebo-deep/10">
        <td className={td + " font-bold"}>{b.name}</td>
        {t && <td className={td}>{isPlanId(t.plan) ? PLANS[t.plan].name : t.plan}{t.tries > 1 ? ` (${t.tries} tries)` : ""}</td>}
        <td className={td}>{formatSouthAfricaDateTime(t?.created_at ?? b.created_at)}</td>
        <td className={td}>{b.phone ? <a className={link} target="_blank" rel="noreferrer" href={waLink(b.phone, text)}>WhatsApp</a> : "no phone"}</td>
        <td className={td}>{mail ? <a className={link} href={"mailto:" + mail + "?subject=" + encodeURIComponent("Your Yebo account is nearly ready") + "&body=" + encodeURIComponent(text)}>Email</a> : "-"}</td>
      </tr>
    );
  };

  return (
    <>
      <PageHead title="Stuck at payment" note="They set up their business, reached the payment step and did not pay. The sooner you message, the better the chance they come back. One tap writes the message; you press send." />
      <Section title={"Opened payment, did not pay (" + tried.length + ")"} note="Most recent first. The plan is the last one they tapped.">
        <div className={card + " overflow-x-auto"}>
          {tried.length === 0 ? <p className="text-sm text-yebo-deep/60">Nobody is waiting here.</p> : (
            <table className="w-full min-w-[640px]">
              <thead><tr><th className={th}>Business</th><th className={th}>Tried</th><th className={th}>When</th><th className={th}>WhatsApp</th><th className={th}>Email</th></tr></thead>
              <tbody>{tried.map((b) => row(b, lastTry.get(b.id)))}</tbody>
            </table>
          )}
        </div>
      </Section>
      <Section title={"Reached the plans, never tapped one (" + never.length + ")"} note="Set up their business but have not started a payment.">
        <div className={card + " overflow-x-auto"}>
          {never.length === 0 ? <p className="text-sm text-yebo-deep/60">Nobody is waiting here.</p> : (
            <table className="w-full min-w-[560px]">
              <thead><tr><th className={th}>Business</th><th className={th}>Set up</th><th className={th}>WhatsApp</th><th className={th}>Email</th></tr></thead>
              <tbody>{never.map((b) => row(b, undefined))}</tbody>
            </table>
          )}
        </div>
      </Section>
    </>
  );
}
