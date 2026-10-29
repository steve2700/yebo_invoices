import { createAdminClient } from "@/lib/supabase/admin";
import { renderEmail, sendEmail } from "@/lib/email";
import { SUPPORT } from "@/lib/support";
import { appUrl } from "@/lib/url";
import { ADMIN_EMAIL } from "@/lib/admin-stats";
import { unsubToken } from "@/lib/unsub-token";
import { pickNudges, type NudgeBusiness, type NudgeHistory, type NudgeTarget, type NudgeUser } from "@/lib/nudge-rules";

type Admin = ReturnType<typeof createAdminClient>;

export const nudgesEnabled = () => process.env.NUDGES_ENABLED === "true";

async function allUsers(admin: Admin): Promise<NudgeUser[]> {
  const users: NudgeUser[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    users.push(...(data.users as NudgeUser[]));
    if (data.users.length < 1000) break;
  }
  return users;
}

// Who is due a reminder right now. Used by the daily run and by the admin page preview.
export async function dueNudges(admin: Admin): Promise<NudgeTarget[]> {
  const [users, bizRes, docRes, histRes, outRes] = await Promise.all([
    allUsers(admin),
    admin.from("businesses").select("id,owner_id,name,created_at").limit(5000),
    admin.from("documents").select("business_id").eq("type", "quote").neq("status", "draft").limit(20000),
    admin.from("nudges").select("user_id,kind,created_at").limit(20000),
    admin.from("nudge_optout").select("email").limit(20000),
  ]);
  if (histRes.error || outRes.error) return []; // the tracking SQL has not been run yet
  return pickNudges({
    users,
    businesses: (bizRes.data ?? []) as NudgeBusiness[],
    sentQuoteBusinessIds: new Set((docRes.data ?? []).map((d: { business_id: string }) => d.business_id)),
    history: (histRes.data ?? []) as NudgeHistory[],
    optedOut: new Set((outRes.data ?? []).map((o: { email: string }) => o.email.toLowerCase())),
    adminEmails: new Set([ADMIN_EMAIL]),
    now: Date.now(),
  });
}

function content(t: NudgeTarget) {
  const first = t.sentBefore === 0;
  if (t.kind === "onboarding") {
    return {
      subject: first ? "Your Yebo account is nearly ready" : "Still want to send your first quote?",
      heading: "You are one step away",
      intro: "You created a Yebo Invoices account, but your business is not set up yet. It takes about 2 minutes: add your business name and details, and you can send your first quote. If something got in the way, just reply to this email and tell me.",
      button: "Finish setting up",
      url: `${appUrl()}/app`,
    };
  }
  return {
    subject: first ? "Ready to send your first quote?" : "Need a hand with your first quote?",
    heading: "Your first quote is waiting",
    intro: `${t.name ? t.name + " is" : "Your business is"} set up on Yebo Invoices, but no quote has gone out yet. You can create one in a couple of minutes, from a voice note if you like. If you need help, reply to this email or call ${SUPPORT.phoneDisplay} (${SUPPORT.hoursText}).`,
    button: "Create a quote",
    url: `${appUrl()}/app`,
  };
}

// Sends the due reminders. Does nothing unless NUDGES_ENABLED=true is set on Vercel. Each send is recorded first-come, so nobody gets a repeat.
export async function runNudges(admin: Admin) {
  const due = await dueNudges(admin);
  if (!nudgesEnabled()) return { enabled: false, due: due.length, sent: 0 };
  let sent = 0;
  for (const t of due) {
    const c = content(t);
    const link = `${appUrl()}/unsubscribe?e=${encodeURIComponent(t.email)}&t=${unsubToken(t.email)}`;
    const ok = await sendEmail({
      to: t.email,
      fromName: "Yebo Invoices",
      replyTo: SUPPORT.email,
      idempotencyKey: `nudge/${t.userId}/${t.kind}/${t.sentBefore}`,
      subject: c.subject,
      html: renderEmail({
        heading: c.heading,
        intro: c.intro,
        buttonLabel: c.button,
        buttonUrl: c.url,
        footer: `Do not want these emails? Stop them here: ${link}`,
      }),
    });
    if (!ok) continue;
    const { error } = await admin.from("nudges").insert({ user_id: t.userId, email: t.email, kind: t.kind });
    if (error) console.error("[nudges] could not record a nudge:", error.message);
    sent++;
  }
  return { enabled: true, due: due.length, sent };
}
