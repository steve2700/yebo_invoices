import { loadAdminData } from "@/lib/admin-data";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { resolveError } from "../actions";
import { card, link, Missing, PageHead, td, th } from "../ui";

export default async function Errors() {
  const d = await loadAdminData();
  const last24 = d.hits24 ? (Object.values(d.hits24) as number[]).reduce((a: number, b: number) => a + b, 0) : null;
  return (
    <>
      <PageHead title={"Errors" + (d.errors ? " (" + d.errors.length + " open" + (last24 !== null ? ", " + last24 + " in the last 24 hours" : "") + ")" : "")} note="Things that broke for real people. The same problem is one line with a count. You get an email the first time, then at 5, 25 and 100." />
      <div className={card + " overflow-x-auto"}>
        {!d.errors ? <Missing what="The error log" /> : d.errors.length === 0 ? <p className="text-sm text-yebo-deep/60">No open errors.</p> : (
          <table className="w-full min-w-[680px]">
            <thead><tr><th className={th}>What happened</th><th className={th}>Where</th><th className={th}>Total</th><th className={th}>Last 24h</th><th className={th}>Last</th><th className={th}></th></tr></thead>
            <tbody>
              {d.errors.map((e) => (
                <tr key={e.id} className="border-t border-yebo-deep/10 align-top">
                  <td className={td + " break-words"}><span className="mr-2 rounded-full bg-yebo-chalk px-2 py-0.5 text-xs font-bold">{e.source}</span>{e.message}</td>
                  <td className={td + " break-all"}>{e.last_path ?? "-"}</td>
                  <td className={td + " tabular-nums"}>{e.count}</td>
                  <td className={td + " font-bold tabular-nums"}>{d.hits24 ? (d.hits24[e.fingerprint] ?? 0) : "-"}</td>
                  <td className={td}>{formatSouthAfricaDateTime(e.last_seen)}</td>
                  <td className={td}><form action={resolveError}><input type="hidden" name="id" value={e.id} /><button className={link}>Mark fixed</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
