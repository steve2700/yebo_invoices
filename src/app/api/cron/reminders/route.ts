import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";
import { billingEnforced, hasAccess, planOf } from "@/lib/access";
import { PLANS } from "@/lib/plans";
import { runRecurring } from "@/lib/recurring-run";
import { sendMorningLists } from "@/lib/morning-list";
import { runNudges } from "@/lib/nudges";
import { runVisitReminders } from "@/lib/visit-reminders";
import { runWinbacks } from "@/lib/quote-followup";
import { runDepositNudges, runInvoiceNudges } from "@/lib/money-followup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PER_RUN = 150;

type Admin = ReturnType<typeof createAdminClient>;
type Business = { id: string; name: string | null; email: string | null; brand_color: string | null; auto_reminders: boolean };

// Runs once a day (see vercel.json). It finds every quote and invoice that needs a nudge, using the same rules as the
// dashboard (followups_due: 3 days apart, never more than 3), and emails the client for businesses that switched
// "Send reminders for me automatically" on. Each reminder is recorded, so nobody is emailed twice.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let admin: Admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[reminders] admin client unavailable:", error);
    return new Response("Not configured", { status: 503 });
  }

  // The service role sees every business, so this returns everyone's follow-ups.
  const { data: due, error } = await admin.rpc("followups_due");
  if (error) {
    console.error("[reminders] could not load follow-ups:", error.message);
    return new Response("Could not load follow-ups", { status: 500 });
  }

  const businessCache = new Map<string, Business | null>();
  const allowedCache = new Map<string, boolean>();
  const result = { checked: 0, sent: 0, skipped: 0 };

  async function businessFor(id: string): Promise<Business | null> {
    if (businessCache.has(id)) return businessCache.get(id) ?? null;
    const { data } = await admin.from("businesses").select("id,name,email,brand_color,auto_reminders").eq("id", id).maybeSingle();
    businessCache.set(id, (data as Business | null) ?? null);
    return (data as Business | null) ?? null;
  }
  // Automatic reminders belong to the plans that include reminders. With billing off, everyone who opted in gets them.
  async function planAllows(businessId: string): Promise<boolean> {
    if (!billingEnforced()) return true;
    if (allowedCache.has(businessId)) return allowedCache.get(businessId) ?? false;
    const { data: sub } = await admin.from("subscriptions").select("status,plan,current_period_end").eq("business_id", businessId).maybeSingle();
    const ok = hasAccess(sub) && PLANS[planOf(sub)].reminders;
    allowedCache.set(businessId, ok);
    return ok;
  }

  for (const row of (due ?? []).slice(0, MAX_PER_RUN) as { document_id: string; kind: string; reminders_sent: number }[]) {
    result.checked++;
    const { data: doc } = await admin
      .from("documents")
      .select("id,number,type,status,total_cents,due_date,expiry_date,public_token,business_id,client_id")
      .eq("id", row.document_id)
      .maybeSingle();
    if (!doc) { result.skipped++; continue; }

    const business = await businessFor(doc.business_id);
    if (!business?.auto_reminders || !(await planAllows(doc.business_id))) { result.skipped++; continue; }

    // A client who promised a date is left alone until that day has passed.
    if (doc.type === "invoice") {
      const todaySa = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
      const { data: promise } = await admin.from("document_messages").select("body").eq("document_id", doc.id).eq("kind", "promise").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (promise?.body && String(promise.body) >= todaySa) { result.skipped++; continue; }
    }

    const { data: client } = await admin.from("clients").select("name,email").eq("id", doc.client_id).maybeSingle();
    if (!isEmail(client?.email)) { result.skipped++; continue; }

    const businessName = business.name ?? "Your service provider";
    const first = greetingName(client.name);
    const link = `${appUrl()}/d/${doc.public_token}`;
    const replyTo = isEmail(business.email) ? business.email.trim() : null;
    let balance = Number(doc.total_cents);
    if (doc.type === "invoice") {
      const { data: pays } = await admin.from("payments").select("amount_cents").eq("document_id", doc.id);
      balance = Math.max(balance - (pays ?? []).reduce((sum, p) => sum + Number(p.amount_cents), 0), 0);
      if (balance <= 0) { result.skipped++; continue; }
    }

    let subject: string;
    let heading: string;
    let intro: string;
    let buttonLabel: string;
    const rows: [string, string][] = [];
    if (row.kind === "quote_followup") {
      subject = `Quote ${doc.number} from ${businessName}`;
      heading = "Just checking in on your quote";
      intro = `Hi ${first}, ${businessName} sent you a quote and wanted to make sure it didn't get lost. ${doc.expiry_date ? `It is valid until ${formatDate(doc.expiry_date)}. ` : ""}If you'd like anything changed, just reply to this email.`;
      rows.push(["Quote", doc.number], ["Total", formatRand(Number(doc.total_cents))]);
      buttonLabel = "View and accept the quote";
    } else if (row.kind === "invoice_due_soon") {
      subject = `Friendly reminder: invoice ${doc.number} is due soon`;
      heading = "A friendly reminder";
      intro = `Hi ${first}, this is a friendly reminder from ${businessName} that invoice ${doc.number} is due soon. If you have already paid, thank you, and please ignore this email.`;
      rows.push(["Invoice", doc.number], ["Amount due", formatRand(balance)], ["Due date", doc.due_date ? formatDate(doc.due_date) : "Soon"], ["Payment reference", doc.number]);
      buttonLabel = "View and pay the invoice";
    } else {
      subject = `Reminder: invoice ${doc.number} is overdue`;
      heading = "Your invoice is overdue";
      intro = `Hi ${first}, invoice ${doc.number} from ${businessName} is now past its due date. If you have already paid, thank you, and please ignore this email. If not, you can pay using the link below.`;
      rows.push(["Invoice", doc.number], ["Amount due", formatRand(balance)], ["Was due", doc.due_date ? formatDate(doc.due_date) : "-"], ["Payment reference", doc.number]);
      buttonLabel = "View and pay the invoice";
    }

    const sent = await sendEmail({
      to: client.email.trim(),
      fromName: businessName,
      replyTo,
      idempotencyKey: `auto-reminder/${doc.id}/${row.reminders_sent}`,
      subject,
      html: renderEmail({
        brandColor: business.brand_color,
        heading,
        intro,
        rows,
        buttonLabel,
        buttonUrl: link,
        footer: replyTo ? `Questions? Just reply to this email and it will reach ${businessName}.` : null,
      }),
    });
    if (!sent) { result.skipped++; continue; }

    // Recording the event is what starts the 3 day wait, and counts toward the limit of 3 reminders.
    const { error: eventError } = await admin.from("events").insert({ document_id: doc.id, type: "reminder_sent" });
    if (eventError) console.error("[reminders] could not record the reminder:", eventError.message);
    result.sent++;
  }

  // Quotes that run out in the next 2 days: one last friendly nudge, once per quote. This is separate from the
  // 3-day follow-ups, and uses the same "Send reminders for me automatically" setting and plan rules.
  const expiry = { checked: 0, sent: 0 };
  const saToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const plusDays = (iso: string, n: number) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  };
  const { data: expiring } = await admin
    .from("documents")
    .select("id,number,total_cents,expiry_date,public_token,business_id,client_id")
    .eq("type", "quote")
    .in("status", ["sent", "viewed"])
    .gte("expiry_date", plusDays(saToday, 1))
    .lte("expiry_date", plusDays(saToday, 2))
    .limit(MAX_PER_RUN);
  for (const doc of expiring ?? []) {
    expiry.checked++;
    const business = await businessFor(doc.business_id);
    if (!business?.auto_reminders || !(await planAllows(doc.business_id))) continue;
    const { data: already } = await admin.from("events").select("id").eq("document_id", doc.id).eq("type", "expiry_reminder").limit(1);
    if (already?.length) continue;
    const { data: client } = await admin.from("clients").select("name,email").eq("id", doc.client_id).maybeSingle();
    if (!isEmail(client?.email)) continue;
    const businessName = business.name ?? "Your service provider";
    const replyTo = isEmail(business.email) ? business.email.trim() : null;
    const sent = await sendEmail({
      to: client.email.trim(),
      fromName: businessName,
      replyTo,
      idempotencyKey: `expiry-reminder/${doc.id}`,
      subject: `Your quote ${doc.number} expires on ${formatDate(doc.expiry_date)}`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: "Your quote is about to expire",
        intro: `Hi ${greetingName(client.name)}, quote ${doc.number} from ${businessName} is valid until ${formatDate(doc.expiry_date)}. After that the price may change. If you would like to go ahead, you can accept it now. If you need anything changed, just reply.`,
        rows: [["Quote", doc.number], ["Total", formatRand(Number(doc.total_cents))], ["Valid until", formatDate(doc.expiry_date)]],
        buttonLabel: "View and accept the quote",
        buttonUrl: `${appUrl()}/d/${doc.public_token}`,
        footer: replyTo ? `Questions? Just reply to this email and it will reach ${businessName}.` : null,
      }),
    });
    if (!sent) continue;
    const { error: eventError } = await admin.from("events").insert({ document_id: doc.id, type: "expiry_reminder" });
    if (eventError) console.error("[reminders] could not record the expiry reminder:", eventError.message);
    expiry.sent++;
  }

  // The owner's morning list: reminders left after the automatic emails, ready to send on WhatsApp.
  const morning = await sendMorningLists(admin, planAllows).catch((e) => { console.error("[morning list] failed:", e); return null; });

  // Repeating invoices ride on this same daily run, so no extra scheduled job is needed.
  const recurring = await runRecurring().catch((e) => { console.error("[recurring] failed:", e); return null; });
  // Friendly emails to people who signed up but stalled. Does nothing unless NUDGES_ENABLED=true.
  const nudges = await runNudges(admin).catch((e) => { console.error("[nudges] failed:", e); return null; });
  // The day before a confirmed site visit, the client gets a reminder email with the calendar file.
  const visits = await runVisitReminders(admin).catch((e) => { console.error("[visit-reminders] failed:", e); return null; });
  // 14 or 30 days after a price or timing decline, the owner gets one email with a ready message to send.
  const winbacks = await runWinbacks(admin).catch((e) => { console.error("[winbacks] failed:", e); return null; });
  // After a client says yes: nudge an unpaid deposit (client) and an accepted quote with no invoice (owner).
  const depositNudges = await runDepositNudges(admin).catch((e) => { console.error("[deposit-nudges] failed:", e); return null; });
  const invoiceNudges = await runInvoiceNudges(admin).catch((e) => { console.error("[invoice-nudges] failed:", e); return null; });
  return Response.json({ ...result, expiry, morning, recurring, nudges, visits, winbacks, depositNudges, invoiceNudges });
}
