// Fixes "I went to Gmail for the code and the login page was back to the start".
// When someone asks for a code, the page remembers it (on this device, for 55 minutes), so coming back shows the code box
// again with their email filled in. Run it AFTER apply-signin-polish-patch.mjs. Safe to run twice. All or nothing.
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/app/login/page.tsx";
const text = readFileSync(file, "utf8");

if (text.includes("rememberPending")) { console.log("already done  " + file); process.exit(0); }
if (!text.includes("emailTypoFix")) {
  console.error("Nothing was changed. Run apply-signin-polish-patch.mjs first.");
  process.exit(1);
}

const nl = text.includes("\r\n") ? "\r\n" : "\n";
const L = (s) => s.replace(/\n/g, nl);
function replaceOnce(source, from, to, label) {
  const a = L(from);
  const first = source.indexOf(a);
  if (first === -1 || source.indexOf(a, first + a.length) !== -1) throw new Error("could not find exactly one place to change: " + label);
  return source.slice(0, first) + L(to) + source.slice(first + a.length);
}

try {
  let s = text;

  s = replaceOnce(s, `const MAIL_TYPOS: Record<string, string> = {`, `const PENDING_KEY = "yebo-pending";
const PENDING_MS = 55 * 60 * 1000;

function rememberPending(address: string) {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({ email: address, at: Date.now() }));
  } catch {
    /* storage can be blocked */
  }
}

function forgetPending() {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage can be blocked */
  }
}

function readPending(): string | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { email?: string; at?: number };
    if (!data.email || !data.at || Date.now() - data.at > PENDING_MS) return null;
    return data.email;
  } catch {
    return null;
  }
}

const MAIL_TYPOS: Record<string, string> = {`, "helpers");

  s = replaceOnce(s, `      setSent(true);\n      setCooldown(30);\n`, `      setSent(true);\n      setCooldown(30);\n      rememberPending(email.trim());\n`, "after send");
  s = replaceOnce(s, `      setCode("");\n      setCooldown(30);\n`, `      setCode("");\n      setCooldown(30);\n      rememberPending(email.trim());\n`, "after resend");
  s = replaceOnce(s, `      window.location.assign("/app");`, `      forgetPending();\n      window.location.assign("/app");`, "after sign-in");
  s = replaceOnce(s, `      if (saved) setEmail((current) => current || saved);\n`, `      if (saved) setEmail((current) => current || saved);
      const pending = readPending();
      if (pending) {
        setEmail(pending);
        setSent(true);
        setMsg("Welcome back. Type the code we emailed to " + pending + ", or ask for a new one.");
      }
`, "restore on load");

  writeFileSync(file, s);
  console.log("patched       " + file);
} catch (error) {
  console.error("Nothing was changed. " + error.message);
  process.exit(1);
}
