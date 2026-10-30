import { loadAdminData } from "@/lib/admin-data";
import { SURVEY } from "@/lib/survey";
import { pct, tally } from "@/lib/admin-stats";
import { card, Missing, PageHead } from "../ui";

export default async function SurveyPage() {
  const d = await loadAdminData();
  const surveys = d.surveys;
  const blocks = ["pay", "price", "progress", "problem", "want", "lost", "try"].flatMap((id) => {
    const q = SURVEY.find((x) => x.id === id);
    if (!q || !surveys || !q.options) return [];
    return [{ text: q.text, rows: tally(surveys.map((s) => s.answers?.[id]), q.options) }];
  });
  return (
    <>
      <PageHead title={"Survey" + (surveys ? " (" + surveys.length + " answers)" : "")} note="Share yeboinvoices.com/survey?s=facebook to see which group answers." />
      {!surveys ? <div className={card}><Missing what="The survey" /></div> : (
        <div className="grid gap-4 md:grid-cols-2">
          {blocks.map((b) => (
            <div key={b.text} className={card}>
              <h3 className="text-sm font-black text-yebo-deep">{b.text}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {b.rows.map((r) => (
                  <li key={r.option} className="text-sm text-yebo-deep">
                    <div className="flex justify-between gap-3"><span>{r.option}</span><b className="tabular-nums">{r.count}</b></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-yebo-deep/10"><div className="h-full rounded-full bg-yebo" style={{ width: pct(r.count, surveys.length) + "%" }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
