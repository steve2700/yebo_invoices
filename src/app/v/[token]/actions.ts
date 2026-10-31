"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderEmail, sendEmail, isEmail } from "@/lib/email";
import { formatVisit, validVisitToken } from "@/lib/visit";
import { appUrl } from "@/lib/url";

type Result = { ok: boolean; error?: string };

// The client answers a proposed visit: "yes" confirms it, "other" says they cannot and suggests another day.
export async function answerVisit(token: string, answer: "yes" | "other", note: string): Promise<Result> {
  try {
    if (!validVisitToken(token) || (answer !== "yes" && answer !== "other")) return { ok: false, error: "This link is not valid." };
    const text = typeof note === "string" ? note.replace(/\s+/g, " ").trim().slice(0, 300) : "";
    if (answer === "other" && text.length < 3) return { ok: false, error: "Please tell us which day or time suits you." };

    const admin = createAdminClient();
    const { data: r } = await admin.from("quote_requests").select("id,name,visit_at,visit_status,business_id").eq("visit_token", token).maybeSingle();
    if (!r?.visit_at) return { ok: false, error: "This link is not valid." };
    if (r.visit_status && r.visit_status !== "proposed") return { ok: true }; // already answered: do not email twice

    const status = answer === "yes" ? "confirmed" : "declined";
    const { error } = await admin.from("quote_requests")
      .update({ visit_status: status, visit_note: text || null, visit_responded_at: new Date().toISOString() })
      .eq("id", r.id).eq("visit_status", "proposed");
    if (error) return { ok: false, error: "Something went wrong. Please try again." };

    const { data: b } = await admin.from("businesses").select("name,email,owner_id").eq("id", r.business_id).maybeSingle();
    if (b) {
      let to = isEmail(b.email) ? b.email.trim() : "";
      if (!to) { const { data: o } = await admin.auth.admin.getUserById(b.owner_id); to = o?.user?.email ?? ""; }
      if (to) {
        await sendEmail({
          to, fromName: "Yebo Invoices", idempotencyKey: `visit-reply/${r.id}`,
          subject: answer === "yes" ? `${r.name} confirmed the site visit` : `${r.name} cannot make the site visit`,
          html: renderEmail({
            heading: answer === "yes" ? `${r.name} confirmed` : `${r.name} suggests another day`,
            intro: answer === "yes" ? `The site visit on ${formatVisit(r.visit_at)} is on.` : `They cannot make ${formatVisit(r.visit_at)}. They wrote: "${text}"`,
            buttonLabel: "Open quote requests", buttonUrl: `${appUrl()}/app/requests`, footer: null,
          }),
        });
      }
    }
    revalidatePath("/app/requests");
    return { ok: true };
  } catch (e) {
    console.error("[visit] answer failed:", e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
