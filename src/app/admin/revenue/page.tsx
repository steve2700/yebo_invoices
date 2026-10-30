import { loadAdminData } from "@/lib/admin-data";
import { card, PageHead, Section } from "../ui";

export default async function Revenue() {
  const d = await loadAdminData();
  const planCounts = d.subs.reduce<Record<string, number>>((acc, s) => {
    const key = s.plan + " (" + s.status + ")";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <>
      <PageHead title="Revenue" />
      <Section title="Paid per month">
        <div className={card}>
          <p className="text-3xl font-black tabular-nums text-yebo-deep">R{d.mrr.toLocaleString("en-ZA")}<span className="text-sm font-bold text-yebo-deep/60"> per month, from {d.activeSubs.length} paying {d.activeSubs.length === 1 ? "business" : "businesses"}</span></p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {d.byPlan.map((p) => <li key={p.plan} className="rounded-full bg-yebo-chalk px-4 py-2 text-sm font-bold text-yebo-deep">{p.name} (R{p.price}): {p.count}</li>)}
          </ul>
          <p className="mt-3 text-sm text-yebo-deep/70">Free or comped: {d.subCounts.comped}. Payment failed (past due): {d.subCounts.pastDue}. Started checkout, not paid: {d.subCounts.pending}.</p>
          <p className="mt-2 text-xs leading-5 text-yebo-deep/55">Worked out from active plans at today&apos;s list prices. It does not include comped accounts.</p>
        </div>
      </Section>
      <Section title="Every plan and status">
        <div className={card}>
          {Object.keys(planCounts).length === 0 ? <p className="text-sm text-yebo-deep/60">No subscriptions yet.</p> : (
            <ul className="flex flex-wrap gap-3">
              {Object.entries(planCounts).map(([k, v]) => <li key={k} className="rounded-full bg-yebo-chalk px-4 py-2 text-sm font-bold text-yebo-deep">{k}: {v}</li>)}
            </ul>
          )}
        </div>
      </Section>
    </>
  );
}
