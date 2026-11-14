// Adds the "Your week" card to the dashboard and the Friday job to vercel.json. Safe to run twice.
import fs from "node:fs";
const log = (ok, label) => console.log(ok === "done" ? "done   " : ok, label);

// 1. dashboard
{
  const file = "src/app/app/page.tsx";
  let t = fs.readFileSync(file, "utf8");
  const nl = t.includes("\r\n") ? "\r\n" : "\n";
  if (t.includes("<WeeklyCard />")) log("already", "dashboard card");
  else {
    const before = t;
    t = t.replace('import InstantPayCard from "./InstantPayCard";', `import InstantPayCard from "./InstantPayCard";${nl}import WeeklyCard from "./WeeklyCard";`);
    t = t.replace(/(nudges=\{\r?\n\s*<>\r?\n)/, `$1          <WeeklyCard />${nl}`);
    if (t === before || !t.includes("<WeeklyCard />") || !t.includes('import WeeklyCard')) log("MISSING", "dashboard card (send me src/app/app/page.tsx)");
    else { fs.writeFileSync(file, t); log("done", "dashboard card"); }
  }
}
// 2. Friday cron
{
  const file = "vercel.json";
  const raw = fs.readFileSync(file, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const json = JSON.parse(raw);
  json.crons = json.crons ?? [];
  if (json.crons.some((c) => c.path === "/api/cron/weekly")) log("already", "Friday cron");
  else {
    json.crons.push({ path: "/api/cron/weekly", schedule: "0 13 * * 5" });
    fs.writeFileSync(file, JSON.stringify(json, null, 2).replace(/\n/g, nl) + nl);
    log("done", "Friday cron");
  }
}
