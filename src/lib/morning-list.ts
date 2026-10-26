import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl } from "./url";
import { isEmail, renderEmail, sendEmail } from "./email";
import { southAfricaDate } from "./time";
import { loadReminderItems, type FollowupRow } from "./reminders-load";
import { reminderDetail, type ReminderItem } from "./reminder-queue";

const MAX_LINES = 8;

// Emails each owner the reminders that are ready to send on WhatsApp. It runs after the automatic client emails, so a
// reminder that was already emailed to the client is no longer due and does not appear here. Returns how many emails went.
export async function sendMorningLists(admin: SupabaseClient, planAllows: (businessId: string) => Promise<boolean>): Promise<{ checked: number; sent: number }> {
  const result = { checked: 0, sent: 0 };
  const { data: rows, error } = await admin.rpc("followups_due");
  if (error) { console.error("[morning list] follow-ups:", error.message); return result; }
  const items = await loadReminderItems(admin, (rows ?? []) as FollowupRow[]);
  if (!items.length) return result;

  const byBusiness = new Map<string, ReminderItem[]>();
  for (const item of items) byBusiness.set(item.businessId, [...(byBusiness.get(item.businessId) ?? []), item]);

  const { data: biz, error: bizError } = await admin.from("businesses").select("id,name,email,owner_id,brand_color,morning_list").in("id", [...byBusiness.keys()]);
  if (bizError) { console.error("[morning list] needs migration 0024:", bizError.message); return result; }
  const today = southAfricaDate();

  for (const b of biz ?? []) {
    const list = byBusiness.get(b.id as string) ?? [];
    if (!list.length || b.morning_list === false) continue;
    if (!(await planAllows(b.id as string))) continue;
    result.checked++;

    let to: string | null = isEmail(b.email) ? String(b.email).trim() : null;
    if (!to && b.owner_id) {
      const { data: owner } = await admin.auth.admin.getUserById(b.owner_id as string);
      to = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
    }
    if (!to) continue;

    const shown = list.slice(0, MAX_LINES);
    const rowsOut: [string, string][] = shown.map((item) => [`${item.clientName} · ${item.number}`, reminderDetail(item)]);
    if (list.length > shown.length) rowsOut.push([`and ${list.length - shown.length} more`, ""]);
    const count = list.length;
    const sent = await sendEmail({
      to,
      fromName: "Yebo Invoices",
      idempotencyKey: `morning-list/${b.id}/${today}`,
      subject: `${count} reminder${count === 1 ? "" : "s"} ready to send on WhatsApp`,
      html: renderEmail({
        brandColor: (b.brand_color as string | null) ?? null,
        heading: `${count} reminder${count === 1 ? "" : "s"} ready for you`,
        intro: "Good morning. These clients are due a friendly nudge. Open the list, tap once per client, and send each one from your own WhatsApp. The messages are already written.",
        rows: rowsOut,
        buttonLabel: "Send reminders now",
        buttonUrl: `${appUrl()}/app/reminders`,
        footer: "You can switch this morning email off at the bottom of the reminders page.",
      }),
    });
    if (sent) result.sent++;
  }
  return result;
}
