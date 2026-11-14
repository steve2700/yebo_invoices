// Login becomes two clean steps, like Claude: 1) email, 2) "enter the code we sent to you@x.com". Safe to run twice.
import fs from "node:fs";
const file = "src/app/login/page.tsx";
const raw = fs.readFileSync(file, "utf8");
if (raw.includes("changeEmail")) { console.log("already login steps"); process.exit(0); }
const crlf = raw.includes("\r\n");
let t = raw.replace(/\r\n/g, "\n");
const fail = (what) => { console.log("MISSING", what, "(send me src/app/login/page.tsx)"); process.exit(1); };

// 1. step one (Google, divider, email form) only shows before the code is sent
const a = t.indexOf("          <button\n            type=\"button\"\n            onClick={() => void google()}");
const formStart = t.indexOf("<form onSubmit={magic}");
const bEnd = formStart < 0 ? -1 : t.indexOf("          </form>\n", formStart);
if (a < 0 || bEnd < 0) fail("step one block");
const b = bEnd + "          </form>\n".length;
t = t.slice(0, a) + "          {!sent && (\n            <>\n" + t.slice(a, b) + "            </>\n          )}\n" + t.slice(b);

// 2. headings change on step two
const swaps = [
  [">Welcome to Yebo</p>", ">{sent ? \"Check your email\" : \"Welcome to Yebo\"}</p>"],
  ["            Sign in or create your account\n", "            {sent ? \"Enter your code\" : \"Sign in or create your account\"}\n"],
  ["            New to Yebo? Sign in and your account will be created automatically.\n", "            {sent ? <>We sent a 6-digit code to <strong className=\"break-all font-bold text-yebo-deep\">{email.trim()}</strong>. It can take a minute, so check spam too.</> : \"New to Yebo? Sign in and your account will be created automatically.\"}\n"],
  ["      setMsg(\"We sent a 6-digit code to your email. Type it below. It can take a minute, so check spam too.\");\n", ""],
  ["  function verify(event: FormEvent<HTMLFormElement>) {", "  function changeEmail() {\n    setSent(false);\n    setCode(\"\");\n    setMsg(\"\");\n    setError(false);\n    forgetPending();\n  }\n\n  function verify(event: FormEvent<HTMLFormElement>) {"],
];
for (const [from, to] of swaps) { if (!t.includes(from)) fail(from.trim().slice(0, 40)); t = t.replace(from, to); }

// 3. the code step itself
const c = t.indexOf("          {sent && (\n            <form data-signin-code");
const cEnd = c < 0 ? -1 : t.indexOf("            </form>\n          )}\n", c);
if (c < 0 || cEnd < 0) fail("code form");
const c2 = cEnd + "            </form>\n          )}\n".length;
const step = `          {sent && (
            <form data-signin-code onSubmit={verify} className="mt-8 flex flex-col gap-4">
              <div>
                <label htmlFor="signin-code" className="block text-sm font-bold text-yebo-deep">Verification code</label>
                <input
                  id="signin-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={10}
                  value={code}
                  onChange={(event) => {
                    const next = event.target.value.replace(/[^0-9]/g, "");
                    setCode(next);
                    if (next.length === 6) void verifyCode(next);
                  }}
                  placeholder="Enter your 6-digit code"
                  className="mt-2 min-h-14 w-full rounded-2xl border border-yebo-deep/20 bg-white px-4 py-3 text-center text-xl font-bold tracking-[.25em] text-yebo-deep outline-none transition placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-yebo-deep/35 focus:border-yebo focus:ring-2 focus:ring-yebo/15"
                />
              </div>
              <button
                type="submit"
                disabled={verifying || code.length < 6}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-yebo-deep px-5 py-3 text-sm font-extrabold text-white transition hover:bg-yebo disabled:cursor-wait disabled:opacity-50"
              >
                {verifying ? "Checking code…" : "Verify email address"}
              </button>
              <div className="space-y-1 text-sm leading-6 text-yebo-deep/65">
                <p>
                  Not seeing the email in your inbox?{" "}
                  <button
                    type="button"
                    onClick={() => void resend()}
                    disabled={cooldown > 0 || emailPending}
                    className="font-bold text-yebo underline decoration-yebo/30 underline-offset-4 disabled:no-underline disabled:opacity-50"
                  >
                    {cooldown > 0 ? "Send again in " + cooldown + "s" : "Try sending again"}
                  </button>
                  .
                </p>
                <p>
                  Wrong email?{" "}
                  <button type="button" onClick={changeEmail} className="font-bold text-yebo underline decoration-yebo/30 underline-offset-4">
                    Change email address
                  </button>
                  .
                </p>
                {mail && (
                  <p>
                    <a href={mail.url} target="_blank" rel="noreferrer" className="font-bold text-yebo underline decoration-yebo/30 underline-offset-4">
                      Open {mail.name} →
                    </a>
                  </p>
                )}
              </div>
            </form>
          )}
`;
t = t.slice(0, c) + step + t.slice(c2);
fs.writeFileSync(file, crlf ? t.replace(/\n/g, "\r\n") : t);
console.log("done    login steps");
