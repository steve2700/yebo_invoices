// Yebo Invoices: pay by EFT when a card will not work, bank-approval tip, and "started to pay, did not finish" in admin.
// Run from the repo root: node apply-eft.mjs   Safe to run twice.
import { readFileSync, writeFileSync, existsSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
if (resolve(here) !== resolve(process.cwd())) { cpSync(join(here, "src"), "src", { recursive: true }); cpSync(join(here, "supabase"), "supabase", { recursive: true }); }
console.log("new files in place");

let problems = 0;
function edit(file, label, done, steps) {
  if (!existsSync(file)) { console.log(`SKIP ${label}: ${file} not found`); problems++; return; }
  const raw = readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let s = raw.replace(/\r\n/g, "\n");
  if (s.includes(done)) { console.log(`ok   ${label}: already done`); return; }
  for (const [from, to] of steps) {
    if (!s.includes(from)) { console.log(`SKIP ${label}: anchor not found`); problems++; return; }
    s = s.replace(from, () => to);
  }
  writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`done ${label}`);
}

// 1. Remember every time someone is sent to the payment page.
edit("src/app/app/subscribe/checkout/route.ts", "checkout log", "checkout_starts", [
  ['import { createClient } from "@/lib/supabase/server";', 'import { createClient } from "@/lib/supabase/server";\nimport { createAdminClient } from "@/lib/supabase/admin";'],
  ["    return Response.redirect(url, 303);",
   '    try { await createAdminClient().from("checkout_starts").insert({ business_id: business.id, plan: planId, provider: "paystack", reference }); } catch { /* the log must never stop a payment */ }\n    return Response.redirect(url, 303);'],
]);

// 2. Plan page: bank-approval tip and the EFT section.
edit("src/app/app/subscribe/page.tsx", "plan page", "EftSection", [
  ['import PlanGrid from "@/components/PlanGrid";', 'import PlanGrid from "@/components/PlanGrid";\nimport EftSection from "./EftSection";'],
  ['      {!paymentsReady && <p role="alert"',
`      <p role="note" className="mt-6 max-w-3xl rounded-2xl bg-white p-4 text-sm leading-6 text-ink/75 ring-1 ring-black/5">
        <b className="text-ink">Paying by card?</b> Your bank may ask you to approve the payment in your banking app or with a code. Keep the bank window open until it says the payment is done. Card not working? You can pay by EFT instead, further down.
      </p>
      {!paymentsReady && <p role="alert"`],
  ['      <p className="mt-8 max-w-3xl text-xs leading-6 text-ink/50">', '      <EftSection />\n\n      <p className="mt-8 max-w-3xl text-xs leading-6 text-ink/50">'],
]);

// 3. Admin menu.
edit("src/app/admin/layout.tsx", "admin menu", "/admin/payments", [
  ['    { href: "/admin/people", label: "People to follow up" },', '    { href: "/admin/people", label: "People to follow up" },\n    { href: "/admin/payments", label: "Payments to sort" },'],
]);

// 4. A plan paid by EFT does not renew by itself, so warn before the month ends.
edit("src/lib/access.ts", "plan type", "provider?: string", [
  ["  cancelled_at?: string | null;\n};", "  cancelled_at?: string | null;\n  provider?: string | null;\n};"],
]);
edit("src/lib/subscription.ts", "plan query", "pf_token,cancelled_at,provider", [
  ['.select("status,plan,current_period_end,pf_token,cancelled_at")', '.select("status,plan,current_period_end,pf_token,cancelled_at,provider")'],
]);
edit("src/lib/billing-notice.ts", "EFT notice", 'provider === "eft"', [
  ['  return null;\n}', '  if (sub.provider === "eft" && sub.status === "active" && days <= 5) {\n    return { tone: "warn", text: `Your plan ends ${inDays} (${until}). You pay by EFT, so please pay again to carry on without a break.`, cta: { label: "Pay for next month", href: "/app/subscribe?change=1" } };\n  }\n  return null;\n}'],
]);

console.log(problems ? `\nFinished with ${problems} SKIP line(s). Send them to me.` : "\nAll done. Now: pnpm build.");
