import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { waLink } from "@/lib/dates";
import { SURVEY } from "@/lib/survey";
import { adminEmails, adminList, isAdminEmail, lastDays, pct, tally } from "@/lib/admin-stats";
import { SIGNIN_PROBLEMS, SIGNIN_STEPS, countSessions } from "@/lib/signin-events";
import { dueNudges, nudgesEnabled } from "@/lib/nudges";
import AdminGate from "./AdminGate";
import { resolveError } from "./actions";

export const metadata: Metadata = { title: "Admin | Yebo Invoices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type AuthUser = { id: string; email?: string; created_at: string; last_sign_in_at?: string; app_metadata?: { provider?: string } };
type Biz = { id: string; owner_id: string; name: string; email: string | null; phone: string | null; created_at: string };
type Doc = { business_id: string; type: string; status: string; created_at: string };
type Sub = { business_id: string; status: string; plan: string };
type ErrorRow = { id: string; source: string; message: string; last_path: string | null; count: number; last_seen: string };
type SigninRow = { session_id: string; step: string; created_at: string };
type Survey = { answers: Record<string, string | string[]>; source: string | null; created_at: string };

const MINUTE = 60_000;
const DAY = 86_400_000;

async function allUsers(admin: ReturnType<typeof createAdminClient>): Promise<AuthUser[]> {
  const users: AuthUser[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    users.push(...(data.users as AuthUser[]));
    if (data.users.length < 1000) break;
  }
  return users;
}

export default async function Admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = adminList();
  if (!user || !isAdminEmail(user.email, allowed)) return <AdminGate />;

  const admin = createAdminClient();
  const [users, bizRes, docRes, subRes, surveyRes] = await Promise.all([
    allUsers(admin),
    admin.from("businesses").select("id,owner_id,name,email,phone,created_at").order("created_at", { ascending: false }).limit(5000),
    admin.from("documents").select("business_id,type,status,created_at").limit(20000),
    admin.from("subscriptions").select("business_id,status,plan").limit(5000),
    admin.from("survey_responses").select("answers,source,created_at").order("created_at", { ascending: false }).limit(2000),
  ]);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [errRes, sigRes, nudgeRes, due] = await Promise.all([
    admin.from("error_log").select("id,source,message,last_path,count,last_seen").eq("resolved", false).order("last_seen", { ascending: false }).limit(30),
    admin.from("signin_events").select("session_id,step,created_at").gte("created_at", since).limit(20000),
    admin.from("nudges").select("email,kind,created_at").order("created_at", { ascending: false }).limit(15),
    dueNudges(admin).catch(() => []),
  ]);
  const errors = errRes.error ? null : ((errRes.data ?? []) as ErrorRow[]);
  const signins = sigRes.error ? null : ((sigRes.data ?? []) as SigninRow[]);
  const nudgeLog = nudgeRes.error ? null : ((nudgeRes.data ?? []) as { email: string; kind: string; created_at: string }[]);
  const businesses = (bizRes.data ?? []) as Biz[];
  const docs = (docRes.data ?? []) as Doc[];
  const subs = (subRes.data ?? []) as Sub[];
  const surveys = surveyRes.error ? null : ((surveyRes.data ?? []) as Survey[]);

  const now = Date.now();
  const ownerIds = new Set(businesses.map((b) => b.owner_id));
  const withQuote = new Set(docs.filter((d) => d.type === "quote").map((d) => d.business_id));
  const withSent = new Set(docs.filter((d) => d.type === "quote" && d.status !== "draft").map((d) => d.business_id));
  const withPaid = new Set(docs.filter((d) => d.type === "invoice" && d.status === "paid").map((d) => d.business_id));
  const subscribed = new Set(subs.filter((s) => s.status === "active" || s.status === "comped").map((s) => s.business_id));

  const funnel = [
    { label: "Signed up", value: users.length },
    { label: "Finished onboarding", value: businesses.length },
    { label: "Created a quote", value: withQuote.size },
    { label: "Sent a quote", value: withSent.size },
    { label: "Got a paid invoice", value: withPaid.size },
    { label: "On a paid plan", value: subscribed.size },
  ];

  const adminSet = new Set(adminEmails(allowed));
  const notOnboarded = users
    .filter((u) => !ownerIds.has(u.id) && !adminSet.has((u.email ?? "").toLowerCase()) && now - new Date(u.created_at).getTime() > 30 * MINUTE)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);
  const noSentQuote = businesses.filter((b) => !withSent.has(b.id) && now - new Date(b.created_at).getTime() > 2 * DAY).slice(0, 50);

  const signupDays = lastDays(users.map((u) => u.created_at), 14);
  const docDays = lastDays(docs.map((d) => d.created_at), 14);
  const peak = Math.max(1, ...signupDays.map((d) => d.count), ...docDays.map((d) => d.count));

  const question = (id: string) => SURVEY.find((q) => q.id === id);
  const surveyBlock = (id: string) => {
    const q = question(id);
    if (!q || !surveys) return null;
    return { text: q.text, rows: tally(surveys.map((s) => s.answers?.[id]), q.options) };
  };
  const surveyBlocks = ["pay", "price", "progress", "problem", "want"].map(surveyBlock).filter((b): b is NonNullable<typeof b> => b !== null);

  const planCounts = subs.reduce<Record<string, number>>((acc, s) => {
    const key = s.plan + " (" + s.status + ")";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const week = Date.now() - 7 * DAY;
  const signin7 = signins ? countSessions(signins.filter((r) => new Date(r.created_at).getTime() >= week)) : {};
  const signin30 = signins ? countSessions(signins) : {};
  const nudgesOn = nudgesEnabled();

  const card = "rounded-2xl border border-yebo-deep/10 bg-white p-5 shadow-sm";
  const th = "px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[.12em] text-yebo-deep/55";
  const td = "px-3 py-2 text-sm text-yebo-deep";

  return (
    <main className="min-h-screen bg-paper pb-16">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Yebo admin</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-yebo-deep">What is happening in Yebo</h1>
          </div>
          <Link href="/app" className="text-sm font-bold text-yebo underline decoration-yebo/30 underline-offset-4">Back to the app</Link>
        </div>

        <section className="mt-8" aria-labelledby="errs">
          <h2 id="errs" className="text-xl font-black text-yebo-deep">Errors {errors ? "(" + errors.length + " open)" : ""}</h2>
          <p className="mt-1 text-sm text-yebo-deep/60">Things that broke for real people. The same problem is one line with a count. You get an email the first time, then at 5, 25 and 100.</p>
          <div className={card + " mt-3 overflow-x-auto"}>
            {!errors ? <p className="text-sm text-yebo-deep/60">The tracking SQL has not been run yet.</p> : errors.length === 0 ? <p className="text-sm text-yebo-deep/60">No open errors. 🎉</p> : (
              <table className="w-full min-w-[680px]">
                <thead><tr><th className={th}>What happened</th><th className={th}>Where</th><th className={th}>Times</th><th className={th}>Last</th><th className={th}></th></tr></thead>
                <tbody>
                  {errors.map((e) => (
                    <tr key={e.id} className="border-t border-yebo-deep/10 align-top">
                      <td className={td + " break-words"}><span className="mr-2 rounded-full bg-yebo-chalk px-2 py-0.5 text-xs font-bold">{e.source}</span>{e.message}</td>
                      <td className={td + " break-all"}>{e.last_path ?? "-"}</td>
                      <td className={td + " font-bold tabular-nums"}>{e.count}</td>
                      <td className={td}>{formatSouthAfricaDateTime(e.last_seen)}</td>
                      <td className={td}><form action={resolveError}><input type="hidden" name="id" value={e.id} /><button className="text-sm font-bold text-yebo underline underline-offset-4">Mark fixed</button></form></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="signin">
          <h2 id="signin" className="text-xl font-black text-yebo-deep">Sign-in funnel</h2>
          <p className="mt-1 text-sm text-yebo-deep/60">Counts visits to the sign-in page, not people. It starts counting from the day this was added.</p>
          <div className={card + " mt-3 overflow-x-auto"}>
            {!signins ? <p className="text-sm text-yebo-deep/60">The tracking SQL has not been run yet.</p> : (
              <>
                <table className="w-full min-w-[520px]">
                  <thead><tr><th className={th}>Step</th><th className={th}>Last 7 days</th><th className={th}>Last 30 days</th><th className={th}>Of the step before (30d)</th></tr></thead>
                  <tbody>
                    {SIGNIN_STEPS.map((st, i) => (
                      <tr key={st.id} className="border-t border-yebo-deep/10">
                        <td className={td + " font-bold"}>{st.label}</td>
                        <td className={td + " tabular-nums"}>{signin7[st.id] ?? 0}</td>
                        <td className={td + " tabular-nums"}>{signin30[st.id] ?? 0}</td>
                        <td className={td + " tabular-nums"}>{i === 0 ? "-" : pct(signin30[st.id] ?? 0, signin30[SIGNIN_STEPS[i - 1].id] ?? 0) + "%"}</td>
                      </tr>
                    ))}
                    {SIGNIN_PROBLEMS.map((st) => (
                      <tr key={st.id} className="border-t border-yebo-deep/10 text-yebo-deep/70">
                        <td className={td}>{st.label}</td>
                        <td className={td + " tabular-nums"}>{signin7[st.id] ?? 0}</td>
                        <td className={td + " tabular-nums"}>{signin30[st.id] ?? 0}</td>
                        <td className={td}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs leading-5 text-yebo-deep/55">Google sign-ins leave the page, so they show as taps, not as finished sign-ins. Your real sign-up count is in the funnel below.</p>
              </>
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="funnel">
          <h2 id="funnel" className="text-xl font-black text-yebo-deep">From sign-up to paid</h2>
          <div className={card + " mt-3"}>
            <ol className="flex flex-col gap-3">
              {funnel.map((step, i) => (
                <li key={step.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-bold text-yebo-deep">{step.label}</span>
                    <span className="tabular-nums text-yebo-deep/70">
                      <b className="text-yebo-deep">{step.value}</b>
                      {i > 0 && <span> · {pct(step.value, funnel[i - 1].value)}% of the step before</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-yebo-deep/10">
                    <div className="h-full rounded-full bg-yebo" style={{ width: pct(step.value, funnel[0].value) + "%" }} />
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-5 text-yebo-deep/55">A person counts as signed up when they have an account. They finish onboarding when their business is created. Counts are of people and businesses, not documents.</p>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="days">
          <h2 id="days" className="text-xl font-black text-yebo-deep">Last 14 days</h2>
          <div className={card + " mt-3 overflow-x-auto"}>
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr><th className={th}>Day</th><th className={th}>New sign-ups</th><th className={th}>Quotes and invoices created</th></tr></thead>
              <tbody>
                {[...signupDays].reverse().map((d, i) => {
                  const docsToday = [...docDays].reverse()[i].count;
                  return (
                    <tr key={d.day} className="border-t border-yebo-deep/10">
                      <td className={td}>{d.day}</td>
                      <td className={td}>
                        <span className="inline-block h-2 rounded-full bg-yebo align-middle" style={{ width: Math.max(2, (d.count / peak) * 120) + "px" }} /> <b className="ml-2">{d.count}</b>
                      </td>
                      <td className={td}>
                        <span className="inline-block h-2 rounded-full bg-yebo-sun align-middle" style={{ width: Math.max(2, (docsToday / peak) * 120) + "px" }} /> <b className="ml-2">{docsToday}</b>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="stuck1">
          <h2 id="stuck1" className="text-xl font-black text-yebo-deep">Signed up, never finished onboarding ({notOnboarded.length})</h2>
          <p className="mt-1 text-sm text-yebo-deep/60">Accounts older than 30 minutes with no business set up. Newest first.</p>
          <div className={card + " mt-3 overflow-x-auto"}>
            {notOnboarded.length === 0 ? <p className="text-sm text-yebo-deep/60">Nobody is stuck here.</p> : (
              <table className="w-full min-w-[620px]">
                <thead><tr><th className={th}>Email</th><th className={th}>Signed up</th><th className={th}>Last sign-in</th><th className={th}>How</th></tr></thead>
                <tbody>
                  {notOnboarded.map((u) => (
                    <tr key={u.id} className="border-t border-yebo-deep/10">
                      <td className={td + " break-all"}>{u.email ?? "(no email)"}</td>
                      <td className={td}>{formatSouthAfricaDateTime(u.created_at)}</td>
                      <td className={td}>{u.last_sign_in_at ? formatSouthAfricaDateTime(u.last_sign_in_at) : "never"}</td>
                      <td className={td}>{u.app_metadata?.provider ?? "email"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="stuck2">
          <h2 id="stuck2" className="text-xl font-black text-yebo-deep">Set up, but no quote sent after 2 days ({noSentQuote.length})</h2>
          <p className="mt-1 text-sm text-yebo-deep/60">One tap opens WhatsApp with a friendly message written. You press send.</p>
          <div className={card + " mt-3 overflow-x-auto"}>
            {noSentQuote.length === 0 ? <p className="text-sm text-yebo-deep/60">Everyone has sent a quote.</p> : (
              <table className="w-full min-w-[620px]">
                <thead><tr><th className={th}>Business</th><th className={th}>Email</th><th className={th}>Created</th><th className={th}>Message</th></tr></thead>
                <tbody>
                  {noSentQuote.map((b) => (
                    <tr key={b.id} className="border-t border-yebo-deep/10">
                      <td className={td + " font-bold"}>{b.name}</td>
                      <td className={td + " break-all"}>{b.email ?? "-"}</td>
                      <td className={td}>{formatSouthAfricaDateTime(b.created_at)}</td>
                      <td className={td}>
                        {b.phone ? (
                          <a className="font-bold text-yebo underline decoration-yebo/30 underline-offset-4" target="_blank" rel="noreferrer"
                            href={waLink(b.phone, "Hi " + b.name + ", this is Yebo Invoices. I saw you set up your account but have not sent your first quote yet. Can I help you get it out?")}>WhatsApp</a>
                        ) : "no phone"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="nudges">
          <h2 id="nudges" className="text-xl font-black text-yebo-deep">Reminder emails to stalled people</h2>
          <div className={card + " mt-3"}>
            <p className="text-sm text-yebo-deep">
              Status: <b>{nudgesOn ? "ON" : "OFF"}</b>. {nudgesOn ? "They go out once a day with the morning run." : "Nothing is sent. To turn on, add NUDGES_ENABLED=true in Vercel and redeploy."}
            </p>
            <p className="mt-2 text-sm text-yebo-deep/70">Due at the next daily run: <b>{due.length}</b> ({due.filter((d) => d.kind === "onboarding").length} to finish setup, {due.filter((d) => d.kind === "first_quote").length} to send a first quote). Rules: at most 2 of each kind, at least 3 days apart, stops after 30 days, with an unsubscribe link.</p>
            {nudgeLog && nudgeLog.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-sm text-yebo-deep/80">
                {nudgeLog.map((n, i) => <li key={i} className="break-all">{formatSouthAfricaDateTime(n.created_at)} · {n.kind === "onboarding" ? "finish setup" : "first quote"} · {n.email}</li>)}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="plans">
          <h2 id="plans" className="text-xl font-black text-yebo-deep">Plans</h2>
          <div className={card + " mt-3"}>
            {Object.keys(planCounts).length === 0 ? <p className="text-sm text-yebo-deep/60">No subscriptions yet.</p> : (
              <ul className="flex flex-wrap gap-3">
                {Object.entries(planCounts).map(([k, v]) => (
                  <li key={k} className="rounded-full bg-yebo-chalk px-4 py-2 text-sm font-bold text-yebo-deep">{k}: {v}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="survey">
          <h2 id="survey" className="text-xl font-black text-yebo-deep">Survey {surveys ? "(" + surveys.length + " answers)" : ""}</h2>
          {!surveys ? (
            <p className={card + " mt-3 text-sm text-yebo-deep/60"}>The survey table does not exist yet. Run the survey SQL first.</p>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {surveyBlocks.map((b) => (
                <div key={b.text} className={card}>
                  <h3 className="text-sm font-black text-yebo-deep">{b.text}</h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {b.rows.map((r) => (
                      <li key={r.option} className="text-sm text-yebo-deep">
                        <div className="flex justify-between gap-3"><span>{r.option}</span><b className="tabular-nums">{r.count}</b></div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-yebo-deep/10"><div className="h-full rounded-full bg-yebo" style={{ width: pct(r.count, surveys.length) + "%" }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
