import fs from "node:fs";
function patch(file, marker, from, to) {
  if (!fs.existsSync(file)) { console.error(`MISSING ${file} - send me ${file}`); process.exit(1); }
  const raw = fs.readFileSync(file, "utf8"); const crlf = raw.includes("\r\n"); let s = raw.replace(/\r\n/g, "\n");
  if (s.includes(marker)) { console.log("already: " + file); return; }
  if (!s.includes(from)) { console.error(`MISSING anchor in ${file} - send me ${file}`); process.exit(1); }
  s = s.replace(from, to); fs.writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s); console.log("done: " + file);
}
patch("src/components/PlanGrid.tsx", "cold drink and a pie",
`            <p className="mt-2 text-base font-bold text-yebo-deep">{plan.tagline}</p>`,
`            {id === "side" && <p className="mt-2 text-sm font-bold text-yebo">About the price of a cold drink and a pie. Stay organised for once.</p>}
            <p className="mt-2 text-base font-bold text-yebo-deep">{plan.tagline}</p>`);
patch("src/components/StickyStart.tsx", "cold drink and a pie",
`{PLANS.side.name} · cancel or change plan any time`,
`Price of a cold drink and a pie · cancel any time`);
