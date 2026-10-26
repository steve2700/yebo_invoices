// Adds the reminders docs links to README.md and docs/HOW-IT-WORKS.md without replacing the files. Safe to run twice.
import { readFileSync, writeFileSync } from "node:fs";

const edits = [
  {
    file: "README.md",
    done: (s) => s.includes("docs/REMINDERS.md"),
    apply: (s) => {
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const m = s.match(/^8\. Data model, private storage and security rules\r?\n/m);
      if (!m) throw new Error("could not find the diagram list in the README");
      const add = "9. Reminders: automatic client emails, and the owner's morning list with one-tap WhatsApp (**[docs/REMINDERS.md](docs/REMINDERS.md)**)" + nl;
      return s.slice(0, m.index + m[0].length) + add + s.slice(m.index + m[0].length);
    },
  },
  {
    file: "docs/HOW-IT-WORKS.md",
    done: (s) => s.includes("REMINDERS.md"),
    apply: (s) => {
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const m = s.match(/^  R0 --> R5\[.*\]\r?\n/m);
      if (!m) throw new Error("could not find the daily jobs diagram");
      const node = '  R0 --> R6["Morning list: reminders left over after the client emails<br/>go to the owner for one-tap WhatsApp"]' + nl;
      let out = s.slice(0, m.index + m[0].length) + node + s.slice(m.index + m[0].length);
      const p = out.match(/^The recurring-invoice job runs inside the reminders job.*\r?\n/m);
      if (!p) throw new Error("could not find the recurring-invoice paragraph");
      const para = nl + "How reminders work in full, with a diagram, is in **[REMINDERS.md](REMINDERS.md)**." + nl;
      out = out.slice(0, p.index + p[0].length) + para + out.slice(p.index + p[0].length);
      return out;
    },
  },
];
const planned = [];
for (const e of edits) {
  try {
    const text = readFileSync(e.file, "utf8");
    planned.push({ e, skipped: e.done(text), next: e.done(text) ? text : e.apply(text) });
  } catch (error) { console.error(`Nothing was changed. Problem in ${e.file}: ${error.message}`); process.exit(1); }
}
for (const r of planned) { if (!r.skipped) writeFileSync(r.e.file, r.next); console.log(`${r.skipped ? "already done" : "patched     "}  ${r.e.file}`); }
