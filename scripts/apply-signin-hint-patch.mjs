// Adds one clear line above the sign-in code box. Run it AFTER apply-signin-code-patch.mjs.
// Edits src/app/login/page.tsx in place. Safe to run twice. All or nothing.
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/app/login/page.tsx";
const text = readFileSync(file, "utf8");

if (text.includes("on any device")) { console.log("already done  " + file); process.exit(0); }

const nl = text.includes("\r\n") ? "\r\n" : "\n";
const anchor = /^([ \t]*)<label htmlFor="signin-code"/m;
const m = text.match(anchor);
if (!m) {
  console.error("Nothing was changed. Run apply-signin-code-patch.mjs first.");
  process.exit(1);
}
const line = `${m[1]}<p className="text-sm leading-6 text-yebo-deep/70">Check your email on any device, then type the code here.</p>` + nl;
writeFileSync(file, text.slice(0, m.index) + line + text.slice(m.index));
console.log("patched       " + file);
