"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { renderEmail, sendEmail, isEmail } from "@/lib/email";
import { cleanRequest } from "@/lib/requests";
import { appUrl } from "@/lib/url";

type Result = { ok: boolean; error?: string };

// Called by anyone who opens a business's request link, so it is strict: checked input, a hidden trap field for bots,
// and a cap on how many requests one business can receive per hour.
export async function submitRequest(token: string, formData: FormData): Promise<Result> {
  try {
    if (typeof token !== "string" || !/^[a-z0-9]{8,32}$/.test(token)) return { ok: false, error: "This link is not valid." };
    if (String(formData.get("website") ?? "").trim()) return { ok: true }; // a bot filled the hidden field: pretend it worked
    const cleaned = cleanRequest({
      name: formData.get("name"),
      whatsapp: formData.get("whatsapp"),
      email: formData.get("email"),
      location: formData.get("location"),
      details: formData.get("details"),
    });
    if (!cleaned.ok) return { ok: false, error: cleaned.error };
    const v = cleaned.value;

    const admin = createAdminClient();
    const { data: business } = await admin.from("businesses").select("id,name,email,owner_id").eq("request_token", token).maybeSingle();
    if (!business) return { ok: false, error: "This link is not valid." };

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("quote_requests").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("created_at", hourAgo);
    if ((count ?? 0) >= 15) return { ok: false, error: "This business is getting a lot of requests right now. Please message them on WhatsApp instead." };

    // The same person sending the same words twice in 10 minutes is one request.
    const tenAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: dup } = await admin.from("quote_requests").select("id").eq("business_id", business.id).eq("name", v.name).eq("details", v.details).gte("created_at", tenAgo).limit(1);
    if (dup?.length) return { ok: true };

    const { data: row, error } = await admin
      .from("quote_requests")
      .insert({ business_id: business.id, name: v.name, whatsapp: v.whatsapp || null, email: v.email || null, location: v.location || null, details: v.details })
      .select("id")
      .single();
    if (error || !row) return { ok: false, error: "Something went wrong. Please try again in a minute." };

    // Tell the owner. The email never blocks the request: if it fails, the request is still in their dashboard.
    let to = isEmail(business.email) ? business.email.trim() : "";
    if (!to) {
      const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
      to = owner?.user?.email ?? "";
    }
    if (to) {
      await sendEmail({
        to,
        fromName: "Yebo Invoices",
        replyTo: v.email || null,
        idempotencyKey: `quote-request/${row.id}`,
        subject: `New quote request from ${v.name}`,
        html: renderEmail({
          heading: `${v.name} wants a quote`,
          intro: v.details.slice(0, 600),
          rows: [["Name", v.name], ["WhatsApp", v.whatsapp || "-"], ["Email", v.email || "-"], ["Where", v.location || "-"]],
          buttonLabel: "Open the request",
          buttonUrl: `${appUrl()}/app/requests`,
          footer: "Reply fast: the first clear quote usually wins the job.",
        }),
      });
    }
    return { ok: true };
  } catch (caught) {
    console.error("[request] failed:", caught);
    return { ok: false, error: "Something went wrong. Please try again in a minute." };
  }
}
