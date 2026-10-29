// Hooks the new tracking into four existing files: the sign-in page, the root layout and the daily reminders run.
// Needs the sign-in "remember" patch applied first. Safe to run twice. All or nothing: if any spot can not be found, nothing is changed.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const files = {
  login: "src/app/login/page.tsx",
  layout: "src/app/layout.tsx",
  cron: "src/app/api/cron/reminders/route.ts",
};
for (const f of Object.values(files)) if (!existsSync(f)) { console.error("Missing " + f + ". Run this from the project root."); process.exit(1); }

const src = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, readFileSync(f, "utf8")]));
if (!src.login.includes("rememberPending")) { console.error("Nothing was changed. Apply the sign-in patches first (yebo-signin-remember)."); process.exit(1); }

function editor(text) {
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const L = (s) => s.replace(/\n/g, nl);
  return (source, from, to, label) => {
    const a = L(from);
    const i = source.indexOf(a);
    if (i === -1 || source.indexOf(a, i + a.length) !== -1) throw new Error("could not find exactly one place to change: " + label);
    return source.slice(0, i) + L(to) + source.slice(i + a.length);
  };
}

const out = { ...src };
try {
  if (!src.login.includes("trackSignin")) {
    const r = editor(src.login);
    let s = src.login;
    s = r(s, `import { createClient } from "@/lib/supabase/client";\n`, `import { createClient } from "@/lib/supabase/client";\nimport { trackSignin } from "./track";\n`, "import");
    s = r(s, `export default function Login() {`, `function sessionId(): string {
  try {
    let id = window.sessionStorage.getItem("yebo-sid");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.sessionStorage.setItem("yebo-sid", id);
    }
    return id;
  } catch {
    return "nostore-" + Math.random().toString(36).slice(2, 10);
  }
}

// Counts a sign-in step for the admin page. It never blocks or breaks signing in.
function track(step: string, detail?: string) {
  void trackSignin(sessionId(), step, detail).catch(() => {});
}

export default function Login() {`, "track helper");
    s = r(s, `  // The sign-in link only works in the browser where it was asked for.`, `  useEffect(() => {
    track("page_view");
  }, []);

  // The sign-in link only works in the browser where it was asked for.`, "page view");
    s = r(s, `.get("e") === "link") {\n`, `.get("e") === "link") {\n      track("link_failed");\n`, "link failed");
    s = r(s, `    setGooglePending(true);\n`, `    setGooglePending(true);\n    track("google_clicked");\n`, "google click");
    s = r(s, `      setMsg(friendlyError(caught, "Could not start Google sign-in. Please try again."));`, `      track("google_failed", caught instanceof Error ? caught.message : undefined);\n      setMsg(friendlyError(caught, "Could not start Google sign-in. Please try again."));`, "google fail");
    s = r(s, `      setSent(true);\n      setCooldown(30);\n`, `      setSent(true);\n      track("code_requested");\n      setCooldown(30);\n`, "code requested");
    s = r(s, `      setMsg(friendlyError(caught, "Could not send a sign-in code. Please try again."));`, `      track("request_failed", caught instanceof Error ? caught.message : undefined);\n      setMsg(friendlyError(caught, "Could not send a sign-in code. Please try again."));`, "request failed");
    s = r(s, `      setMsg("A new code is on its way. Use the newest email.");`, `      track("resend");\n      setMsg("A new code is on its way. Use the newest email.");`, "resend");
    s = r(s, `      forgetPending();\n      window.location.assign("/app");`, `      forgetPending();\n      await Promise.race([trackSignin(sessionId(), "verified"), new Promise((resolve) => setTimeout(resolve, 800))]).catch(() => {});\n      window.location.assign("/app");`, "verified");
    s = r(s, `    } catch {\n      setError(true);\n      setMsg("That code did not work.`, `    } catch {\n      track("verify_failed");\n      setError(true);\n      setMsg("That code did not work.`, "verify failed");
    out.login = s;
  }
  if (!src.layout.includes("ErrorReporter")) {
    const r = editor(src.layout);
    let s = src.layout;
    s = r(s, `import { appUrl } from "@/lib/url";\n`, `import { appUrl } from "@/lib/url";\nimport ErrorReporter from "@/components/ErrorReporter";\n`, "layout import");
    s = r(s, `{children}</body>`, `{children}<ErrorReporter /></body>`, "layout body");
    out.layout = s;
  }
  if (!src.cron.includes("runNudges")) {
    const r = editor(src.cron);
    let s = src.cron;
    s = r(s, `import { sendMorningLists } from "@/lib/morning-list";\n`, `import { sendMorningLists } from "@/lib/morning-list";\nimport { runNudges } from "@/lib/nudges";\n`, "cron import");
    s = r(s, `  return Response.json({ ...result, expiry, morning, recurring });`, `  // Friendly emails to people who signed up but stalled. Does nothing unless NUDGES_ENABLED=true.\n  const nudges = await runNudges(admin).catch((e) => { console.error("[nudges] failed:", e); return null; });\n  return Response.json({ ...result, expiry, morning, recurring, nudges });`, "cron return");
    out.cron = s;
  }
} catch (e) {
  console.error("Nothing was changed. " + e.message);
  process.exit(1);
}
for (const k of Object.keys(files)) if (out[k] !== src[k]) { writeFileSync(files[k], out[k]); console.log("patched       " + files[k]); } else console.log("already done  " + files[k]);
