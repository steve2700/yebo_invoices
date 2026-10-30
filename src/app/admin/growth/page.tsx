import { loadAdminData } from "@/lib/admin-data";
import { SIGNIN_PROBLEMS, SIGNIN_STEPS } from "@/lib/signin-events";
import { pct } from "@/lib/admin-stats";
import { card, Missing, PageHead, Section, td, th } from "../ui";

export default async function Growth() {
  const d = await loadAdminData();
  const peak = Math.max(1, ...d.sources30.map((x) => x.count));
  return (
    <>
      <PageHead title="Growth" note="Where people come from, and where they drop off while signing in." />
      <Section title="Where visitors come from" note="One count per browser visit. Links ending in ?s=facebook or ?utm_source=reddit show under that name.">
        <div className={card + " overflow-x-auto"}>
          {!d.visits ? <Missing what="Visit counting" /> : d.sources30.length === 0 ? <p className="text-sm text-yebo-deep/60">No visits counted yet.</p> : (
            <table className="w-full min-w-[460px]">
              <thead><tr><th className={th}>Source</th><th className={th}>Last 7 days</th><th className={th}>Last 30 days</th></tr></thead>
              <tbody>
                {d.sources30.map((x) => (
                  <tr key={x.source} className="border-t border-yebo-deep/10">
                    <td className={td + " font-bold"}>{x.source}</td>
                    <td className={td + " tabular-nums"}>{d.sources7.find((y) => y.source === x.source)?.count ?? 0}</td>
                    <td className={td}><span className="inline-block h-2 rounded-full bg-yebo align-middle" style={{ width: Math.max(2, (x.count / peak) * 120) + "px" }} /> <b className="ml-2 tabular-nums">{x.count}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
      <Section title="Sign-in funnel" note="Counts visits to the sign-in page, not people.">
        <div className={card + " overflow-x-auto"}>
          {!d.signins ? <Missing what="Sign-in tracking" /> : (
            <>
              <table className="w-full min-w-[520px]">
                <thead><tr><th className={th}>Step</th><th className={th}>Last 7 days</th><th className={th}>Last 30 days</th><th className={th}>Of the step before (30d)</th></tr></thead>
                <tbody>
                  {SIGNIN_STEPS.map((st, i) => (
                    <tr key={st.id} className="border-t border-yebo-deep/10">
                      <td className={td + " font-bold"}>{st.label}</td>
                      <td className={td + " tabular-nums"}>{d.signin7[st.id] ?? 0}</td>
                      <td className={td + " tabular-nums"}>{d.signin30[st.id] ?? 0}</td>
                      <td className={td + " tabular-nums"}>{i === 0 ? "-" : pct(d.signin30[st.id] ?? 0, d.signin30[SIGNIN_STEPS[i - 1].id] ?? 0) + "%"}</td>
                    </tr>
                  ))}
                  {SIGNIN_PROBLEMS.map((st) => (
                    <tr key={st.id} className="border-t border-yebo-deep/10 text-yebo-deep/70">
                      <td className={td}>{st.label}</td>
                      <td className={td + " tabular-nums"}>{d.signin7[st.id] ?? 0}</td>
                      <td className={td + " tabular-nums"}>{d.signin30[st.id] ?? 0}</td>
                      <td className={td}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs leading-5 text-yebo-deep/55">Google sign-ins leave the page, so they show as taps, not finished sign-ins.</p>
            </>
          )}
        </div>
      </Section>
    </>
  );
}
