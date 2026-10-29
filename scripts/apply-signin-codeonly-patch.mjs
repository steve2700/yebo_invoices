// Changes the login page wording to match a code-only sign-in email (no link). Run it AFTER apply-signin-code-patch.mjs.
// Edits src/app/login/page.tsx in place. Safe to run twice. All or nothing.
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/app/login/page.tsx";
let s = readFileSync(file, "utf8");

const swaps = [
  [
    `We sent a code and a sign-in link to your email. Type the code below. It can take a minute, so check spam too.`,
    `We sent a 6-digit code to your email. Type it below. It can take a minute, so check spam too.`,
  ],
  [
    `Tip: type the code in this same browser tab. If you tap the link instead, open it in the browser you started in.`,
    `Tip: keep this page open while you check your email, then type the code here.`,
  ],
  [`{emailPending ? "Sending sign-in link…" : "Email me a sign-in link"}`, `{emailPending ? "Sending code…" : "Email me a sign-in code"}`],
  [`Could not send a sign-in link. Please try again.`, `Could not send a sign-in code. Please try again.`],
];

if (swaps.every(([from, to]) => !s.includes(from) && s.includes(to))) {
  console.log("already done  " + file);
  process.exit(0);
}
const missing = swaps.filter(([from, to]) => !s.includes(from) && !s.includes(to));
if (missing.length) {
  console.error("Nothing was changed. Could not find: " + missing.map(([from]) => from.slice(0, 40)).join(" | "));
  process.exit(1);
}
for (const [from, to] of swaps) s = s.split(from).join(to);
writeFileSync(file, s);
console.log("patched       " + file);
