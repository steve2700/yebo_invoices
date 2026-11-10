// Yebo Invoices: plan notices, pay in advance, and plan changes that keep your paid days.
// Run from the repo root: node <this folder>/apply-plan-notices.mjs   Safe to run twice.
import { readFileSync, writeFileSync, existsSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
if (resolve(here) !== resolve(process.cwd())) cpSync(join(here, "src"), "src", { recursive: true }); // unzipped straight into the repo: files are already in place
console.log("new files in place");

let problems = 0;
// steps: [from, to]. "done" is text that is only present after the edit. Line endings (CRLF) are kept.
function edit(file, label, done, steps) {
  if (!existsSync(file)) { console.log(`SKIP ${label}: ${file} not found`); problems++; return; }
  const raw = readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let s = raw.replace(/\r\n/g, "\n");
  if (s.includes(done)) { console.log(`ok   ${label}: already done`); return; }
  for (const [from, to] of steps) {
    if (typeof from === "string" ? !s.includes(from) : !from.test(s)) { console.log(`SKIP ${label}: anchor not found`); problems++; return; }
    s = s.replace(from, () => to);
  }
  writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`done ${label}`);
}

// 1. The top-of-app note now comes from billing-notice.ts and can carry a button.
edit("src/lib/subscription.ts", "banner", "billingNoticeFor", [
  [/export async function billingBanner\(\)[\s\S]*?\n}\n/,
`export async function billingBanner(): Promise<BillingNotice | null> {
  if (!billingEnforced()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const sub = await loadSubscription(supabase);
  if (!hasAccess(sub)) return null;
  return billingNoticeFor(sub);
}
`],
  ['import { createClient }', 'import { billingNoticeFor, type BillingNotice } from "@/lib/billing-notice";\nimport { createClient }'],
  ['import { formatSouthAfricaDateTime, southAfricaMonth } from "@/lib/time";', 'import { southAfricaMonth } from "@/lib/time";'],
]);
edit("src/app/app/layout.tsx", "banner button", "banner.cta", [
  ['{banner.text} <Link href="/app/settings#billing" className="underline underline-offset-2">Manage plan</Link>',
   '{banner.text}{" "}\n          {banner.cta && <Link href={banner.cta.href} className="mx-1 inline-flex rounded-full bg-yebo-deep px-3 py-1 text-xs font-extrabold text-white no-underline">{banner.cta.label}</Link>}\n          <Link href="/app/settings#billing" className="underline underline-offset-2">Manage plan</Link>'],
]);

// 2. Settings: "Keep my plan" and a thank-you note.
edit("src/app/app/billing/BillingCard.tsx", "billing card", "Thank you for backing Yebo", [
  ['            {(status === "active" || status === "past_due") && <CancelPlanButton />}\n          </div>\n',
`            {(status === "active" || status === "past_due") && <CancelPlanButton />}
            {(status === "cancelled" || status === "past_due") && <Link href="/app/subscribe?change=1" className="inline-flex min-h-11 items-center rounded-xl border border-yebo/30 px-5 text-sm font-extrabold text-yebo-deep transition hover:bg-yebo-chalk">{status === "cancelled" ? "Keep my plan" : "Fix my payment"}</Link>}
          </div>
          {status !== "comped" && (
            <p className="mt-5 rounded-2xl bg-lime/25 p-4 text-sm leading-6 text-yebo-deep/80">
              <b className="text-yebo-deep">Thank you for backing Yebo.</b> We hope it is saving you time. We keep measuring what helps and improving it, so if something is missing or slow, <Link href="/app/help" className="font-bold underline underline-offset-2">tell us</Link> and it goes on our list.
            </p>
          )}
`],
]);

// 3. Plan page: explain switching, and let someone renew their own plan.
edit("src/app/app/subscribe/page.tsx", "plan page", "How switching works", [
  ['      {!paymentsReady && <p role="alert"',
`      {change && active && (
        <div role="note" className="mt-6 max-w-3xl rounded-2xl bg-white p-4 text-sm leading-6 text-ink/75 ring-1 ring-black/5">
          <p className="font-bold text-ink">How switching works</p>
          <p className="mt-1">Pick a plan and pay for it today. Your old plan is stopped automatically, so you are never charged twice. The days you already paid for are added on top, so nothing is wasted. Going down to a smaller plan works the same way.</p>
        </div>
      )}
      {!paymentsReady && <p role="alert"`],
  ['<PlanGrid mode="subscribe" currentPlan={active ? planOf(sub) : null} onboarding={Boolean(onboarding)} />',
   '<PlanGrid mode="subscribe" currentPlan={active ? planOf(sub) : null} onboarding={Boolean(onboarding)} renewable={sub?.status === "cancelled" || sub?.status === "past_due"} />'],
]);
edit("src/components/PlanGrid.tsx", "plan grid", "renewable", [
  ["  onboarding?: boolean;\n};", "  onboarding?: boolean;\n  renewable?: boolean; // their own plan is cancelled or failed: let them pay again\n};"],
  ["currentPlan = null, onboarding = false }: Props)", "currentPlan = null, onboarding = false, renewable = false }: Props)"],
  ["              ) : isCurrent ? (", "              ) : isCurrent && !renewable ? ("],
  ["{currentPlan ? `Switch to ${plan.name}` : `Subscribe for ${priceLabel(id)} a month`}",
   "{isCurrent ? `Keep ${plan.name} (${priceLabel(id)} a month)` : currentPlan ? `Switch to ${plan.name}` : `Subscribe for ${priceLabel(id)} a month`}"],
]);

// 4. A new subscription (a switch, or paying again early) adds the days they already paid for. Monthly renewals are untouched.
edit("src/lib/paystack-billing.ts", "carry over paid days", "carryOver", [
  ['.select("status,plan,provider,pf_token,started_at").eq', '.select("status,plan,provider,pf_token,started_at,current_period_end").eq'],
  ["  const periodEnd = new Date(now);\n  periodEnd.setMonth(periodEnd.getMonth() + 1);\n  periodEnd.setDate(periodEnd.getDate() + 3); // one month plus 3 spare days in case a renewal is a little late\n",
`  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(periodEnd.getDate() + 3); // one month plus 3 spare days in case a renewal is a little late
  // Our own checkout carries business_id in the metadata; a monthly renewal from Paystack does not.
  // So this is a brand-new subscription (a plan switch, or paying again early): keep the days already paid for.
  const carryOver = typeof tx.metadata.business_id === "string" && existing && existing.status !== "comped" && existing.current_period_end && new Date(existing.current_period_end) > now;
  if (carryOver) {
    if (repeat && existing.status === "active" && existing.plan === planId && existing.provider === "paystack") {
      periodEnd.setTime(new Date(existing.current_period_end as string).getTime()); // already counted: do not add it twice
    } else {
      const base = new Date(existing.current_period_end as string);
      base.setMonth(base.getMonth() + 1);
      periodEnd.setTime(base.getTime());
    }
  }
`],
]);

// 5. Terms: say it in the legal text too.
edit("src/lib/legal-content.ts", "terms: switching", "paid for are added", [
  ["When you switch, your new plan starts when your payment for it is received.", "When you switch, your new plan starts when your payment for it is received, and any days you have already paid for are added on top."],
]);

console.log(problems ? `\nFinished with ${problems} SKIP line(s). Send them to me.` : "\nAll done. Now: pnpm build.");
