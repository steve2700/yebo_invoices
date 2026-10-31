"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { newVisitToken, parseSaDateTime, formatVisit } from "@/lib/visit";
import { renderEmail, sendEmail, isEmail } from "@/lib/email";
import { appUrl } from "@/lib/url";

const idOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

// The owner proposes a day and time. The client gets a link to confirm or suggest another day (and an email if we have one).
export async function proposeVisit(formData: FormData) {
  const id = formData.get("id");
  if (!idOk(id)) return;
  const when = parseSaDateTime(formData.get("visit_at"));
  if (!when) redirect("/app/requests?e=visit");
  const sb = await createClient();
  const { data: req } = await sb.from("quote_requests").select("id,name,email,visit_token,businesses(name)").eq("id", id).maybeSingle();
  if (!req) return;
  const token = req.visit_token || newVisitToken();
  const { error } = await sb.from("quote_requests")
    .update({ visit_at: when.toISOString(), visit_status: "proposed", visit_note: null, visit_responded_at: null, visit_token: token })
    .eq("id", req.id);
  if (error) redirect("/app/requests?e=visit");

  const biz = (Array.isArray(req.businesses) ? req.businesses[0] : req.businesses) as { name?: string } | null;
  const name = biz?.name ?? "Your contractor";
  if (isEmail(req.email)) {
    await sendEmail({
      to: req.email.trim(), fromName: name, idempotencyKey: `visit/${req.id}/${when.getTime()}`,
      subject: `${name}: can we visit on ${formatVisit(when)}?`,
      html: renderEmail({
        heading: "Can we come and look at the job?", intro: `${name} would like to visit on ${formatVisit(when)}. Please confirm, or pick another day.`,
        buttonLabel: "Confirm or pick another day", buttonUrl: `${appUrl()}/v/${token}`, footer: null,
      }),
    });
  }
  revalidatePath("/app/requests");
  redirect("/app/requests?e=visit-ok");
}
