// Adds the visit counter to the root layout. Needs the tracking patch applied first. Safe to run twice.
import { readFileSync, writeFileSync } from "node:fs";
const file = "src/app/layout.tsx";
const text = readFileSync(file, "utf8");
if (text.includes("VisitTracker")) { console.log("already done  " + file); process.exit(0); }
if (!text.includes("<ErrorReporter />")) { console.error("Nothing was changed. Run apply-tracking-patch.mjs first."); process.exit(1); }
const once = (s, a, b) => { if (s.split(a).length !== 2) { console.error("Nothing was changed. Could not find: " + a); process.exit(1); } return s.replace(a, () => b); };
let s = once(text, `import ErrorReporter from "@/components/ErrorReporter";`, `import ErrorReporter from "@/components/ErrorReporter";\nimport VisitTracker from "@/components/VisitTracker";`);
s = once(s, `<ErrorReporter />`, `<ErrorReporter /><VisitTracker />`);
writeFileSync(file, s);
console.log("patched       " + file);
