// Fixes email sign-in getting stuck when the link opens in a different browser (for example Brave instead of Chrome).
// Adds a code box on the login page, so people can type the code from the email into the browser they started in,
// and shows a clear message when a link fails. Edits files in place. Safe to run twice. All or nothing.
import { readFileSync, writeFileSync } from "node:fs";

const files = {
  login: "src/app/login/page.tsx",
  callback: "src/app/auth/callback/route.ts",
};

const login = readFileSync(files.login, "utf8");
const callback = readFileSync(files.callback, "utf8");

if (login.includes("data-signin-code") && callback.includes("/login?e=link")) {
  console.log("already done");
  process.exit(0);
}

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first === -1 || text.indexOf(from, first + from.length) !== -1) {
    throw new Error(`could not find exactly one place to change: ${label}`);
  }
  return text.slice(0, first) + to + text.slice(first + from.length);
}

try {
  const nl = login.includes("\r\n") ? "\r\n" : "\n";
  const L = (s) => s.replace(/\n/g, nl);
  let s = login;

  s = replaceOnce(s, `import { useState } from "react";`, `import { useEffect, useState } from "react";`, "react import");

  s = replaceOnce(
    s,
    L(`  const [googlePending, setGooglePending] = useState(false);\n`),
    L(`  const [googlePending, setGooglePending] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // The sign-in link only works in the browser where it was asked for. If it failed somewhere else, say so clearly.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("e") === "link") {
      setError(true);
      setMsg("That sign-in link did not work in this browser. A link only works in the browser where you asked for it, so Chrome and Brave do not share it. Enter your email below, then type the 6-digit code from the email instead.");
    }
  }, []);
`),
    "state"
  );

  s = replaceOnce(
    s,
    `setMsg("Check your email for a sign-in link. It can take a minute, so check spam too.");`,
    `setSent(true);
      setMsg("We sent a code and a sign-in link to your email. Type the code below. It can take a minute, so check spam too.");`,
    "sent message"
  );

  s = replaceOnce(
    s,
    L(`  return (\n    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">`),
    L(`  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    setError(false);
    setMsg("");
    try {
      const { error: authError } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.replace(/\\s/g, ""), type: "email" });
      if (authError) throw authError;
      window.location.assign("/app");
    } catch {
      setError(true);
      setMsg("That code did not work. Check the newest email, or ask for a new code.");
      setVerifying(false);
    }
  }

  return (\n    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">`),
    "verify function"
  );

  s = replaceOnce(
    s,
    L(`          </form>\n\n          {msg && (`),
    L(`          </form>

          {sent && (
            <form data-signin-code onSubmit={verify} className="mt-5 flex flex-col gap-3">
              <label htmlFor="signin-code" className="text-xs font-extrabold uppercase tracking-[.14em] text-yebo-deep/60">Code from your email</label>
              <input
                id="signin-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="min-h-12 w-full rounded-2xl border border-yebo-deep/15 bg-white px-4 py-3 text-center text-lg font-bold tracking-[.3em] text-yebo-deep outline-none focus:border-yebo focus:ring-2 focus:ring-yebo/15"
              />
              <button
                type="submit"
                disabled={verifying || code.length < 6}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-yebo px-5 py-3 text-sm font-extrabold text-white transition hover:bg-yebo-deep disabled:cursor-wait disabled:opacity-50"
              >
                {verifying ? "Checking code…" : "Sign in with code"}
              </button>
              <p className="text-xs leading-5 text-yebo-deep/55">Tip: type the code in this same browser tab. If you tap the link instead, open it in the browser you started in.</p>
            </form>
          )}

          {msg && (`),
    "code form"
  );

  const cb = replaceOnce(callback, "return NextResponse.redirect(`${origin}/login`);", "return NextResponse.redirect(`${origin}/login?e=link`);", "callback redirect");

  writeFileSync(files.login, s);
  writeFileSync(files.callback, cb);
  console.log("patched       " + files.login);
  console.log("patched       " + files.callback);
} catch (error) {
  console.error("Nothing was changed. " + error.message);
  process.exit(1);
}
