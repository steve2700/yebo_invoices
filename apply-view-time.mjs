// Shows how long a client looked at an invoice or quote, and how far they read. Safe to run twice.
import fs from "node:fs";
const f = "src/app/app/documents/[id]/page.tsx";
const raw = fs.readFileSync(f, "utf8");
const crlf = raw.includes("\r\n");
let t = raw.replace(/\r\n/g, "\n");
if (t.includes("viewDetail")) { console.log("already  view time"); process.exit(0); }
const edits = [
  ['import { ordinal } from "@/lib/recurring";\n', 'import { ordinal } from "@/lib/recurring";\nimport { viewDetail } from "@/lib/view-time";\n'],
  ['    sb.from("events").select("type,created_at").eq("document_id", id).order("created_at", { ascending: false }),\n',
`    (async () => {
      // Falls back to the older columns if the view-time SQL has not been run yet, so the page never breaks.
      const full = await sb.from("events").select("type,created_at,seconds,scroll_pct").eq("document_id", id).order("created_at", { ascending: false });
      if (!full.error) return full;
      return await sb.from("events").select("type,created_at").eq("document_id", id).order("created_at", { ascending: false });
    })(),
`],
  ['  const viewsText = views.length ? `Opened ${views.length} time${views.length === 1 ? "" : "s"} · last ${formatSouthAfricaDateTime(views[0].created_at)}` : null;\n',
`  const viewSeconds = views.reduce((s, v) => s + Number((v as { seconds?: number | null }).seconds ?? 0), 0);
  const viewScroll = views.reduce((m, v) => Math.max(m, Number((v as { scroll_pct?: number | null }).scroll_pct ?? 0)), 0);
  const viewExtra = viewDetail(viewSeconds, viewScroll);
  const viewsText = views.length ? \`Opened \${views.length} time\${views.length === 1 ? "" : "s"} · last \${formatSouthAfricaDateTime(views[0].created_at)}\${viewExtra ? \` · \${viewExtra}\` : ""}\` : null;
`],
  [`        {(events ?? []).map((e, i) => (
          <li key={i} className="flex justify-between gap-3 p-3">
            <span className="font-semibold">{EVENT_LABELS[e.type] ?? e.type}</span>
            <span className="shrink-0 text-ink/50">{formatSouthAfricaDateTime(e.created_at)}</span>
          </li>
        ))}
`,
`        {(events ?? []).map((e, i) => {
          const more = e.type === "viewed" ? viewDetail((e as { seconds?: number | null }).seconds, (e as { scroll_pct?: number | null }).scroll_pct) : "";
          return (
            <li key={i} className="flex justify-between gap-3 p-3">
              <span className="font-semibold">{EVENT_LABELS[e.type] ?? e.type}{more && <span className="ml-2 text-xs font-normal text-ink/50">{more}</span>}</span>
              <span className="shrink-0 text-ink/50">{formatSouthAfricaDateTime(e.created_at)}</span>
            </li>
          );
        })}
`],
];
for (const [from] of edits) if (!t.includes(from)) { console.log("MISSING  view time (send me src/app/app/documents/[id]/page.tsx). Nothing changed."); process.exit(1); }
for (const [from, to] of edits) t = t.replace(from, to);
fs.writeFileSync(f, crlf ? t.replace(/\n/g, "\r\n") : t);
console.log("done     view time");
