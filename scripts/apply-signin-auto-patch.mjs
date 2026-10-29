// Makes the email sign-in code sign you in the moment the 6th digit is typed. Run it AFTER apply-signin-code-patch.mjs.
// Edits src/app/login/page.tsx in place. Safe to run twice. All or nothing.
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/app/login/page.tsx";
const text = readFileSync(file, "utf8");

if (text.includes("verifyCode")) { console.log("already done  " + file); process.exit(0); }
if (!text.includes("data-signin-code")) {
  console.error("Nothing was changed. Run apply-signin-code-patch.mjs first.");
  process.exit(1);
}

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first === -1 || source.indexOf(from, first + from.length) !== -1) throw new Error(`could not find exactly one place to change: ${label}`);
  return source.slice(0, first) + to + source.slice(first + from.length);
}

try {
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const L = (s) => s.replace(/\n/g, nl);
  let s = text;

  s = replaceOnce(
    s,
    L(`  async function verify(event: FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    setVerifying(true);`),
    L(`  function verify(event: FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    void verifyCode(code);\n  }\n\n  async function verifyCode(token: string) {\n    if (verifying) return;\n    setVerifying(true);`),
    "verify function"
  );
  s = replaceOnce(s, `token: code.replace(/\\s/g, "")`, `token: token.replace(/\\s/g, "")`, "token value");
  s = replaceOnce(
    s,
    `onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))}`,
    `onChange={(event) => {
                  const next = event.target.value.replace(/[^0-9]/g, "");
                  setCode(next);
                  if (next.length === 6) void verifyCode(next);
                }}`,
    "code input"
  );
  writeFileSync(file, s);
  console.log("patched       " + file);
} catch (error) {
  console.error("Nothing was changed. " + error.message);
  process.exit(1);
}
