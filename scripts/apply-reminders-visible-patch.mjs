// Makes reminders easy to find: a bell with a count in the top bar, and a card at the top of the dashboard.
// Edits only the lines it needs. Safe to run twice. The dashboard card is optional; the icon and the bell must patch cleanly.
import { readFileSync, writeFileSync } from "node:fs";

const edits = [
  {
    file: "src/app/app/icons.tsx",
    done: (s) => /\bbell:\s*</.test(s),
    apply: (s) => {
      const i = s.lastIndexOf("} as const;");
      if (i < 0) throw new Error("could not find the end of the icon list");
      return s.slice(0, i) + '  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,\n' + s.slice(i);
    },
  },
  {
    file: "src/app/app/layout.tsx",
    done: (s) => s.includes("<RemindersBell />"),
    apply: (s) => {
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const imp = s.match(/^import BottomNav from "\.\/BottomNav";\r?\n/m);
      const nav = s.match(/^[ \t]*<InstallPrompt \/>\r?\n/m);
      if (!imp || !nav) throw new Error("could not find the header in the app layout");
      let out = s.slice(0, nav.index + nav[0].length) + "            <RemindersBell />" + nl + s.slice(nav.index + nav[0].length);
      // The desktop text link added earlier is replaced by the bell, so remove it if it is there.
      out = out.replace(/^[ \t]*<Link href="\/app\/reminders" className=\{`\$\{link\} hidden sm:inline-flex`\}>Reminders<\/Link>\r?\n/m, "");
      const at = out.indexOf(imp[0]) + imp[0].length;
      return out.slice(0, at) + 'import RemindersBell from "./RemindersBell";' + nl + out.slice(at);
    },
  },
  {
    optional: true,
    file: "src/app/app/page.tsx",
    done: (s) => s.includes("<RemindersReady />"),
    apply: (s) => {
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const start = s.match(/^  return \(\r?\n    <DashboardView\r?\n/m);
      if (!start) throw new Error("could not find the dashboard return");
      const endRe = /^    \/>\r?\n  \);\r?\n/gm;
      let end = null, m;
      while ((m = endRe.exec(s))) if (m.index > start.index) { end = m; break; }
      if (!end) throw new Error("could not find the end of the dashboard return");
      let out = s.slice(0, start.index) + "  return (" + nl + "    <>" + nl + "      <RemindersReady />" + nl + "    <DashboardView" + nl +
        s.slice(start.index + start[0].length, end.index) + "    />" + nl + "    </>" + nl + "  );" + nl + s.slice(end.index + end[0].length);
      const firstImport = out.match(/^import .*\r?\n/m);
      return out.slice(0, firstImport.index) + 'import RemindersReady from "./RemindersReady";' + nl + out.slice(firstImport.index);
    },
  },
];

const planned = [];
for (const e of edits) {
  try {
    const text = readFileSync(e.file, "utf8");
    planned.push({ e, skipped: e.done(text), next: e.done(text) ? text : e.apply(text) });
  } catch (error) {
    if (e.optional) { console.log(`skipped (optional)  ${e.file}: ${error.message}`); continue; }
    console.error(`Nothing was changed. Problem in ${e.file}: ${error.message}`);
    process.exit(1);
  }
}
for (const r of planned) { if (!r.skipped) writeFileSync(r.e.file, r.next); console.log(`${r.skipped ? "already done" : "patched     "}  ${r.e.file}`); }
