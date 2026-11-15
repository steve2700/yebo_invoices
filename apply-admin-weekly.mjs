// Adds "Weekly reviews" to the admin menu. Safe to run twice.
import fs from "node:fs";
const file = "src/app/admin/layout.tsx";
const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
const t = raw.replace(/\r\n/g, "\n");
if (t.includes("/admin/weekly")) console.log("already admin menu");
else {
  const anchors = ['    { href: "/admin/monthly", label: "Monthly reports" },\n', '    { href: "/admin/reminders", label: "Reminder emails" },\n'];
  const a = anchors.find((x) => t.includes(x));
  if (!a) console.log("MISSING admin menu (send me src/app/admin/layout.tsx)");
  else { const out = t.replace(a, '    { href: "/admin/weekly", label: "Weekly reviews" },\n' + a); fs.writeFileSync(file, crlf ? out.replace(/\n/g, "\r\n") : out); console.log("done    admin menu"); }
}
