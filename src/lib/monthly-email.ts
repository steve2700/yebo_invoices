import type { SupabaseClient } from "@supabase/supabase-js";
import { isEmail, sendEmail } from "./email";
import { billingEnforced, hasAccess } from "./access";
import { hasMonthActivity, loadMonth, monthVerdict } from "./monthly";
import { renderMonthlyEmail } from "./monthly-html";

const MAX_PER_RUN = 250;

// The end-of-month email: easy numbers against last month, one plain verdict, up to three things to do.
// monthly_report_last holds the month we last emailed ("2026-11"), so running it twice never sends twice.
export async function sendMonthlyReports(admin: SupabaseClient, now: Date = new Date()): Promise<{ checked: number; sent: number; skipped: number }> {
  const result = { checked: 0, sent: 0, skipped: 0 };
  const { data: biz, error } = await admin.from("businesses").select("id,name,email,owner_id,brand_color,monthly_report,monthly_report_last").limit(1000);
  if (error) { console.error("[monthly] needs migration 0045:", error.message); return result; }

  for (const b of biz ?? []) {
    if (result.sent >= MAX_PER_RUN) break;
    if (b.monthly_report === false) continue;
    result.checked++;

    if (billingEnforced()) {
      const { data: sub } = await admin.from("subscriptions").select("status,plan,current_period_end").eq("business_id", b.id).maybeSingle();
      if (!hasAccess(sub)) { result.skipped++; continue; }
    }
    const loaded = await loadMonth(admin, b.id as string, now);
    if (!loaded) { result.skipped++; continue; }
    const { data: d, windows: w } = loaded;
    if (b.monthly_report_last === w.key || !hasMonthActivity(d)) { result.skipped++; continue; }

    let to: string | null = isEmail(b.email) ? String(b.email).trim() : null;
    if (!to && b.owner_id) {
      const { data: owner } = await admin.auth.admin.getUserById(b.owner_id as string);
      to = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
    }
    if (!to) { result.skipped++; continue; }

    const v = monthVerdict(d);
    const ok = await sendEmail({
      to, fromName: "Yebo Invoices", idempotencyKey: `monthly/${b.id}/${w.key}`,
      subject: `${w.label}: ${v.headline}`,
      html: renderMonthlyEmail({ name: (b.name as string | null) ?? null, d, w, v, brandColor: (b.brand_color as string | null) ?? null }),
    });
    if (ok) {
      result.sent++;
      await admin.from("businesses").update({ monthly_report_last: w.key }).eq("id", b.id);
    } else result.skipped++;
  }
  return result;
}
