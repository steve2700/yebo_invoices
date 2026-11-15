import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { formatDate, waLink } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { southAfricaDate } from "@/lib/time";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";

type Admin = ReturnType<typeof createAdminClient>;

// The South African calendar date, a few days from today.
export function snoozeDate(days: number, now: Date = new Date()): string {
  const [y, m, d] = southAfricaDate(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}

async function ownerEmailOf(admin: Admin, business: { email: string | null; owner_id: string | null }): Promise<string | null> {
  if (isEmail(business.email)) return business.email.trim();
  if (!business.owner_id) return null;
  const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
  return isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
}

// Tells the owner at once that the client asked for time, and the day they will be reminded. Never throws.
export async function notifySnoozed(token: string, date: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: doc } = await admin.from("documents").select("id,number,type,total_cents,business_id,client_id,expiry_date").eq("public_token", token).maybeSingle();
    if (!doc || doc.type !== "quote") return;
    const [{ data: business }, { data: client }] = await Promise.all([
      admin.from("businesses").select("name,email,owner_id,brand_color").eq("id", doc.business_id).maybeSingle(),
      admin.from("clients").select("name,whatsapp_number").eq("id", doc.client_id).maybeSingle(),
    ]);
    if (!business) return;
    const to = await ownerEmailOf(admin, business);
    if (!to) return;
    const clientName = client?.name ?? "Your client";
    const first = greetingName(client?.name);
    await sendEmail({
      to, fromName: "Yebo Invoices", idempotencyKey: `snoozed/${doc.id}/${date}`,
      subject: `${clientName} needs time on quote ${doc.number}`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: `${clientName} asked for time`,
        intro: `${clientName} tapped "Not yet" on quote ${doc.number} and asked to hear from you on ${formatDate(date)}. The price is held until at least a week after that. We will remind you on the day, and we will not nudge them before then.`,
        rows: [["Client", clientName], ["Quote", doc.number], ["Total", formatRand(Number(doc.total_cents))], ["Follow up on", formatDate(date)]],
        buttonLabel: "Open the quote", buttonUrl: `${appUrl()}/app/documents/${doc.id}`,
        secondaryButtonLabel: `Say thanks to ${first} on WhatsApp`,
        secondaryButtonUrl: waLink(client?.whatsapp_number ?? null, `Hi ${first}, no problem, take your time with quote ${doc.number}. I will check in on ${formatDate(date)}.`),
        footer: null,
      }),
    });
  } catch (e) {
    console.error("[snooze] could not notify the owner:", e);
  }
}

// Runs in the daily job. On the day a client asked to be followed up: the owner gets a ready WhatsApp message,
// and the client gets the reminder they asked for by email (when we have their address). Each quote is done once.
export async function runSnoozes(admin: Admin, now: Date = new Date()): Promise<{ owners: number; clients: number }> {
  const out = { owners: 0, clients: 0 };
  const today = southAfricaDate(now);
  const { data: due } = await admin.from("document_messages").select("document_id").eq("kind", "snooze").eq("body", today).limit(100);
  for (const row of due ?? []) {
    const { data: doc } = await admin.from("documents")
      .select("id,number,type,status,total_cents,expiry_date,public_token,business_id,client_id").eq("id", row.document_id).maybeSingle();
    if (!doc || doc.type !== "quote" || !["sent", "viewed"].includes(doc.status)) continue;
    const { data: done } = await admin.from("events").select("id").eq("document_id", doc.id).eq("type", "snooze_followup").gte("created_at", `${today}T00:00:00+02:00`).limit(1);
    if (done?.length) continue;
    const [{ data: business }, { data: client }] = await Promise.all([
      admin.from("businesses").select("name,email,owner_id,brand_color").eq("id", doc.business_id).maybeSingle(),
      admin.from("clients").select("name,email,whatsapp_number").eq("id", doc.client_id).maybeSingle(),
    ]);
    if (!business) continue;
    const businessName = business.name ?? "Your service provider";
    const first = greetingName(client?.name);
    const link = `${appUrl()}/d/${doc.public_token}`;

    const to = await ownerEmailOf(admin, business);
    if (to) {
      const ok = await sendEmail({
        to, fromName: "Yebo Invoices", idempotencyKey: `snooze-owner/${doc.id}/${today}`,
        subject: `Today is the day: follow up ${client?.name ?? "your client"} on quote ${doc.number}`,
        html: renderEmail({
          brandColor: business.brand_color,
          heading: `${client?.name ?? "Your client"} asked you to check in today`,
          intro: `They said "not yet" on quote ${doc.number} and picked today. A short message now beats a long silence.`,
          rows: [["Quote", doc.number], ["Total", formatRand(Number(doc.total_cents))]],
          buttonLabel: `Message ${first} on WhatsApp`,
          buttonUrl: waLink(client?.whatsapp_number ?? null, `Hi ${first}, you asked me to check in today about quote ${doc.number}. Are you ready to go ahead? ${link}`),
          secondaryButtonLabel: "Open the quote", secondaryButtonUrl: `${appUrl()}/app/documents/${doc.id}`,
          footer: null,
        }),
      });
      if (ok) out.owners++;
    }
    if (isEmail(client?.email)) {
      const replyTo = isEmail(business.email) ? business.email.trim() : null;
      const ok = await sendEmail({
        to: client!.email.trim(), fromName: businessName, replyTo, idempotencyKey: `snooze-client/${doc.id}/${today}`,
        subject: `Your quote ${doc.number} from ${businessName}, as you asked`,
        html: renderEmail({
          brandColor: business.brand_color,
          heading: "You asked us to check in today",
          intro: `Hi ${first}, you asked ${businessName} to remind you about quote ${doc.number} today.${doc.expiry_date ? ` The price is held until ${formatDate(doc.expiry_date)}.` : ""} If you are ready, you can accept it in one tap. If you still need time or want something changed, just reply.`,
          rows: [["Quote", doc.number], ["Total", formatRand(Number(doc.total_cents))]],
          buttonLabel: "View and accept the quote", buttonUrl: link,
          footer: replyTo ? `Questions? Just reply to this email and it will reach ${businessName}.` : null,
        }),
      });
      if (ok) out.clients++;
    }
    await admin.from("events").insert({ document_id: doc.id, type: "snooze_followup" });
  }
  return out;
}
