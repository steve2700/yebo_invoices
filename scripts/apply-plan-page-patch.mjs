// Adds the "Which plan" page to the sitemap and the footer, without replacing those files. Safe to run twice.
import { readFileSync, writeFileSync } from "node:fs";

const edits = [
  {
    file: "src/app/sitemap.ts",
    done: (s) => s.includes("/which-plan"),
    apply: (s) => {
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const m = s.match(/^[ \t]*\{ url: `\$\{appUrl\(\)\}\/pricing`.*\},\r?\n/m);
      if (!m) throw new Error("could not find the /pricing line in the sitemap");
      const add = '    { url: `${appUrl()}/which-plan`, changeFrequency: "monthly", priority: 0.7 },' + nl;
      return s.slice(0, m.index + m[0].length) + add + s.slice(m.index + m[0].length);
    },
  },
  {
    optional: true,
    file: "src/components/LandingFooter.tsx",
    done: (s) => s.includes("/which-plan"),
    apply: (s) => {
      const nl = s.includes("\r\n") ? "\r\n" : "\n";
      const m = s.match(/^([ \t]*)<Link className=\{link\} href="\/pricing">Pricing<\/Link>\r?\n/m);
      if (!m) throw new Error("could not find the Pricing footer link");
      const add = `${m[1]}<Link className={link} href="/which-plan">Which plan?</Link>` + nl;
      return s.slice(0, m.index + m[0].length) + add + s.slice(m.index + m[0].length);
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
    console.error(`Nothing was changed. Problem in ${e.file}: ${error.message}`); process.exit(1);
  }
}
for (const r of planned) { if (!r.skipped) writeFileSync(r.e.file, r.next); console.log(`${r.skipped ? "already done" : "patched     "}  ${r.e.file}`); }
