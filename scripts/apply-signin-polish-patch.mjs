// Makes email sign-in harder to get stuck on. Adds to the login page:
//  - a warning when Yebo is opened inside Facebook, Instagram, TikTok and similar in-app browsers, where Google sign-in fails
//  - "Send a new code" with a 30 second countdown, and an "Open Gmail / Outlook" shortcut after the code is sent
//  - a "Did you mean gmail.com?" fix for common typing mistakes
//  - the last email used is remembered on this device
//  - plain-English messages when there have been too many tries
// Run it AFTER apply-signin-code-patch.mjs. Edits src/app/login/page.tsx in place. Safe to run twice. All or nothing.
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/app/login/page.tsx";
const text = readFileSync(file, "utf8");

if (text.includes("emailTypoFix")) { console.log("already done  " + file); process.exit(0); }
if (!text.includes("data-signin-code")) {
  console.error("Nothing was changed. Run apply-signin-code-patch.mjs first.");
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

  s = replaceOnce(s, `export default function Login() {`, `const MAIL_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmai.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmail.co": "hotmail.com", "outlok.com": "outlook.com", "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com",
};

function emailTypoFix(value: string): string | null {
  const v = value.trim();
  const at = v.lastIndexOf("@");
  if (at < 1) return null;
  const fixed = MAIL_TYPOS[v.slice(at + 1).toLowerCase()];
  return fixed ? v.slice(0, at + 1) + fixed : null;
}

function mailLink(value: string): { name: string; url: string } | null {
  const v = value.trim();
  const domain = v.slice(v.lastIndexOf("@") + 1).toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") return { name: "Gmail", url: "https://mail.google.com/" };
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) return { name: "Outlook", url: "https://outlook.live.com/mail/" };
  if (domain === "yahoo.com") return { name: "Yahoo Mail", url: "https://mail.yahoo.com/" };
  return null;
}

function friendlyError(caught: unknown, fallback: string): string {
  const text = caught instanceof Error ? caught.message : "";
  if (/rate limit|too many|429|security purposes/i.test(text)) return "Too many tries in a short time. Please wait a minute and try again.";
  if (/disallowed_useragent/i.test(text)) return "Google sign-in does not work inside this app. Open Yebo in Chrome or Safari and try again.";
  return text || fallback;
}

export default function Login() {`, "helpers");

  s = replaceOnce(s, `  const [verifying, setVerifying] = useState(false);\n`, `  const [verifying, setVerifying] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [copied, setCopied] = useState(false);
`, "state");

  s = replaceOnce(s, `  const redirectTo = () => \`\${window.location.origin}/auth/callback\`;\n`, `  useEffect(() => {
    setInApp(/FBAN|FBAV|FB_IAB|Instagram|Snapchat|TikTok|musical_ly|LinkedInApp|Twitter|MicroMessenger/i.test(navigator.userAgent));
    try {
      const saved = window.localStorage.getItem("yebo-email");
      if (saved) setEmail((current) => current || saved);
    } catch {
      /* storage can be blocked, so the email is simply not remembered */
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const redirectTo = () => \`\${window.location.origin}/auth/callback\`;
`, "effects");

  s = replaceOnce(s, `setMsg(caught instanceof Error ? caught.message : "Could not start Google sign-in. Please try again.");`, `setMsg(friendlyError(caught, "Could not start Google sign-in. Please try again."));`, "google error");
  s = replaceOnce(s, `setMsg(caught instanceof Error ? caught.message : "Could not send a sign-in link. Please try again.");`, `setMsg(friendlyError(caught, "Could not send a sign-in link. Please try again."));`, "email error");

  s = replaceOnce(s, `      setSent(true);\n`, `      setSent(true);
      setCooldown(30);
      try {
        window.localStorage.setItem("yebo-email", email.trim());
      } catch {
        /* storage can be blocked */
      }
`, "after send");

  s = replaceOnce(s, `  function verify(event: FormEvent<HTMLFormElement>) {`, `  const mail = mailLink(email);
  const typoFix = emailTypoFix(email);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/login");
      setCopied(true);
    } catch {
      setMsg("Could not copy. Open this page in Chrome or Safari from the menu instead.");
    }
  }

  async function resend() {
    if (cooldown > 0 || emailPending) return;
    setEmailPending(true);
    setError(false);
    setMsg("");
    try {
      const { error: authError } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
      if (authError) throw authError;
      setCode("");
      setCooldown(30);
      setMsg("A new code is on its way. Use the newest email.");
    } catch (caught) {
      setError(true);
      setMsg(friendlyError(caught, "Could not send a new code. Please try again."));
    } finally {
      setEmailPending(false);
    }
  }

  function verify(event: FormEvent<HTMLFormElement>) {`, "resend and helpers");

  s = replaceOnce(s, `          <button
            type="button"
            onClick={() => void google()}`, `          {inApp && (
            <div role="note" className="mt-6 rounded-2xl border border-yebo-sun/60 bg-yebo-sun/15 p-4 text-sm leading-6 text-yebo-deep">
              <p className="font-bold">You are inside another app&apos;s browser.</p>
              <p className="mt-1">Google sign-in often fails here. Tap the menu (three dots) and choose Open in browser, or copy the link and open it in Chrome or Safari. The email code below works here too.</p>
              <button type="button" onClick={() => void copyLink()} className="mt-3 inline-flex min-h-11 items-center rounded-full border border-yebo-deep/25 bg-white px-4 text-sm font-bold">
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => void google()}`, "in-app banner");

  s = replaceOnce(s, `            <button
              type="submit"
              disabled={emailPending || !email.trim()}`, `            {typoFix && (
              <button type="button" onClick={() => setEmail(typoFix)} className="-mt-2 text-left text-sm font-semibold text-yebo underline decoration-yebo/30 underline-offset-4">
                Did you mean {typoFix}?
              </button>
            )}
            <button
              type="submit"
              disabled={emailPending || !email.trim()}`, "typo fix");

  s = replaceOnce(s, `<p className="text-xs leading-5 text-yebo-deep/55">Tip: type the code in this same browser tab. If you tap the link instead, open it in the browser you started in.</p>`, `<p className="text-xs leading-5 text-yebo-deep/55">Tip: type the code in this same browser tab. If you tap the link instead, open it in the browser you started in.</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={cooldown > 0 || emailPending}
                  className="min-h-11 text-sm font-bold text-yebo underline decoration-yebo/30 underline-offset-4 disabled:no-underline disabled:opacity-50"
                >
                  {cooldown > 0 ? "Send a new code in " + cooldown + "s" : "Send a new code"}
                </button>
                {mail && (
                  <a href={mail.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-yebo underline decoration-yebo/30 underline-offset-4">
                    Open {mail.name}
                  </a>
                )}
              </div>`, "resend row");

  writeFileSync(file, s);
  console.log("patched       " + file);
} catch (error) {
  console.error("Nothing was changed. " + error.message);
  process.exit(1);
}
