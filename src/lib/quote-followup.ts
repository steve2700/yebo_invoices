import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { waLink } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { southAfricaDate } from "@/lib/time";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";

type Admin = ReturnType<typeof createAdminClient>;

async function ownerEmailOf(admin: Admin, business: { email: string | null; owner_id: string | null }): Promise<string | null> {
  if (isEmail(business.email)) return business.email.trim();
  if (!business.owner_id) return null;
  const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
  return isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
}

// 1. After a client accepts: they get their own copy by email (if we have their address), so they know it went through
// and have proof of what they agreed to. Never throws.
export async function emailClientCopy(token: string, answer: "accepted" | "declined"): Promise<void> {
  try {
    if (answer !== "accepted") return;
    const admin = createAdminClient();
    const { data: doc } = await admin.from("documents")
      .select("id,number,type,status,total_cents,business_id,client_id,payment_plan,deposit_percent,payment_terms")
      .eq("public_token", token).maybeSingle();
    if (!doc || doc.type !== "quote" || doc.status !== "accepted") return;
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recent } = await admin.from("events").select("id").eq("document_id", doc.id).eq("type", "accepted").gte("created_at", since).limit(1);
    if (!recent?.length) return;

    const [{ data: business }, { data: client }, { data: sig }] = await Promise.all([
      admin.from("businesses").select("name,email,phone,brand_color").eq("id", doc.business_id).maybeSingle(),
      admin.from("clients").select("name,email").eq("id", doc.client_id).maybeSingle(),
      admin.from("document_messages").select("body").eq("document_id", doc.id).eq("kind", "signature").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (!business || !isEmail(client?.email)) return;

    const total = formatRand(Number(doc.total_cents));
    const deposit = doc.payment_plan === "deposit" && doc.deposit_percent ? Math.round((Number(doc.total_cents) * doc.deposit_percent) / 100) : 0;
    const terms = doc.payment_plan === "full" ? "Full payment upfront" : deposit ? `${doc.deposit_percent}% deposit (${formatRand(deposit)}) to confirm the booking` : "Payment after the job";
    const rows: [string, string][] = [["From", business.name], ["Quote", doc.number], ["Total", total], ["Payment", terms]];
    if (typeof sig?.body === "string" && sig.body) rows.push(["Signed by", sig.body]);
    if (business.phone) rows.push(["Contact", business.phone]);

    await sendEmail({
      to: client.email.trim(), fromName: business.name, replyTo: isEmail(business.email) ? business.email.trim() : null,
      idempotencyKey: `quote-accepted-client/${doc.id}`,
      subject: `You accepted quote ${doc.number} from ${business.name}`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: "Thank you, it is booked in",
        intro: `You said yes to quote ${doc.number}. ${business.name} has been told and will contact you about the next steps.${deposit ? " The deposit confirms your booking." : ""} Keep this email as your copy.`,
        rows, buttonLabel: "Open your quote", buttonUrl: `${appUrl()}/d/${token}`,
        secondaryButtonLabel: business.phone ? `Message ${business.name} on WhatsApp` : null,
        secondaryButtonUrl: business.phone ? waLink(business.phone, `Hi, about quote ${doc.number}.`) : null,
        footer: null,
      }),
    });
  } catch (e) {
    console.error("[client-copy] failed:", e);
  }
}

// 2. An expired quote: the client taps "Yes, I still want this". The owner is told and can extend it in one tap.
// Returns true when the request is recorded (or was already recorded recently).
export async function requestRevive(token: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data: doc } = await admin.from("documents")
      .select("id,number,type,status,expiry_date,total_cents,business_id,client_id,revive_requested_at").eq("public_token", token).maybeSingle();
    if (!doc || doc.type !== "quote") return false;
    const today = southAfricaDate();
    const isExpired = doc.status === "expired" || (["sent", "viewed"].includes(doc.status) && Boolean(doc.expiry_date) && doc.expiry_date < today);
    if (!isExpired) return false;
    const { count: newer } = await admin.from("documents").select("id", { count: "exact", head: true }).eq("revises_id", doc.id).neq("status", "draft");
    if ((newer ?? 0) > 0) return false;
    if (doc.revive_requested_at && Date.now() - new Date(doc.revive_requested_at).getTime() < 7 * 86400000) return true;

    const { error } = await admin.from("documents").update({ revive_requested_at: new Date().toISOString() }).eq("id", doc.id);
    if (error) return false;

    const [{ data: business }, { data: client }] = await Promise.all([
      admin.from("businesses").select("name,email,owner_id,brand_color").eq("id", doc.business_id).maybeSingle(),
      admin.from("clients").select("name,whatsapp_number").eq("id", doc.client_id).maybeSingle(),
    ]);
    const to = business ? await ownerEmailOf(admin, business) : null;
    if (business && to) {
      const first = greetingName(client?.name);
      await sendEmail({
        to, fromName: "Yebo Invoices", idempotencyKey: `quote-revive/${doc.id}/${today}`,
        subject: `${client?.name ?? "A client"} still wants quote ${doc.number}`,
        html: renderEmail({
          brandColor: business.brand_color,
          heading: `${client?.name ?? "Your client"} still wants this job`,
          intro: `Quote ${doc.number} had expired, and ${client?.name ?? "your client"} tapped "Yes, I still want this". Extend it by 14 days and they can accept from the same link.`,
          rows: [["Quote", doc.number], ["Total", formatRand(Number(doc.total_cents))]],
          buttonLabel: "Open the quote and extend it", buttonUrl: `${appUrl()}/app/documents/${doc.id}`,
          secondaryButtonLabel: `Message ${first} on WhatsApp`,
          secondaryButtonUrl: waLink(client?.whatsapp_number ?? null, `Hi ${first}, great to hear you still want quote ${doc.number}. I am extending it for you now.`),
          footer: null,
        }),
      });
    }
    return true;
  } catch (e) {
    console.error("[revive] failed:", e);
    return false;
  }
}

// 3. Win-back: a "no" because of price or timing is often "not yet". 14 days after a price decline and 30 days after
// "not needed any more", the OWNER gets one email with a ready message to send. Nothing is sent to the client automatically.
const WAIT_DAYS: Record<string, number> = { price: 14, later: 30 };

export async function runWinbacks(admin: Admin, now: Date = new Date()): Promise<{ sent: number }> {
  const { data: docs, error } = await admin.from("documents")
    .select("id,number,total_cents,business_id,client_id,decline_reason,created_at")
    .eq("type", "quote").eq("status", "declined").is("winback_sent_at", null).in("decline_reason", Object.keys(WAIT_DAYS)).limit(200);
  if (error || !docs?.length) return { sent: 0 };

  let sent = 0;
  for (const doc of docs) {
    if (sent >= 30) break;
    const { data: ev } = await admin.from("events").select("created_at").eq("document_id", doc.id).eq("type", "declined").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!ev) continue;
    const days = Math.floor((now.getTime() - new Date(ev.created_at).getTime()) / 86400000);
    const wait = WAIT_DAYS[doc.decline_reason as string];
    if (days < wait) continue;
    if (days > wait + 30) { await admin.from("documents").update({ winback_sent_at: now.toISOString() }).eq("id", doc.id); continue; } // too old to be useful

    // Skip if the client has moved on with a newer quote.
    const { count: newer } = await admin.from("documents").select("id", { count: "exact", head: true })
      .eq("client_id", doc.client_id).eq("type", "quote").gt("created_at", ev.created_at).in("status", ["sent", "viewed", "accepted", "paid"]);
    if ((newer ?? 0) > 0) { await admin.from("documents").update({ winback_sent_at: now.toISOString() }).eq("id", doc.id); continue; }

    const [{ data: business }, { data: client }] = await Promise.all([
      admin.from("businesses").select("name,email,owner_id,brand_color").eq("id", doc.business_id).maybeSingle(),
      admin.from("clients").select("name,whatsapp_number").eq("id", doc.client_id).maybeSingle(),
    ]);
    const to = business ? await ownerEmailOf(admin, business) : null;
    if (!business || !to) continue;
    const first = greetingName(client?.name);
    const price = doc.decline_reason === "price";
    const message = price
      ? `Hi ${first}, I was thinking about your job (quote ${doc.number}). If the price was the sticking point, I can look at a smaller scope or splitting the payment. Would that help?`
      : `Hi ${first}, just checking in on quote ${doc.number}. Is the job still something you would like to do? I am happy to refresh the quote for you.`;
    const ok = await sendEmail({
      to, fromName: "Yebo Invoices", idempotencyKey: `winback/${doc.id}`,
      subject: `Time to check in with ${client?.name ?? "your client"}?`,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: `Check in with ${client?.name ?? "your client"}`,
        intro: price
          ? `${days} days ago ${client?.name ?? "your client"} declined quote ${doc.number} because of the price. A friendly offer of a smaller scope or two payments often turns a no into a yes.`
          : `${days} days ago ${client?.name ?? "your client"} said they no longer needed what quote ${doc.number} covered. A short check-in costs nothing and the need may be back.`,
        rows: [["Quote", doc.number], ["Total", formatRand(Number(doc.total_cents))]],
        buttonLabel: `Message ${first} on WhatsApp`, buttonUrl: waLink(client?.whatsapp_number ?? null, message),
        secondaryButtonLabel: "Open the quote", secondaryButtonUrl: `${appUrl()}/app/documents/${doc.id}`,
        footer: "You will only get this once for this quote. Nothing was sent to your client.",
      }),
    });
    if (ok) { await admin.from("documents").update({ winback_sent_at: now.toISOString() }).eq("id", doc.id); sent++; }
  }
  return { sent };
}
