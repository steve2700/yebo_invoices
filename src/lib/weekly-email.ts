import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl } from "./url";
import { isEmail, renderEmail, sendEmail } from "./email";
import { billingEnforced, hasAccess } from "./access";
import { arrow, arrowMoney, loadWeek, verdictFor } from "./weekly";
import { formatRand } from "./money";

const MAX_PER_RUN = 250;

const short = (a: { text: string }) => a.text.replace(" on last week", "").replace("Same as last week", "Same").replace("None either week", "None");

// The Friday email: the same numbers and verdict as the dashboard card. Everyone gets it unless they switched it off.
// weekly_review_last records the Monday of the week we emailed, so running the job twice never sends twice.
export async function sendWeeklyReviews(admin: SupabaseClient): Promise<{ checked: number; sent: number; skipped: number }> {
  const result = { checked: 0, sent: 0, skipped: 0 };
  const { data: biz, error } = await admin.from("businesses").select("id,name,email,owner_id,brand_color,weekly_review,weekly_review_last").limit(1000);
  if (error) { console.error("[weekly] needs migration 0043:", error.message); return result; }

  for (const b of biz ?? []) {
    if (result.sent >= MAX_PER_RUN) break;
    if (b.weekly_review === false) continue;
    result.checked++;

    if (billingEnforced()) {
      const { data: sub } = await admin.from("subscriptions").select("status,plan,current_period_end").eq("business_id", b.id).maybeSingle();
      if (!hasAccess(sub)) { result.skipped++; continue; }
    }

    const loaded = await loadWeek(admin, b.id as string);
    if (!loaded) { result.skipped++; continue; }
    const { week, windows } = loaded;
    if (b.weekly_review_last === windows.mondayDate) { result.skipped++; continue; }
    const verdict = verdictFor(week);
    // Nobody who has never sent a quote, or has been silent for weeks, gets a nagging email.
    if (!week.everSent || (verdict.key === "quiet" && week.sent14 === 0)) { result.skipped++; continue; }

    let to: string | null = isEmail(b.email) ? String(b.email).trim() : null;
    if (!to && b.owner_id) {
      const { data: owner } = await admin.auth.admin.getUserById(b.owner_id as string);
      to = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
    }
    if (!to) { result.skipped++; continue; }

    const ideas = verdict.tips.length ? ` Ideas: ${verdict.tips.join(" ")}` : "";
    const sent = await sendEmail({
      to,
      fromName: "Yebo Invoices",
      idempotencyKey: `weekly/${b.id}/${windows.mondayDate}`,
      subject: `Your week: ${verdict.headline}`,
      html: renderEmail({
        brandColor: (b.brand_color as string | null) ?? null,
        heading: verdict.headline,
        intro: `${verdict.detail}${ideas}`,
        rows: [
          ["Quotes sent", `${week.sent}  (${short(arrow(week.sent, week.sentPrev))})`],
          ["Quotes opened", `${week.opened}  (${short(arrow(week.opened, week.openedPrev))})`],
          ["Quotes accepted", `${week.accepted}  (${short(arrow(week.accepted, week.acceptedPrev))})`],
          ["Money collected", `${formatRand(week.collectedCents)}  (${short(arrowMoney(week.collectedCents, week.collectedPrevCents))})`],
          ["Waiting to invoice", formatRand(week.readyCents)],
        ],
        note: verdict.also ? `Also: ${verdict.also}` : null,
        buttonLabel: verdict.action.label,
        buttonUrl: `${appUrl()}${verdict.action.href}`,
        footer: `${windows.label}, compared with the same point last week. You can switch this Friday email off on your dashboard.`,
      }),
    });
    if (sent) {
      result.sent++;
      await admin.from("businesses").update({ weekly_review_last: windows.mondayDate }).eq("id", b.id);
    } else result.skipped++;
  }
  return result;
}
