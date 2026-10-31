import { renderEmail, sendEmail, isEmail } from "@/lib/email";
import { buildIcs, formatVisit } from "@/lib/visit";
import { southAfricaDate } from "@/lib/time";
import { appUrl } from "@/lib/url";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// Runs inside the daily 06:00 UTC job. Clients whose confirmed site visit is tomorrow (South African date) get one reminder email
// with the calendar file. Clients with only a WhatsApp number are reminded by the owner from the dashboard.
export async function runVisitReminders(admin: Admin, now: Date = new Date()) {
  const tomorrow = southAfricaDate(new Date(now.getTime() + 86400000));
  const from = new Date(`${tomorrow}T00:00:00+02:00`).toISOString();
  const to = new Date(`${tomorrow}T23:59:59+02:00`).toISOString();
  const { data: rows, error } = await admin
    .from("quote_requests")
    .select("id,name,email,location,visit_at,visit_token,business_id")
    .eq("visit_status", "confirmed").is("visit_reminded_at", null).gte("visit_at", from).lte("visit_at", to).limit(100);
  if (error || !rows?.length) return { sent: 0 };

  let sent = 0;
  for (const r of rows) {
    if (!isEmail(r.email) || !r.visit_at) continue;
    const { data: b } = await admin.from("businesses").select("name,phone").eq("id", r.business_id).maybeSingle();
    const name = b?.name ?? "Your contractor";
    const ok = await sendEmail({
      to: r.email.trim(), fromName: name, idempotencyKey: `visit-reminder/${r.id}`,
      subject: `Reminder: ${name} visits tomorrow`,
      html: renderEmail({
        heading: "See you tomorrow", intro: `${name} is coming to look at the job on ${formatVisit(r.visit_at)}.${b?.phone ? ` Need to change it? Call ${b.phone}.` : ""}`,
        buttonLabel: "Open the details", buttonUrl: `${appUrl()}/v/${r.visit_token}`, footer: null,
      }),
      attachments: [{ filename: "site-visit.ics", content: Buffer.from(buildIcs({ id: r.id, start: new Date(r.visit_at), title: `Site visit: ${name}`, where: r.location })).toString("base64") }],
    });
    if (ok) {
      await admin.from("quote_requests").update({ visit_reminded_at: new Date().toISOString() }).eq("id", r.id);
      sent++;
    }
  }
  return { sent };
}
