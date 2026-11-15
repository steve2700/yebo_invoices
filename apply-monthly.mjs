// Adds "Monthly reports" to the admin menu and the end-of-month job to vercel.json. Safe to run twice.
import fs from "node:fs";
const log = (ok, label) => console.log(ok === "done" ? "done   " : ok, label);
{
  const file = "src/app/admin/layout.tsx";
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  const t = raw.replace(/\r\n/g, "\n");
  if (t.includes("/admin/monthly")) log("already", "admin menu");
  else {
    const from = '    { href: "/admin/reminders", label: "Reminder emails" },\n';
    if (!t.includes(from)) log("MISSING", "admin menu (send me src/app/admin/layout.tsx)");
    else { const out = t.replace(from, from + '    { href: "/admin/monthly", label: "Monthly reports" },\n'); fs.writeFileSync(file, crlf ? out.replace(/\n/g, "\r\n") : out); log("done", "admin menu"); }
  }
}
{
  const file = "vercel.json";
  const raw = fs.readFileSync(file, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const json = JSON.parse(raw);
  json.crons = json.crons ?? [];
  if (json.crons.some((c) => c.path === "/api/cron/monthly")) log("already", "month-end cron");
  else { json.crons.push({ path: "/api/cron/monthly", schedule: "0 13 28-31 * *" }); fs.writeFileSync(file, JSON.stringify(json, null, 2).replace(/\n/g, nl) + nl); log("done", "month-end cron"); }
}
